import { generateKeyPairSync, sign } from "node:crypto";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const database = process.env.LAUNCH_REHEARSAL_DATABASE_URL;
if (!database || new URL(database).pathname !== "/costpilot_launch_rehearsal") throw new Error("Disposable rehearsal database required");
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const now = Math.floor(Date.now()/1000);
const unsigned = [Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "local-rehearsal" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: "launch-a", iss: "https://clerk.costpilot.test", azp: "https://costpilot.test", iat: now, nbf: now-5, exp: now+300 })).toString("base64url")].join(".");
const token = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
const env = { ...process.env, DATABASE_URL: database, CLERK_SECRET_KEY: "fixture-only", KMS_MASTER_KEY: "1".repeat(64),
  CLERK_JWT_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
  CLERK_WEBHOOK_SIGNING_SECRET: "fixture-only", ALLOWED_ORIGINS: "https://costpilot.test", PORT: "8099" };
const name = `costpilot-smoke-${Date.now()}`;
function docker(args) {
  const result = spawnSync("docker", args, { env, stdio: "inherit", timeout: 120000 });
  assert.equal(result.status, 0, `Docker command failed: ${args[0]}`);
}
docker(["run", "--detach", "--name", name, "--network", "host", ...Object.keys(env).filter(key =>
  ["DATABASE_URL","CLERK_SECRET_KEY","KMS_MASTER_KEY","CLERK_JWT_KEY","CLERK_WEBHOOK_SIGNING_SECRET","ALLOWED_ORIGINS","PORT"].includes(key)).flatMap(key => ["--env", key]), "costpilot-api"]);
const base = "http://127.0.0.1:8099/api";
async function call(path, method="GET", body) {
  return fetch(base+path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
try {
  let healthy = false;
  for (let i=0;i<30;i++) {
    try { healthy = (await fetch(base+"/healthz")).ok; } catch {}
    if (healthy) break;
    await new Promise(resolve => setTimeout(resolve,1000));
  }
  assert(healthy, "Container readiness failed");
  assert.equal((await fetch(base+"/expenses")).status,401);
  const list = await call("/expenses"); assert.equal(list.status,200);
  const created = await call("/expenses","POST",{ amount: 3.25, date: "2026-11-04", description: "container fixture" });
  assert.equal(created.status,201); const item = await created.json();
  assert.equal((await call(`/expenses/${item.id}`,"PATCH",{ amount: 4 })).status,200);
  for (const format of ["csv","pdf"]) {
    const exported = await call("/exports/generate","POST",{ module: "expenses",format });
    assert.equal(exported.status,200); assert((await exported.arrayBuffer()).byteLength>10);
  }
  assert.equal((await call(`/expenses/${item.id}`,"DELETE")).status,204);
  assert.equal((await call("/remediation/execute","POST",{ actionId: 1 })).status,503);
  console.log("Production container smoke passed: readiness, real RSA token verification, bearer CRUD, CSV/PDF and disabled preview execution.");
} finally { docker(["stop", "--time", "15", name]); }
