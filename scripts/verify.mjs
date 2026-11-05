import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runSecretScan } from "./secret-scan.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
function check(ok, message) { if (!ok) throw new Error(message); }
function run(command, args, timeout = 300000) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", timeout,
    shell: process.platform === "win32" && command.endsWith(".cmd") });
  check(!result.error && result.status === 0, `${command} failed: ${result.error?.message ?? result.status}`);
}
const pm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
try {
  console.log("== secret-scan ==");
  runSecretScan();
  console.log("== doc-freshness ==");
  const readme = readFileSync("README.md", "utf8");
  for (const match of readme.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split("#")[0];
    if (link && !/^(https?:|mailto:)/.test(link)) check(existsSync(link), `Broken README link: ${link}`);
  }
  const audits = readdirSync("audits").filter(p => /^\d{4}-\d{2}-\d{2}_.*_Audit\.md$/.test(p));
  check(audits.some(p => Date.now() - Date.parse(p.slice(0,10)) <= 31 * 86400000), "No recent dated audit");
  const count = dir => readdirSync(dir, { withFileTypes: true }).reduce((n, p) => n +
    (p.isDirectory() ? count(resolve(dir, p.name)) : Number(p.name.endsWith(".md"))), 0);
  check(count("docs") >= JSON.parse(readFileSync("docs/_baseline.json", "utf8")).md_count, "Docs below baseline");
  if (existsSync("REPO_DIRECTIVE.md")) {
    const directive = readFileSync("REPO_DIRECTIVE.md", "utf8");
    const defined = new Set([...directive.matchAll(/^### ([PSE][0-9]+)\b/gm)].map(match => match[1]));
    for (const line of directive.split("\n").filter(l => /^\s*- \[ \] T\d+/.test(l))) {
      const ref = line.match(/traces-to:\s*([PSE]\d+(?:\/[PSE]\d+)*)/)?.[1];
      check(ref && ref.split("/").every(id => defined.has(id)), `Orphan directive task: ${line}`);
    }
  }
  check(!existsSync("package-lock.json"), "pnpm is the supported package manager; an npm lockfile must not be reintroduced");
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  check(manifest.scripts?.build && manifest.scripts?.test, "Required build/test scripts missing");
  console.log("== frozen install =="); run(pm, ["install", "--frozen-lockfile"]);
  console.log("== build / typecheck =="); run(pm, ["run", "build"], 600000);
  console.log("== test =="); run(pm, ["run", "test"], 600000);
  console.log("== deploy-dry ==");
  console.log("Smoke build passed. Container, migration and staging release evidence is tracked separately in LAUNCH_PLAN.md.");
  console.log("VERIFY PASSED");
} catch (error) { console.error(`VERIFY FAILED: ${error.message}`); process.exitCode = 1; }
