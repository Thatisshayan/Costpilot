import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";

const connection = process.env.LAUNCH_REHEARSAL_DATABASE_URL;
if (!connection || new URL(connection).pathname !== "/costpilot_launch_rehearsal") {
  throw new Error("Use a disposable costpilot_launch_rehearsal database via LAUNCH_REHEARSAL_DATABASE_URL");
}
process.env.DATABASE_URL = connection;
process.env.NODE_ENV = "production";
process.env.KMS_MASTER_KEY = "1".repeat(64);
const { db, pool, workspacesTable: ws, workspaceMembersTable: members,
  workspaceInvitesTable: invites, expensesTable: expenses, projectsTable: projects } = await import("../src/index");
const { eq, and } = await import("drizzle-orm");
const { authConfig } = await import("../../../artifacts/api-server/src/middlewares/auth");
authConfig.verifyToken = (async (token: string) => {
  if (!["launch-a", "launch-b", "launch-viewer", "launch-c", "launch-d"].includes(token)) throw new Error("Invalid fixture token");
  return { sub: token };
}) as typeof authConfig.verifyToken;
const { default: app } = await import("../../../artifacts/api-server/src/app");
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Missing test listener");
const base = `http://127.0.0.1:${address.port}/api`;
async function call(user: string, path: string, method = "GET", body?: unknown) {
  return fetch(base + path, { method, headers: { Authorization: `Bearer ${user}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
try {
  // This script intentionally refuses all non-rehearsal database names.
  const [workspace] = await db.insert(ws).values({ name: "Launch rehearsal", slug: `launch-${Date.now()}`, ownerId: "launch-a" }).returning();
  await db.insert(members).values([
    { workspaceId: workspace.id, userId: "launch-a", email: "a@example.test", role: "owner" },
    { workspaceId: workspace.id, userId: "launch-viewer", email: "viewer@example.test", role: "viewer" },
  ]);
  const [foreignProject] = await db.insert(projects).values({ userId: "launch-b", name: "Private B" }).returning();
  const [privateExpense, sharedExpense] = await db.insert(expenses).values([
    { userId: "launch-a", amount: "12.50", date: "2026-11-04", description: "personal fixture" },
    { userId: "launch-a", workspaceId: workspace.id, amount: "25.00", date: "2026-11-04", description: "shared fixture" },
  ]).returning();
  assert.equal((await call("bad-token", "/expenses")).status, 401);
  assert.equal((await call("launch-b", `/expenses/${privateExpense.id}`)).status, 404);
  assert.equal((await call("launch-viewer", `/expenses/${sharedExpense.id}`)).status, 200);
  assert.equal((await call("launch-viewer", `/expenses/${sharedExpense.id}`, "PATCH", { amount: 1 })).status, 403);
  assert.equal((await call("launch-b", `/expenses/${sharedExpense.id}`)).status, 404);
  assert.equal((await call("launch-a", "/expenses", "POST", { amount: 1, date: "2026-11-04", projectId: foreignProject.id })).status, 400);
  const created = await call("launch-a", "/expenses", "POST", { amount: 7.5, date: "2026-11-04", workspaceId: workspace.id });
  assert.equal(created.status, 201);
  const item = await created.json();
  assert.equal((await call("launch-a", `/expenses/${item.id}`, "PATCH", { amount: 8 })).status, 200);
  assert.equal((await call("launch-a", `/expenses/${item.id}`, "DELETE")).status, 204);
  const projectResponse = await call("launch-a", "/projects", "POST", { name: "Shared project", workspaceId: workspace.id });
  assert.equal(projectResponse.status, 201);
  const project = await projectResponse.json();
  assert.equal((await call("launch-viewer", `/projects/${project.id}`, "DELETE")).status, 404);
  assert.equal((await call("launch-a", `/projects/${project.id}`)).status, 200);
  assert.equal((await call("launch-a", `/projects/${project.id}`, "DELETE")).status, 204);
  assert.equal((await call("launch-a", `/projects/${project.id}`, "DELETE")).status, 404);
  assert.equal((await call("launch-a", "/exports/generate", "POST", { module: "expenses", format: "csv", dateRange: "ignored" })).status, 400);
  const inviteCreations = await Promise.all(Array.from({ length: 2 }, () =>
    call("launch-a", `/workspaces/${workspace.id}/invite`, "POST", { email: "concurrent@example.test", role: "viewer" })));
  assert.deepEqual(inviteCreations.map(response => response.status).sort(), [201, 409]);
  await db.update(members).set({ status: "expired" }).where(and(eq(members.workspaceId, workspace.id), eq(members.userId, "launch-viewer")));
  assert.equal((await call("launch-viewer", `/expenses/${sharedExpense.id}`)).status, 404);
  const visible = await (await call("launch-viewer", "/expenses")).json();
  assert(!visible.some((e: { id: number }) => e.id === sharedExpense.id));
  assert.equal((await call("launch-a", `/workspaces/${workspace.id}`, "DELETE")).status, 409);
  assert.equal((await call("launch-a", `/expenses/${sharedExpense.id}`)).status, 200);
  const token = randomBytes(32).toString("hex");
  await db.insert(invites).values({ workspaceId: workspace.id, email: "invite@example.test", token, invitedBy: "launch-a", role: "viewer", expiresAt: new Date(Date.now() + 60000) });
  await db.insert(members).values({ workspaceId: workspace.id, userId: `pending-${Date.now()}`, email: "invite@example.test", status: "pending", inviteToken: token });
  const attempts = await Promise.all([call("launch-c", "/workspaces/accept-invite", "POST", { token }), call("launch-d", "/workspaces/accept-invite", "POST", { token })]);
  assert.deepEqual(attempts.map(a => a.status).sort(), [200, 400]);
  assert.equal((await call("launch-a", "/remediation/execute", "POST", { actionId: 1 })).status, 503);
  await db.insert(expenses).values(Array.from({ length: 1000 }, (_, i) => ({ userId: "launch-a", workspaceId: workspace.id, amount: "1.00", date: "2026-11-04", description: `load fixture ${i}` })));
  const timings: number[] = [];
  for (let batch = 0; batch < 4; batch++) await Promise.all(Array.from({ length: 5 }, async () => {
    const start = performance.now(); const response = await call("launch-a", "/expenses");
    assert.equal(response.status, 200); await response.json(); timings.push(performance.now() - start);
  }));
  timings.sort((a,b) => a-b);
  const p95 = timings[Math.ceil(timings.length * 0.95)-1];
  assert(p95 < 1500, `Expense list p95 ${p95.toFixed(0)}ms exceeds rehearsal target`);
  console.log(`Local fixture list p95: ${p95.toFixed(0)}ms (1000 expenses, concurrency 5)`);
  console.log("Launch rehearsal passed: bearer writes, personal/shared isolation, viewer/nonmember denial, foreign references, revocation, invite replay/concurrency and disabled execution.");
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
}
