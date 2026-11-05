// Fail-closed gitleaks scan (REPO_RULES Appendix B):
//   1. every commit in the range under review, and
//   2. the files of the checked-out commit (tracked files only, via git archive).
// SECRET_SCAN_RANGE selects the commits: "<base>..<head>" (set by CI for the
// PR or push), or "full" for whole history (weekly job). Locally it defaults to
// origin/main..HEAD. A missing scanner, a bad range or any finding fails.
// Exceptions are only exact fingerprints listed in .gitleaksignore.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoreFile = join(root, ".gitleaksignore");
const reportDir = join(root, "audits", "private");

function sh(command, args, options = {}) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });
}
function fail(message) { throw new Error(`secret-scan: ${message}`); }

function resolveRange() {
  const requested = process.env.SECRET_SCAN_RANGE?.trim();
  if (requested === "full") return null;
  if (requested) return requested;
  if (sh("git", ["rev-parse", "--verify", "--quiet", "origin/main"]).status === 0) return "origin/main..HEAD";
  fail("origin/main is not available; set SECRET_SCAN_RANGE or fetch origin/main");
}

function gitleaks(args, report, cwd = root) {
  const common = ["--no-banner", "--redact", "--report-format", "json", "--report-path", report];
  if (existsSync(ignoreFile)) common.push("--gitleaks-ignore-path", ignoreFile);
  const result = spawnSync("gitleaks", [...args, ...common], { cwd, stdio: "inherit", timeout: 300000 });
  if (result.error) fail(`gitleaks could not run (${result.error.message}); it is required`);
  if (result.status !== 0) {
    if (existsSync(report)) for (const f of JSON.parse(readFileSync(report, "utf8"))) {
      // Metadata only: never print the matched value.
      console.error(JSON.stringify({ rule: f.RuleID, file: f.File, line: f.StartLine, commit: f.Commit || undefined, fingerprint: f.Fingerprint }));
    }
    fail(`gitleaks reported findings or failed (exit ${result.status})`);
  }
}

export function runSecretScan() {
  mkdirSync(reportDir, { recursive: true });
  const range = resolveRange();
  if (range) {
    const [base, head] = range.split("..");
    for (const ref of [base, head]) {
      if (!ref || sh("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).status !== 0) fail(`range ref '${ref}' is not a commit`);
    }
    const count = sh("git", ["rev-list", "--count", range]).stdout.trim();
    console.log(`Scanning ${count} commit(s) in ${range}`);
    gitleaks(["git", "--log-opts", range, "."], join(reportDir, "gitleaks-commits.json"));
  } else {
    console.log("Scanning full history");
    gitleaks(["git", "."], join(reportDir, "gitleaks-history.json"));
  }
  // Current files of the checked-out commit, excluding untracked/ignored local files.
  const tree = mkdtempSync(join(tmpdir(), "costpilot-scan-"));
  try {
    const archive = sh("sh", ["-c", `git archive HEAD | tar -x -C "${tree}"`]);
    if (archive.status !== 0) fail(`could not export HEAD for the file scan: ${archive.stderr}`);
    console.log("Scanning files at HEAD");
    // Run inside the export so findings and fingerprints use repo-relative paths.
    gitleaks(["dir", "."], join(reportDir, "gitleaks-files.json"), tree);
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runSecretScan(); console.log("SECRET SCAN PASSED"); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
