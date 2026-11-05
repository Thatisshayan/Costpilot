// Tests for scripts/mock-guard.mjs. Run: node --test scripts/__tests__/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMockGuard } from "../mock-guard.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = () => {};

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "mock-guard-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const baseConfig = (overrides = {}) => ({
  surfaces: [{ name: "app", root: "app", entries: ["src/main.tsx"], aliases: { "@/": "src/" }, minFiles: 1 }],
  denylist: ["app/src/data/mockData.ts", "legacy/"],
  allowlist: [],
  workspaceDirs: ["lib"],
  ...overrides,
});

// A clean app: entry -> page -> api client (workspace package) + asset; plus an UNROUTED mock page.
const cleanTree = () => ({
  "app/src/main.tsx": `import "./index.css";\nimport App from "@/App";\nApp();\n`,
  "app/src/index.css": "body{}",
  "app/src/App.tsx": `import { Dashboard } from "./pages/dashboard";\nexport default function App() { return Dashboard(); }\n`,
  "app/src/pages/dashboard.tsx": `import { fetchTotals } from "@workspace/client";\nimport { z } from "zod";\nexport const Dashboard = () => fetchTotals();\n`,
  "app/src/pages/old-dashboard.tsx": `import { MOCK_TOTALS } from "../data/mockData";\nexport const total = MOCK_TOTALS + Math.random();\n`,
  "app/src/data/mockData.ts": `export const MOCK_TOTALS = 4200;\n`,
  "app/src/pages/__tests__/dashboard.test.tsx": `import { MOCK_TOTALS } from "../../data/mockData";\n`,
  "lib/client/package.json": JSON.stringify({ name: "@workspace/client", exports: { ".": "./src/index.ts" } }),
  "lib/client/src/index.ts": `export const fetchTotals = () => fetch("/api/totals");\n`,
});

function run(files, config = baseConfig()) {
  const root = fixture(files);
  try { return runMockGuard({ root, config, log: quiet }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("clean graph passes; unreachable mock files and test fixtures are ignored", () => {
  const result = run(cleanTree());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.violations, []);
  assert.equal(result.ok, true);
  assert.ok(result.reachable.app.includes("lib/client/src/index.ts"), "follows @workspace packages");
  assert.ok(!result.reachable.app.includes("app/src/data/mockData.ts"));
});

test("a reachable file importing a denylisted mock module fails, with the import chain", () => {
  const tree = cleanTree();
  tree["app/src/pages/dashboard.tsx"] = `import data from "../data/mockData";\nexport const Dashboard = () => data;\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  const hit = result.violations.find(v => v.includes("app/src/data/mockData.ts is a denylisted"));
  assert.ok(hit, result.violations.join("\n"));
  assert.match(hit, /app\/src\/main\.tsx -> app\/src\/App\.tsx -> app\/src\/pages\/dashboard\.tsx -> app\/src\/data\/mockData\.ts/);
});

test("a denylisted directory reached via dynamic import() fails", () => {
  const tree = cleanTree();
  tree["app/src/App.tsx"] = `export default function App() { return import("../../legacy/page"); }\n`;
  tree["legacy/page.tsx"] = `export const x = 1;\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.startsWith("legacy/page.tsx is a denylisted")), result.violations.join("\n"));
});

test("a reachable MOCK_* constant fails", () => {
  const tree = cleanTree();
  tree["app/src/pages/dashboard.tsx"] = `const MOCK_SPEND = [120, 340];\nexport const Dashboard = () => MOCK_SPEND;\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.startsWith("app/src/pages/dashboard.tsx:1 contains MOCK_* identifier")), result.violations.join("\n"));
});

test("reachable Math.random() fails, also inside a workspace package", () => {
  const tree = cleanTree();
  tree["lib/client/src/index.ts"] = `export const fetchTotals = () => Math.random() * 1000;\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.includes("lib/client/src/index.ts:1 contains Math.random()")), result.violations.join("\n"));
});

test("markers only inside comments do not fail", () => {
  const tree = cleanTree();
  tree["app/src/pages/dashboard.tsx"] = `// was: MOCK_SPEND / Math.random()\n/* import x from "../data/mockData"; */\nexport const Dashboard = () => 1;\n`;
  assert.equal(run(tree).ok, true);
});

