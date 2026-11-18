#!/usr/bin/env node
// Local single-user stack: `pnpm dev:local`.
//
// 1. Starts the docker-compose Postgres service and waits until it is healthy.
// 2. Applies Drizzle migrations to it.
// 3. Builds the API server, then runs it with the root `.env` loaded.
// 4. Runs the web dev server, which proxies `/api` to the API (see ai-tracker/vite.config.ts).
//
// Ports: API from `PORT` in `.env` (default 8787), web from `WEB_PORT` (default 5317).
// Ctrl+C stops the API and web servers; Postgres keeps running (`docker compose stop postgres`).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env");
const isWindows = process.platform === "win32";

function fail(message) {
  console.error(`dev-local: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: isWindows, ...options });
  if (result.status !== 0) fail(`\`${command} ${args.join(" ")}\` exited with ${result.status}`);
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

if (!existsSync(envFile)) fail("missing .env at the repo root; copy .env.example and fill it in (see README).");
const env = parseEnv(readFileSync(envFile, "utf8"));
for (const key of ["DATABASE_URL", "CLERK_SECRET_KEY"]) {
  if (!env[key]) fail(`.env is missing ${key}`);
}
const apiPort = env.PORT || "8787";
const webPort = env.WEB_PORT || "5317";

console.log("dev-local: starting Postgres");
run("docker", ["compose", "up", "-d", "postgres"]);
for (let attempt = 0; ; attempt++) {
  const status = spawnSync("docker", ["inspect", "-f", "{{.State.Health.Status}}", "costpilot-postgres"], { encoding: "utf8" });
  const health = status.stdout?.trim();
  if (health === "healthy") break;
  if (health === "unhealthy") fail("Postgres container is unhealthy; check `docker logs costpilot-postgres`.");
  if (attempt >= 120) fail("Postgres did not become healthy within 4 minutes.");
  await sleep(2000);
}

console.log("dev-local: applying migrations");
run("pnpm", ["--filter", "@workspace/db", "run", "migrate"], { env: { ...process.env, DATABASE_URL: env.DATABASE_URL } });

console.log("dev-local: building API server");
run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);

const children = [];
function start(name, command, args, options) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
  const prefix = (chunk) => chunk.toString().split(/\r?\n/).filter(Boolean).forEach((line) => console.log(`[${name}] ${line}`));
  child.stdout.on("data", prefix);
  child.stderr.on("data", prefix);
  child.on("exit", (code) => {
    console.log(`dev-local: ${name} exited with ${code}`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("api", process.execPath, ["--env-file", envFile, "--enable-source-maps", "./dist/index.mjs"], {
  cwd: join(root, "artifacts", "api-server"),
});
start("web", process.execPath, ["node_modules/vite/bin/vite.js", "--config", "vite.config.ts", "--host", "localhost"], {
  cwd: join(root, "artifacts", "ai-tracker"),
  env: { ...process.env, PORT: webPort, API_PROXY_TARGET: `http://localhost:${apiPort}` },
});

console.log(`dev-local: open http://localhost:${webPort} (API on http://localhost:${apiPort})`);
