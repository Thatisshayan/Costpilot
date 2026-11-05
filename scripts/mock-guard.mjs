#!/usr/bin/env node
// Mock-data guard (fail closed).
//
// Walks the static + dynamic import graph of every ENABLED surface (web app, API server,
// allowed mobile screens) starting from its real entry points, and fails if any reachable
// non-test source file
//   (a) is on the denylist of known mock/fabricated modules, or
//   (b) contains a fabrication marker (MOCK_* identifiers, costpilotMockData, Math.random(),
//       faker imports),
// unless that exact file + marker pair is on the documented allowlist below.
//
// It also fails closed when an entry point or a local import cannot be resolved, when a
// surface reaches fewer files than its configured minimum, or when the mobile route allowlist
// in `_layout.tsx` drifts from the screens this guard treats as entry points.
//
// Disabled/unrouted code and test fixtures are NOT touched or flagged: only what an enabled
// entry point can actually import is scanned. See REPO_RULES.md Appendix B.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CODE_EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const TEST_FILE = /(^|\/)(__tests__|__mocks__|test|tests)\/|\.(test|spec)\.[cm]?[jt]sx?$/;

export const MARKERS = [
  { id: "MOCK_CONSTANT", pattern: /\bMOCK_[A-Z0-9_]+\b/, description: "MOCK_* identifier" },
  { id: "MOCK_MODULE", pattern: /costpilotMockData/, description: "reference to costpilotMockData" },
  { id: "MATH_RANDOM", pattern: /\bMath\.random\s*\(/, description: "Math.random() call (fabricated figures)" },
  { id: "FAKER", pattern: /['"]@faker-js\/faker['"]|['"]faker['"]/, description: "faker import" },
];

export const DEFAULT_CONFIG = {
  surfaces: [
    {
      name: "web (artifacts/ai-tracker)",
      root: "artifacts/ai-tracker",
      entries: ["src/main.tsx"],
      aliases: { "@/": "src/" },
      minFiles: 20,
    },
    {
      name: "api (artifacts/api-server)",
      root: "artifacts/api-server",
      entries: ["src/index.ts"],
      aliases: {},
      minFiles: 15,
    },
    {
      name: "mobile (artifacts/mobile-app)",
      root: "artifacts/mobile-app",
      // expo-router is file-based: every allowed screen is its own entry point.
      entries: [
        "src/app/_layout.tsx",
        "src/app/index.tsx",
        "src/app/expenses.tsx",
        "src/app/add-expense.tsx",
        "src/app/login.tsx",
      ],
      // Must equal the screen allowlist in _layout.tsx (checked below).
      routeAllowlist: { file: "src/app/_layout.tsx", screens: ["index", "expenses", "add-expense", "login"] },
      aliases: { "@/assets/": "assets/", "@/": "src/" },
      platformExts: ["web", "ios", "android", "native"],
      minFiles: 5,
    },
  ],
  // Known mock/fabricated modules. Reaching any of these from an enabled entry fails the guard.
  // Paths are repo-relative; a trailing "/" denies a whole directory.
  denylist: [
    "artifacts/ai-tracker/src/data/costpilotMockData.ts",
    "artifacts/api-server/src/lib/sync-engine.ts",
    "artifacts/api-server/src/lib/cron-service.ts",
    "artifacts/api-server/src/routes/telemetry.ts",
    "artifacts/api-server/src/routes/analytics.ts",
    "artifacts/api-server/src/routes/audits.ts",
    "artifacts/api-server/src/routes/intelligence.ts",
    "artifacts/api-server/src/routes/cicd.ts",
    "artifacts/api-server/src/routes/provisioning.ts",
    "artifacts/api-server/src/routes/currency.ts",
    "artifacts/mobile-app/src/app/index_original.tsx",
    "artifacts/mobile-app/src/app/index_premium.tsx",
    "artifacts/web-dashboard/",
    "artifacts/mockup-sandbox/",
  ],
  // Narrow exceptions: exact repo-relative file + marker id + reason. Never widen a pattern instead.
  allowlist: [],
  // Directories scanned for "@workspace/*" packages (their package.json "exports" are followed).
  workspaceDirs: ["lib", "artifacts"],
};

const toPosix = p => p.split(sep).join("/");
const isFile = p => { try { return statSync(p).isFile(); } catch { return false; } };
const isDir = p => { try { return statSync(p).isDirectory(); } catch { return false; } };

function loadWorkspacePackages(root, dirs) {
  const packages = new Map();
  for (const dir of dirs) {
    const abs = resolve(root, dir);
    if (!isDir(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const manifestPath = join(abs, entry.name, "package.json");
      if (!entry.isDirectory() || !isFile(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.name?.startsWith("@workspace/")) packages.set(manifest.name, { dir: join(abs, entry.name), manifest });
    }
  }
  return packages;
}

// Strip comments so commented-out code neither adds edges nor trips markers. String contents are
// kept (a marker inside a string literal is still treated as a violation: fail closed).
export function stripComments(source) {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i], d = source[i + 1];
    if (c === "/" && d === "/") { while (i < n && source[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop; continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < n && source[j] !== c) { if (source[j] === "\\") j++; else if (c !== "`" && source[j] === "\n") break; j++; }
      out += source.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

export function extractImports(code) {
  const specs = new Set();
  const staticRe = /(?:^|[^\w$.])(?:import|export)\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s*)?['"]([^'"\n]+)['"]/g;
  const dynamicRe = /(?:^|[^\w$.])(?:import|require)\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  const nonLiteralRe = /(?:^|[^\w$.])import\s*\(\s*(?!['"])([^)]*)\)/g;
  for (const m of code.matchAll(staticRe)) specs.add(m[1]);
  for (const m of code.matchAll(dynamicRe)) specs.add(m[1]);
  const nonLiteral = [...code.matchAll(nonLiteralRe)].map(m => m[1].trim());
  return { specs: [...specs], nonLiteral };
}

// Candidate files for an import base path: the file itself / extension variants first, then
// directory index files. Platform variants (foo.web.tsx, foo.ios.tsx, ...) are all followed,
// because the bundler picks one per platform and every platform ships.
function candidatesFor(base, platformExts) {
  const withExts = stem => CODE_EXTS.flatMap(ext => [stem + ext, ...platformExts.map(p => `${stem}.${p}${ext}`)]);
  const ext = extname(base);
  let direct;
  // "./api.schemas" is a code stem, "./index.css" an asset: try code first, assets are the fallback.
  if (!CODE_EXTS.includes(ext)) direct = withExts(base);
  else if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) direct = [base, ...withExts(base.slice(0, -ext.length))]; // "./foo.js" -> foo.ts
  else direct = [base];
  return { direct, index: withExts(join(base, "index")) };
}

export function runMockGuard({ root, config = DEFAULT_CONFIG, log = console.log } = {}) {
  root = resolve(root);
  const errors = [];
  const violations = [];
  const packages = loadWorkspacePackages(root, config.workspaceDirs ?? []);
  const allowlist = config.allowlist ?? [];
  const usedAllow = new Set();
  const rel = abs => toPosix(relative(root, abs));
  const deniedBy = relPath => (config.denylist ?? []).find(d => d.endsWith("/") ? relPath.startsWith(d) : relPath === d);

  for (const [i, a] of allowlist.entries()) {
    if (!a.file || !a.marker || !a.reason) errors.push(`allowlist entry #${i} must have file, marker and reason`);
    else if (!isFile(resolve(root, a.file))) errors.push(`allowlist entry for missing file: ${a.file}`);
  }

  let totalFiles = 0;
  const reachable = {};
  for (const surface of config.surfaces) {
    const surfaceRoot = resolve(root, surface.root);
    const platformExts = surface.platformExts ?? [];
    const aliases = Object.entries(surface.aliases ?? {}).sort((x, y) => y[0].length - x[0].length);

    if (surface.routeAllowlist) {
      const layoutPath = resolve(surfaceRoot, surface.routeAllowlist.file);
      const src = isFile(layoutPath) ? readFileSync(layoutPath, "utf8") : "";
      const match = src.match(/\[([^\]]*)\]\s*\.includes\(\s*screen\s*\)/);
      const found = match ? [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]).sort() : null;
      const expected = [...surface.routeAllowlist.screens].sort();
      if (!found) errors.push(`${surface.name}: cannot find the screen allowlist ([...].includes(screen)) in ${rel(layoutPath)}`);
      else if (found.join() !== expected.join()) {
        errors.push(`${surface.name}: screen allowlist in ${rel(layoutPath)} is [${found}] but mock-guard checks [${expected}]; update scripts/mock-guard.mjs entries`);
      }
    }

    // parent map for chain reporting
    const parent = new Map();
    const visited = new Set();
    const queue = [];
    const chain = file => { const out = []; for (let f = file; f; f = parent.get(f)) out.unshift(rel(f)); return out.join(" -> "); };

    const resolveSpec = (spec, fromFile) => {
      const clean = spec.replace(/[?#].*$/, "");
      let base;
      if (clean.startsWith("./") || clean.startsWith("../") || clean === "." || clean === "..") base = resolve(dirname(fromFile), clean);
      else if (clean.startsWith("/")) base = resolve(surfaceRoot, "." + clean); // vite public-root style
      else {
        const alias = aliases.find(([prefix]) => clean.startsWith(prefix));
        if (alias) base = resolve(surfaceRoot, alias[1], clean.slice(alias[0].length));
        else if (clean.startsWith("@workspace/")) {
          const parts = clean.split("/");
          const name = parts.slice(0, 2).join("/");
          const sub = parts.length > 2 ? "./" + parts.slice(2).join("/") : ".";
          const pkg = packages.get(name);
          if (!pkg) return { error: `unknown workspace package ${name}` };
          const exp = pkg.manifest.exports;
          const target = typeof exp === "string" ? (sub === "." ? exp : null) : exp?.[sub];
          const targetPath = typeof target === "string" ? target : target?.import ?? target?.default ?? null;
          if (targetPath) base = resolve(pkg.dir, targetPath);
          else if (sub === "." && pkg.manifest.main) base = resolve(pkg.dir, pkg.manifest.main);
          else return { error: `workspace export "${sub}" not found in ${name}` };
        } else return { external: true };
      }
      const { direct, index } = candidatesFor(base, platformExts);
      let files = direct.filter(isFile);
      if (!files.length) files = index.filter(isFile);
      if (files.length) return { files: [...new Set(files)] };
      // Non-code assets (css, fonts, images, json): must exist, are not scanned.
      const ext = extname(base);
      const assetOptions = clean.startsWith("/") ? [base, resolve(surfaceRoot, "public", "." + clean)] : [base];
      if (ext && !CODE_EXTS.includes(ext) && assetOptions.some(isFile)) return { asset: true };
      return { error: "cannot resolve to an existing file" };
    };

    for (const entry of surface.entries) {
      const abs = resolve(surfaceRoot, entry);
      if (!isFile(abs)) { errors.push(`${surface.name}: entry point not found: ${rel(abs)}`); continue; }
      if (!visited.has(abs)) { visited.add(abs); queue.push(abs); }
    }

    while (queue.length) {
      const file = queue.shift();
      const relPath = rel(file);
      const denied = deniedBy(relPath);
      if (denied) violations.push(`${relPath} is a denylisted mock/fabricated module (${denied})\n    chain: ${chain(file)}`);
      const code = stripComments(readFileSync(file, "utf8"));
      for (const marker of MARKERS) {
        if (!marker.pattern.test(code)) continue;
        const allow = allowlist.find(a => a.file === relPath && a.marker === marker.id);
        if (allow) { usedAllow.add(allow); continue; }
        const line = code.split("\n").findIndex(l => marker.pattern.test(l)) + 1;
        violations.push(`${relPath}:${line} contains ${marker.description} [${marker.id}]\n    chain: ${chain(file)}`);
      }
      const { specs, nonLiteral } = extractImports(code);
      for (const expr of nonLiteral) errors.push(`${relPath}: dynamic import with non-literal specifier import(${expr}) cannot be verified`);
      for (const spec of specs) {
        const result = resolveSpec(spec, file);
        if (result.external || result.asset) continue;
        if (result.error) { errors.push(`${relPath}: cannot resolve import "${spec}" (${result.error})\n    chain: ${chain(file)}`); continue; }
        for (const target of result.files) {
          if (TEST_FILE.test(rel(target))) continue;
          if (visited.has(target)) continue;
          visited.add(target); parent.set(target, file); queue.push(target);
        }
      }
    }

    totalFiles += visited.size;
    reachable[surface.name] = [...visited].map(rel).sort();
    log(`mock-guard: ${surface.name}: ${visited.size} reachable source files from ${surface.entries.length} entry point(s)`);
    if (visited.size < (surface.minFiles ?? 1)) {
      errors.push(`${surface.name}: only ${visited.size} reachable files (minimum ${surface.minFiles ?? 1}); the import graph walk is likely broken`);
    }
  }

  for (const a of allowlist) {
    if (!usedAllow.has(a) && a.file && a.marker) errors.push(`stale allowlist entry (no longer reachable/needed): ${a.file} [${a.marker}]`);
  }

  return { ok: errors.length === 0 && violations.length === 0, errors, violations, totalFiles, reachable };
}

export function main(root = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  const result = runMockGuard({ root });
  if (process.env.MOCK_GUARD_LIST) for (const [name, files] of Object.entries(result.reachable)) console.log(`${name}:\n  ${files.join("\n  ")}`);
  for (const v of result.violations) console.error(`MOCK-GUARD VIOLATION: ${v}`);
  for (const e of result.errors) console.error(`MOCK-GUARD ERROR: ${e}`);
  if (!result.ok) {
    throw new Error(`mock-guard failed: ${result.violations.length} violation(s), ${result.errors.length} error(s). ` +
      "Enabled surfaces must not reach mock/fabricated cost data (REPO_RULES.md Appendix B).");
  }
  console.log(`mock-guard: OK (${result.totalFiles} reachable files checked)`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { main(process.argv[2] ? resolve(process.argv[2]) : undefined); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