test("an unresolvable local import fails closed", () => {
  const tree = cleanTree();
  tree["app/src/App.tsx"] = `import { Gone } from "./pages/does-not-exist";\nexport default Gone;\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes(`cannot resolve import "./pages/does-not-exist"`)), result.errors.join("\n"));
});

test("an unknown workspace package or export fails closed", () => {
  const tree = cleanTree();
  tree["app/src/App.tsx"] = `import a from "@workspace/missing";\nimport b from "@workspace/client/nope";\nexport default a;\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("unknown workspace package @workspace/missing")));
  assert.ok(result.errors.some(e => e.includes(`workspace export "./nope" not found`)));
});

test("a non-literal dynamic import fails closed", () => {
  const tree = cleanTree();
  tree["app/src/App.tsx"] = `export default (name: string) => import(\`./pages/\${name}\`);\n`;
  const result = run(tree);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("non-literal specifier")), result.errors.join("\n"));
});

test("a missing entry point or a suspiciously small graph fails closed", () => {
  const missing = run(cleanTree(), baseConfig({ surfaces: [{ name: "app", root: "app", entries: ["src/nope.tsx"], minFiles: 1 }] }));
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some(e => e.includes("entry point not found")));
  const small = run(cleanTree(), baseConfig({ surfaces: [{ name: "app", root: "app", entries: ["src/main.tsx"], aliases: { "@/": "src/" }, minFiles: 50 }] }));
  assert.equal(small.ok, false);
  assert.ok(small.errors.some(e => e.includes("minimum 50")));
});

test("allowlist entries are exact (file + marker + reason) and must not go stale", () => {
  const tree = cleanTree();
  tree["app/src/pages/dashboard.tsx"] = `export const Dashboard = () => Math.random().toString(36);\n`;
  const allow = { file: "app/src/pages/dashboard.tsx", marker: "MATH_RANDOM", reason: "toast id, not a figure" };
  assert.equal(run(tree, baseConfig({ allowlist: [allow] })).ok, true);
  const wrongMarker = run(tree, baseConfig({ allowlist: [{ ...allow, marker: "MOCK_CONSTANT" }] }));
  assert.equal(wrongMarker.ok, false);
  const stale = run(cleanTree(), baseConfig({ allowlist: [allow] }));
  assert.equal(stale.ok, false);
  assert.ok(stale.errors.some(e => e.includes("stale allowlist entry")));
  const noReason = run(tree, baseConfig({ allowlist: [{ file: allow.file, marker: allow.marker }] }));
  assert.equal(noReason.ok, false);
});

test("mobile screen allowlist drift from the guard's entry points fails", () => {
  const tree = {
    "m/src/app/_layout.tsx": `const ok = ["index", "explore"].includes(screen);\n`,
    "m/src/app/index.tsx": `export default 1;\n`,
  };
  const config = baseConfig({ surfaces: [{ name: "m", root: "m", entries: ["src/app/_layout.tsx", "src/app/index.tsx"],
    routeAllowlist: { file: "src/app/_layout.tsx", screens: ["index"] }, minFiles: 1 }] });
  const result = run(tree, config);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("screen allowlist")), result.errors.join("\n"));
});

test("platform-specific variants (foo.web.tsx) are all followed", () => {
  const tree = cleanTree();
  tree["app/src/App.tsx"] = `import Tabs from "./tabs";\nexport default Tabs;\n`;
  tree["app/src/tabs.tsx"] = `export default 1;\n`;
  tree["app/src/tabs.web.tsx"] = `export const MOCK_TABS = 1;\n`;
  const config = baseConfig();
  config.surfaces[0].platformExts = ["web"];
  const result = run(tree, config);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.startsWith("app/src/tabs.web.tsx")));
});

test("the real repository's enabled surfaces pass", () => {
  const result = runMockGuard({ root: repoRoot, log: quiet });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.violations, []);
  assert.ok(result.reachable["web (artifacts/ai-tracker)"].includes("artifacts/ai-tracker/src/pages/dashboard.tsx"));
  assert.ok(result.reachable["api (artifacts/api-server)"].includes("artifacts/api-server/src/routes/expenses.ts"));
  assert.ok(result.reachable["mobile (artifacts/mobile-app)"].includes("artifacts/mobile-app/src/app/index.tsx"));
});
