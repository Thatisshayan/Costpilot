import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";

const connection = process.env.LAUNCH_REHEARSAL_DATABASE_URL;
if (!connection || new URL(connection).pathname !== "/costpilot_launch_rehearsal") {
  throw new Error("Use a disposable costpilot_launch_rehearsal database via LAUNCH_REHEARSAL_DATABASE_URL");
}
process.env.DATABASE_URL = connection;
process.env.NODE_ENV = "production";
process.env.KMS_MASTER_KEY = "1".repeat(64);
const { db, pool, workspacesTable: ws, workspaceMembersTable: members,
  workspaceInvitesTable: invites, expensesTable: expenses, projectsTable: projects, platformsTable: platforms } = await import("../src/index");
const { eq, and } = await import("drizzle-orm");
const { authConfig } = await import("../../../artifacts/api-server/src/middlewares/auth");
authConfig.verifyToken = (async (token: string) => {
  if (!["launch-a", "launch-b", "launch-viewer", "launch-c", "launch-d", "launch-e", "launch-f"].includes(token)) throw new Error("Invalid fixture token");
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
  // Invitation secrets: only owners/admins mint invites, nobody can read a token back,
  // and a viewer cannot redeem an elevated invite to escalate privileges.
  const invitePath = `/workspaces/${workspace.id}/invite`;
  assert.equal((await call("launch-viewer", invitePath, "POST", { email: "x@example.test", role: "admin" })).status, 403);
  assert.equal((await call("launch-b", invitePath, "POST", { email: "x@example.test", role: "admin" })).status, 403);
  assert.equal((await call("launch-b", `/workspaces/${workspace.id}/members`)).status, 403);
  const adminInvite = await call("launch-a", invitePath, "POST", { email: "new-admin@example.test", role: "admin" });
  assert.equal(adminInvite.status, 201);
  const { token: adminToken } = await adminInvite.json() as { token: string };
  assert.match(adminToken, /^[a-f0-9]{64}$/);
  const viewerMembers = await (await call("launch-viewer", `/workspaces/${workspace.id}/members`)).text();
  assert(!viewerMembers.includes(adminToken), "viewer member list must not expose invite tokens");
  assert(!(JSON.parse(viewerMembers) as { status: string }[]).some(m => m.status !== "active"), "viewers see active members only");
  const ownerMembers = await (await call("launch-a", `/workspaces/${workspace.id}/members`)).text();
  assert(!ownerMembers.includes(adminToken), "owner member list must not expose invite tokens");
  const [storedInvite] = await db.select().from(invites).where(eq(invites.email, "new-admin@example.test"));
  const [storedPending] = await db.select().from(members).where(eq(members.email, "new-admin@example.test"));
  for (const value of [storedInvite.token, storedPending.userId, storedPending.inviteToken ?? ""]) {
    assert(!value.includes(adminToken), "invite tokens must not be stored in plaintext");
  }
  assert.equal((await call("launch-e", `/workspaces/invite/${adminToken}`)).status, 200);
  const accepted = await call("launch-e", "/workspaces/accept-invite", "POST", { token: adminToken });
  assert.equal(accepted.status, 200);
  assert.equal(((await accepted.json()) as { member: { role: string } }).member.role, "admin");
  assert.equal((await call("launch-viewer", "/workspaces/accept-invite", "POST", { token: adminToken })).status, 400);
  // Even a viewer holding a live admin token cannot convert their membership.
  const secondAdmin = await (await call("launch-a", invitePath, "POST", { email: "admin-two@example.test", role: "admin" })).json() as { token: string };
  assert.equal((await call("launch-viewer", "/workspaces/accept-invite", "POST", { token: secondAdmin.token })).status, 409);
  const [viewerRow] = await db.select().from(members).where(and(eq(members.workspaceId, workspace.id), eq(members.userId, "launch-viewer")));
  assert.equal(viewerRow.role, "viewer");
  assert.equal((await call("launch-f", "/workspaces/accept-invite", "POST", { token: adminToken })).status, 400);
  assert.equal((await call("launch-f", "/workspaces/accept-invite", "POST", { token: "f".repeat(64) })).status, 400);
  // The new admin can manage viewer invites but cannot remove another admin.
  assert.equal((await call("launch-e", invitePath, "POST", { email: "by-admin@example.test", role: "viewer" })).status, 201);
  assert((await (await call("launch-e", `/workspaces/${workspace.id}/members`)).json() as { status: string }[]).some(m => m.status === "pending"));
  const [adminTwoRow] = await db.select().from(members).where(eq(members.email, "admin-two@example.test"));
  assert.equal((await call("launch-e", `/workspaces/members/${adminTwoRow.id}`, "DELETE")).status, 403);
  const expiring = await (await call("launch-a", invitePath, "POST", { email: "late@example.test", role: "viewer" })).json() as { token: string };
  await db.update(invites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invites.email, "late@example.test"));
  assert.equal((await call("launch-f", "/workspaces/accept-invite", "POST", { token: expiring.token })).status, 400);
  const revoked = await (await call("launch-a", invitePath, "POST", { email: "revoked@example.test", role: "viewer" })).json() as { token: string };
  const [revokedMember] = await db.select().from(members).where(eq(members.email, "revoked@example.test"));
  assert.equal((await call("launch-viewer", `/workspaces/members/${revokedMember.id}`, "DELETE")).status, 403);
  assert.equal((await call("launch-a", `/workspaces/members/${revokedMember.id}`, "DELETE")).status, 200);
  assert.equal((await call("launch-f", "/workspaces/accept-invite", "POST", { token: revoked.token })).status, 400);
  assert.equal((await call("launch-f", `/expenses/${sharedExpense.id}`)).status, 404);
  // Stored provider credentials survive unrelated edits and are never echoed.
  const platformResponse = await call("launch-a", "/platforms", "POST", { name: "Key holder", apiKey: "sk-rehearsal-secret" });
  assert.equal(platformResponse.status, 201);
  const platform = await platformResponse.json() as { id: number; apiKey: string };
  const [beforeEdit] = await db.select().from(platforms).where(eq(platforms.id, platform.id));
  assert.equal((await call("launch-a", `/platforms/${platform.id}`, "PATCH", { notes: "edited", apiKey: platform.apiKey })).status, 400);
  assert.equal((await call("launch-a", `/platforms/${platform.id}`, "PATCH", { notes: "edited" })).status, 200);
  const [afterEdit] = await db.select().from(platforms).where(eq(platforms.id, platform.id));
  assert.equal(afterEdit.apiKey, beforeEdit.apiKey);
  const listed = await (await call("launch-a", "/platforms?reveal=true")).text();
  assert(!listed.includes("sk-rehearsal-secret"));
  assert.equal((await call("launch-a", `/platforms/${platform.id}`, "PATCH", { apiKey: null })).status, 200);
  const [cleared] = await db.select().from(platforms).where(eq(platforms.id, platform.id));
  assert.equal(cleared.apiKey, null);
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
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.insert(invites).values({ workspaceId: workspace.id, email: "invite@example.test", token: tokenHash, invitedBy: "launch-a", role: "viewer", expiresAt: new Date(Date.now() + 60000) });
  await db.insert(members).values({ workspaceId: workspace.id, userId: `pending-${Date.now()}`, email: "invite@example.test", status: "pending", inviteToken: tokenHash });
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
