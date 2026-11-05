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
const { eq, and, sql } = await import("drizzle-orm");
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
  // Display names are not unique: unrelated accounts can both use "Acme". The server
  // allocates distinct internal slugs, ignores client slugs, and each list stays private.
  const acmeA = await call("launch-a", "/workspaces", "POST", { name: "Acme", slug: "acme" });
  const acmeB = await call("launch-b", "/workspaces", "POST", { name: "Acme", slug: "acme" });
  assert.deepEqual([acmeA.status, acmeB.status], [201, 201]);
  const [wsA, wsB] = [await acmeA.json(), await acmeB.json()] as { id: number; slug: string; name: string }[];
  assert.notEqual(wsA.slug, wsB.slug);
  assert.match(wsA.slug, /^acme-[a-f0-9]{8}$/);
  assert.equal((await call("launch-a", "/workspaces", "POST", { name: "   " })).status, 400);
  assert.equal((await call("launch-a", "/workspaces", "POST", { name: "x".repeat(81) })).status, 400);
  const listB = await (await call("launch-b", "/workspaces")).json() as { id: number }[];
  assert(listB.some(w => w.id === wsB.id) && !listB.some(w => w.id === wsA.id), "workspace lists stay account-scoped");
  assert.equal((await call("launch-b", `/workspaces/${wsA.id}/members`)).status, 403);
  assert.equal((await call("launch-a", `/workspaces/${wsA.id}`, "PATCH", { slug: wsB.slug })).status, 409);
  assert.equal((await call("launch-a", `/workspaces/${wsA.id}`, "DELETE")).status, 200);
  assert.equal((await call("launch-b", `/workspaces/${wsB.id}`, "DELETE")).status, 200);
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
  // An invite stored under the old plaintext scheme can no longer be looked up
  // or redeemed: lookups hash the presented token, and no preimage is known.
  const legacyToken = randomBytes(32).toString("hex");
  await db.insert(invites).values({ workspaceId: workspace.id, email: "legacy@example.test", token: legacyToken, invitedBy: "launch-a", role: "admin", expiresAt: new Date(Date.now() + 60000) });
  await db.insert(members).values({ workspaceId: workspace.id, userId: `pending-${legacyToken}`, email: "legacy@example.test", role: "admin", status: "pending", inviteToken: legacyToken });
  assert.equal((await call("launch-f", `/workspaces/invite/${legacyToken}`)).status, 404);
  assert.equal((await call("launch-f", "/workspaces/accept-invite", "POST", { token: legacyToken })).status, 400);
  assert(!(await (await call("launch-viewer", `/workspaces/${workspace.id}/members`)).text()).includes(legacyToken), "legacy pending rows stay hidden from viewers");
  const [legacyRow] = await db.select().from(members).where(eq(members.email, "legacy@example.test"));
  assert.equal((await call("launch-a", `/workspaces/members/${legacyRow.id}`, "DELETE")).status, 200);
  const [legacyInvite] = await db.select().from(invites).where(eq(invites.email, "legacy@example.test"));
  assert.equal(legacyInvite.status, "expired", "revoking a legacy pending member expires its invite");
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
  // Money rules: codes are normalized, the numeric(10,2) range/precision is
  // enforced up front (no silent rounding or 500s), and refunds stay negative.
  const lower = await call("launch-a", "/expenses", "POST", { amount: 99999999.99, currency: "usd", date: "2026-11-04" });
  assert.equal(lower.status, 201);
  const lowerRow = await lower.json() as { id: number; currency: string; amount: number };
  assert.equal(lowerRow.currency, "USD");
  assert.equal(lowerRow.amount, 99999999.99);
  assert.equal((await call("launch-a", "/expenses", "POST", { amount: -4.5, currency: "EUR", date: "2026-11-04" })).status, 201);
  for (const bad of [{ amount: 100000000 }, { amount: 1.005 }, { amount: 1, currency: "US$" }, { amount: 1, date: "2026-02-30" }]) {
    assert.equal((await call("launch-a", "/expenses", "POST", { date: "2026-11-04", ...bad })).status, 400, JSON.stringify(bad));
  }
  assert.equal((await call("launch-a", `/expenses/${lowerRow.id}`, "PATCH", { amount: 0.001 })).status, 400);
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
  // Exports cover exactly one scope: personal by default, or one readable workspace.
  const personalCsv = await call("launch-a", "/exports/generate", "POST", { module: "expenses", format: "csv" });
  assert.equal(personalCsv.status, 200);
  assert.match(personalCsv.headers.get("content-type") ?? "", /^text\/csv/);
  assert.match(personalCsv.headers.get("content-disposition") ?? "", /filename="costpilot-expenses-personal-\d{4}-\d{2}-\d{2}\.csv"/);
  // Exports are never rendered by the browser: download-only, typed, and not MIME-sniffed
  // (Codacy "XSS: res.send(csv)" disposition evidence).
  assert.equal(personalCsv.headers.get("x-content-type-options"), "nosniff");
  assert.match(personalCsv.headers.get("content-disposition") ?? "", /^attachment;/);
  const personalText = await personalCsv.text();
  assert(personalText.includes("personal fixture") && !personalText.includes("shared fixture"));
  assert(personalText.startsWith('ID,Date,Type,Amount'), "CSV states the entry type explicitly");
  assert(/"Refund\/credit","-4\.50","EUR"/.test(personalText), "refunds export with an explicit type and the exact signed 2-decimal amount");
  const sharedCsv = await call("launch-viewer", "/exports/generate", "POST", { module: "expenses", format: "csv", workspaceId: workspace.id });
  assert.equal(sharedCsv.status, 200);
  const sharedText = await sharedCsv.text();
  assert(sharedText.includes("shared fixture") && !sharedText.includes("personal fixture"));
  assert.equal((await call("launch-b", "/exports/generate", "POST", { module: "expenses", format: "pdf", workspaceId: workspace.id })).status, 403);
  const sharedPdf = await call("launch-viewer", "/exports/generate", "POST", { module: "expenses", format: "pdf", workspaceId: workspace.id });
  assert.equal(sharedPdf.headers.get("content-type"), "application/pdf");
  assert((await sharedPdf.arrayBuffer()).byteLength > 100);
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

  // ---- Batch 2: monthly spend summary, expense search and export agree to the cent ----
  const [ws2] = await db.insert(ws).values({ name: "Spend fixture", slug: `spend-${Date.now()}`, ownerId: "launch-a" }).returning();
  await db.insert(members).values([
    { workspaceId: ws2.id, userId: "launch-a", email: "a@example.test", role: "owner" },
    { workspaceId: ws2.id, userId: "launch-c", email: "c@example.test", role: "viewer" },
  ]);
  const [aws] = await db.insert(platforms).values({ userId: "launch-a", workspaceId: ws2.id, name: "AWS" }).returning();
  const [openai] = await db.insert(platforms).values({ userId: "launch-a", workspaceId: ws2.id, name: "OpenAI" }).returning();
  const [checkout] = await db.insert(projects).values({ userId: "launch-a", workspaceId: ws2.id, name: "Checkout" }).returning();
  const row = (amount: string, currency: string, date: string, extra: Record<string, unknown> = {}) =>
    ({ userId: "launch-a", workspaceId: ws2.id, amount, currency, date, ...extra });
  await db.insert(expenses).values([
    row("100.10", "USD", "2026-09-03", { platformId: aws.id, projectId: checkout.id, category: "Compute", description: "September compute" }),
    row("0.20", "USD", "2026-09-30", { platformId: aws.id, category: "Compute" }),
    row("-20.00", "USD", "2026-09-15", { platformId: aws.id, description: "Support credit" }),
    row("50.00", "EUR", "2026-09-10", { platformId: openai.id, category: "AI / LLM API", description: "API usage" }),
    row("1500.00", "JPY", "2026-09-20", { category: "SaaS subscription" }),
    row("80.00", "USD", "2026-08-31", { platformId: aws.id }),
    row("5.00", "USD", "2026-10-01", { platformId: aws.id }),
    { userId: "launch-b", amount: "999.99", currency: "USD", date: "2026-09-05", description: "other account" },
  ]);
  const summaryRes = await call("launch-a", `/spend/summary?workspaceId=${ws2.id}&month=2026-09`);
  assert.equal(summaryRes.status, 200);
  type Cur = { currency: string; net: string; charges: string; credits: string; count: number; previousNet: string; changeAmount: string; changePercent: number | null;
    byVendor: { id: number | null; name: string | null; net: string }[]; byProject: { id: number | null; net: string }[]; byCategory: { name: string | null; net: string }[]; trend: { month: string; net: string }[] };
  const summary = await summaryRes.json() as { period: { isPartial: boolean; through: string }; comparison: { basis: string; through: string }; currencies: Cur[] };
  assert.deepEqual(summary.comparison, { month: "2026-08", start: "2026-08-01", through: "2026-08-31", basis: "full-month" });
  assert.equal(summary.period.isPartial, false);
  assert.deepEqual(summary.currencies.map(c => c.currency), ["EUR", "JPY", "USD"], "one row per currency, never combined");
  const usd = summary.currencies.find(c => c.currency === "USD")!;
  assert.deepEqual([usd.net, usd.charges, usd.credits, usd.count, usd.previousNet, usd.changeAmount, usd.changePercent], ["80.30", "100.30", "-20.00", 3, "80.00", "0.30", 0.4]);
  assert.deepEqual(usd.byVendor.map(v => [v.name, v.net]), [["AWS", "80.30"]]);
  assert.deepEqual(usd.byProject.map(p => [p.id, p.net]), [[checkout.id, "100.10"], [null, "-19.80"]]);
  assert.deepEqual(usd.byCategory.map(c => [c.name, c.net]), [["Compute", "100.30"], [null, "-20.00"]]);
  assert.deepEqual(usd.trend.slice(-3).map(t => [t.month, t.net]), [["2026-07", "0.00"], ["2026-08", "80.00"], ["2026-09", "80.30"]]);
  const eur = summary.currencies.find(c => c.currency === "EUR")!;
  assert.deepEqual([eur.net, eur.previousNet, eur.changePercent], ["50.00", "0.00", null], "no percentage against a zero baseline");
  assert.equal(summary.currencies.find(c => c.currency === "JPY")!.net, "1500.00");
  assert.equal((await call("launch-c", `/spend/summary?workspaceId=${ws2.id}&month=2026-09`)).status, 200, "viewers can read the summary");
  assert.equal((await call("launch-b", `/spend/summary?workspaceId=${ws2.id}&month=2026-09`)).status, 403, "non-members cannot");
  const personalB = await (await call("launch-b", "/spend/summary?month=2026-09")).json() as { currencies: Cur[] };
  assert.deepEqual(personalB.currencies.map(c => [c.currency, c.net]), [["USD", "999.99"]], "Personal scope holds only the caller's own rows");
  assert.equal((await call("launch-a", "/spend/summary?month=2999-01")).status, 400, "future months are rejected");
  assert.equal((await call("launch-a", "/spend/summary?month=2026-13")).status, 400);
  assert.equal((await call("launch-a", "/spend/summary?unknown=1")).status, 400);

  // Current (partial) month is compared with the same days of the previous month.
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  const [py, pm] = [Number(thisMonth.slice(0, 4)) - (thisMonth.endsWith("-01") ? 1 : 0), thisMonth.endsWith("-01") ? 12 : Number(thisMonth.slice(5, 7)) - 1];
  const prevMonth = `${py}-${String(pm).padStart(2, "0")}`;
  const prevLast = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  await db.insert(expenses).values([
    row("10.00", "CHF", today),
    row("4.00", "CHF", `${prevMonth}-01`),
    ...(Math.min(day, prevLast) < prevLast ? [row("6.00", "CHF", `${prevMonth}-${String(prevLast).padStart(2, "0")}`)] : []),
  ]);
  const current = await (await call("launch-a", `/spend/summary?workspaceId=${ws2.id}`)).json() as { period: { month: string; isPartial: boolean }; comparison: { basis: string }; currencies: Cur[] };
  assert.equal(current.period.month, thisMonth);
  if (current.period.isPartial) {
    assert.equal(current.comparison.basis, "same-days");
    assert.equal(current.currencies.find(c => c.currency === "CHF")!.previousNet, "4.00", "later days of the previous month are not compared with a partial month");
  }

  // Search: server-side filters, sort, pagination and per-currency totals over all matches.
  type Page = { items: { id: number; amount: number; currency: string; platformName: string | null; projectName: string | null }[]; total: number; totals: { currency: string; net: string; count: number }[] };
  const range = `workspaceId=${ws2.id}&from=2026-09-01&to=2026-09-30`;
  const page1 = await (await call("launch-c", `/expenses/search?${range}&sort=amount_desc&limit=2`)).json() as Page;
  assert.equal(page1.total, 5);
  assert.deepEqual(page1.items.map(i => i.amount), [1500, 100.1]);
  assert.deepEqual(page1.totals.map(t => [t.currency, t.net, t.count]), [["EUR", "50.00", 1], ["JPY", "1500.00", 1], ["USD", "80.30", 3]], "search totals equal the summary");
  const page3 = await (await call("launch-c", `/expenses/search?${range}&sort=amount_desc&limit=2&offset=4`)).json() as Page;
  assert.deepEqual(page3.items.map(i => i.amount), [-20]);
  const byText = await (await call("launch-a", `/expenses/search?${range}&q=openai`)).json() as Page;
  assert.deepEqual(byText.items.map(i => i.currency), ["EUR"], "q matches vendor names");
  const literal = await (await call("launch-a", `/expenses/search?${range}&q=${encodeURIComponent("%")}`)).json() as Page;
  assert.equal(literal.total, 0, "LIKE wildcards in q are matched literally");
  const noVendor = await (await call("launch-a", `/expenses/search?${range}&platformId=none`)).json() as Page;
  assert.deepEqual(noVendor.items.map(i => i.currency), ["JPY"]);
  const credits = await (await call("launch-a", `/expenses/search?${range}&entryType=credit`)).json() as Page;
  assert.deepEqual(credits.items.map(i => i.amount), [-20]);
  const big = await (await call("launch-a", `/expenses/search?${range}&minAmount=50&maxAmount=100.10&currency=USD`)).json() as Page;
  assert.deepEqual(big.items.map(i => [i.amount, i.platformName, i.projectName]), [[100.1, "AWS", "Checkout"]]);
  assert.equal((await call("launch-b", `/expenses/search?workspaceId=${ws2.id}`)).status, 403);
  const bOwn = await (await call("launch-b", "/expenses/search?from=2026-09-01&to=2026-09-30")).json() as Page;
  assert.deepEqual(bOwn.items.map(i => i.amount), [999.99], "Personal search never returns workspace or other-account rows");
  for (const bad of ["from=2026-02-30", "minAmount=1.234", "limit=101", "sort=evil", "from=2026-09-30&to=2026-09-01", "minAmount=10&maxAmount=9.99", "offset=1000001", "nope=1"]) {
    assert.equal((await call("launch-a", `/expenses/search?${bad}`)).status, 400, `rejects ${bad}`);
  }

  // Export with the same filters: per-currency row sums equal the dashboard summary.
  const exportRes = await call("launch-c", "/exports/generate", "POST", { module: "expenses", format: "csv", workspaceId: ws2.id, filters: { from: "2026-09-01", to: "2026-09-30" } });
  assert.equal(exportRes.status, 200);
  const lines = (await exportRes.text()).trim().split("\n");
  assert.equal(lines[0], "ID,Date,Type,Amount,Currency,Description,Category,Vendor,Project,Scope");
  const sums = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const cells = line.match(/"((?:[^"]|"")*)"/g)!.map(c => c.slice(1, -1));
    assert.equal(cells[9], "Spend fixture", "every row names its workspace");
    sums.set(cells[4], (sums.get(cells[4]) ?? 0) + Math.round(Number(cells[3]) * 100));
  }
  assert.deepEqual([...sums].sort(), [["EUR", 5000], ["JPY", 150000], ["USD", 8030]], "export totals equal the summary (in cents)");
  assert.equal((await call("launch-a", "/exports/generate", "POST", { module: "expenses", format: "csv", workspaceId: ws2.id, filters: { evil: 1 } })).status, 400);
  assert.equal((await call("launch-a", "/exports/generate", "POST", { module: "expenses", format: "csv", workspaceId: ws2.id, filters: { minAmount: "10", maxAmount: "9.99" } })).status, 400, "an impossible amount range is rejected, not exported empty");

  // ---- Batch 3: monthly budgets, per currency, refunds included, role-checked ----
  type BudgetJson = { id: number; amount: string; projectName: string | null; thresholds: number[] };
  type StatusJson = { period: { month: string }; budgets: { budget: BudgetJson; net: string; charges: string; credits: string; count: number; remaining: string; percentUsed: number; thresholdReached: number | null; state: string }[] };
  const createBudget = (user: string, body: Record<string, unknown>) => call(user, "/budgets", "POST", body);
  const wsBudgetRes = await createBudget("launch-a", { workspaceId: ws2.id, name: "Cloud", currency: "USD", amount: "100" });
  assert.equal(wsBudgetRes.status, 201);
  const wsBudget = await wsBudgetRes.json() as BudgetJson;
  assert.deepEqual([wsBudget.amount, wsBudget.thresholds, wsBudget.projectName], ["100.00", [50, 80, 100], null]);
  const projectBudget = await (await createBudget("launch-a", { workspaceId: ws2.id, projectId: checkout.id, name: "Checkout", currency: "USD", amount: "100.00", thresholds: [90, 100] })).json() as BudgetJson;
  assert.equal(projectBudget.projectName, "Checkout");
  await createBudget("launch-a", { workspaceId: ws2.id, name: "AI", currency: "EUR", amount: "40.00" });
  const status = await (await call("launch-c", `/budgets/status?workspaceId=${ws2.id}&month=2026-09`)).json() as StatusJson;
  const byId = new Map(status.budgets.map(b => [b.budget.id, b]));
  const wsStatus = byId.get(wsBudget.id)!;
  assert.deepEqual([wsStatus.net, wsStatus.charges, wsStatus.credits, wsStatus.count, wsStatus.remaining, wsStatus.percentUsed, wsStatus.thresholdReached, wsStatus.state],
    ["80.30", "100.30", "-20.00", 3, "19.70", 80.3, 80, "alert"], "the workspace USD budget matches the summary net (refund included); EUR/JPY never count");
  const projectStatus = byId.get(projectBudget.id)!;
  assert.deepEqual([projectStatus.net, projectStatus.remaining, projectStatus.percentUsed, projectStatus.state], ["100.10", "-0.10", 100.1, "over"], "a project budget counts only that project");
  assert.deepEqual(status.budgets.map(b => b.budget.amount), ["40.00", "100.00", "100.00"], "workspace budgets first (by currency), then project budgets");
  assert.equal(status.budgets.find(b => b.budget.amount === "40.00")!.state, "over", "EUR 50.00 against EUR 40.00");
  const october = await (await call("launch-a", `/budgets/status?workspaceId=${ws2.id}&month=2026-10`)).json() as StatusJson;
  assert.deepEqual(october.budgets.find(b => b.budget.id === wsBudget.id)!.net, "5.00", "the next month starts again (2026-09-30 counts only in September)");
  assert.equal((await call("launch-a", `/budgets/status?workspaceId=${ws2.id}&month=2999-01`)).status, 400, "future months are rejected");

  // Roles: viewers read, only owners/admins write; non-members see nothing.
  assert.equal((await call("launch-c", `/budgets?workspaceId=${ws2.id}`)).status, 200);
  assert.equal((await createBudget("launch-c", { workspaceId: ws2.id, name: "Viewer", currency: "GBP", amount: "1" })).status, 403);
  assert.equal((await call("launch-c", `/budgets/${wsBudget.id}`, "PATCH", { amount: "1" })).status, 403);
  assert.equal((await call("launch-c", `/budgets/${wsBudget.id}`, "DELETE")).status, 403);
  assert.equal((await call("launch-b", `/budgets?workspaceId=${ws2.id}`)).status, 403);
  assert.equal((await call("launch-b", `/budgets/status?workspaceId=${ws2.id}`)).status, 403);
  assert.equal((await call("launch-b", `/budgets/${wsBudget.id}`, "PATCH", { amount: "1" })).status, 404, "non-members cannot tell a budget exists");
  assert.equal((await call("launch-b", `/budgets/${wsBudget.id}`, "DELETE")).status, 404);

  // Personal budgets belong to their owner only.
  const bBudget = await (await createBudget("launch-b", { name: "Mine", currency: "USD", amount: "1000.00" })).json() as BudgetJson;
  const bStatus = await (await call("launch-b", "/budgets/status?month=2026-09")).json() as StatusJson;
  assert.deepEqual(bStatus.budgets.map(b => [b.budget.id, b.net, b.state]), [[bBudget.id, "999.99", "alert"]], "Personal status uses only the owner's Personal rows");
  assert.equal((await call("launch-a", `/budgets/${bBudget.id}`, "PATCH", { amount: "1" })).status, 404);
  assert.deepEqual(((await (await call("launch-a", "/budgets")).json()) as BudgetJson[]).map(b => b.id).includes(bBudget.id), false);

  // Validation, duplicates and cross-scope references.
  assert.equal((await createBudget("launch-a", { workspaceId: ws2.id, name: "Again", currency: "USD", amount: "5" })).status, 409, "one budget per scope, project and currency");
  assert.equal((await createBudget("launch-b", { name: "Mine again", currency: "USD", amount: "5" })).status, 409, "Personal duplicates are caught too (NULL workspace)");
  const [aPersonalProject] = await db.insert(projects).values({ userId: "launch-a", name: "Personal project" }).returning();
  assert.equal((await createBudget("launch-a", { workspaceId: ws2.id, projectId: aPersonalProject.id, name: "Leak", currency: "USD", amount: "5" })).status, 400, "a project from another scope is rejected");
  for (const bad of [{ amount: "0" }, { amount: "-5" }, { amount: "1.234" }, { currency: "usd" }, { thresholds: [80, 50] }, { thresholds: [0] }, { name: "" }, { name: "bad\u0000name" }, { evil: 1 }]) {
    assert.equal((await createBudget("launch-a", { workspaceId: ws2.id, name: "Bad", currency: "CAD", amount: "5", ...bad })).status, 400, `rejects ${JSON.stringify(bad)}`);
  }

  // Updating the amount changes the status; scope and currency cannot be changed.
  const patched = await call("launch-a", `/budgets/${wsBudget.id}`, "PATCH", { amount: "200", thresholds: [50, 75] });
  assert.equal(patched.status, 200);
  const after = (await (await call("launch-a", `/budgets/status?workspaceId=${ws2.id}&month=2026-09`)).json() as StatusJson).budgets.find(b => b.budget.id === wsBudget.id)!;
  assert.deepEqual([after.remaining, after.percentUsed, after.thresholdReached, after.state], ["119.70", 40.2, null, "ok"]);
  assert.equal((await call("launch-a", `/budgets/${wsBudget.id}`, "PATCH", { currency: "EUR" })).status, 400);
  assert.equal((await call("launch-a", "/budgets/99999999999", "DELETE")).status, 404, "an id beyond the integer range is not found, not a 500");
  assert.equal((await call("launch-a", "/budgets?workspaceId=99999999999")).status, 400);
  assert.equal((await createBudget("launch-a", { workspaceId: 99999999999, name: "Big", currency: "USD", amount: "1" })).status, 400);

  // Deleting a project deletes its budget instead of widening it to the whole workspace.
  const [temp] = await db.insert(projects).values({ userId: "launch-a", workspaceId: ws2.id, name: "Temporary" }).returning();
  const tempBudget = await (await createBudget("launch-a", { workspaceId: ws2.id, projectId: temp.id, name: "Temp", currency: "USD", amount: "10" })).json() as BudgetJson;
  assert.equal((await call("launch-a", `/projects/${temp.id}`, "DELETE")).status, 204);
  assert.equal((await call("launch-a", `/budgets/${tempBudget.id}`, "DELETE")).status, 404);
  assert.equal((await call("launch-a", `/budgets/${projectBudget.id}`, "DELETE")).status, 204);

  // Export size is capped so one request cannot build an unbounded file (Codacy DoS finding).
  await db.execute(sql`INSERT INTO expenses (user_id, amount, currency, date)
    SELECT 'launch-d', 1.00, 'USD', to_char(date '2025-01-01' + (g % 365), 'YYYY-MM-DD') FROM generate_series(1, 50001) g`);
  const tooBig = await call("launch-d", "/exports/generate", "POST", { module: "expenses", format: "csv" });
  assert.equal(tooBig.status, 413);
  assert.match((await tooBig.json() as { message: string }).message, /limited to 50,000 expenses/);
  const narrowed = await call("launch-d", "/exports/generate", "POST", { module: "expenses", format: "csv", filters: { from: "2025-01-01", to: "2025-01-31" } });
  assert.equal(narrowed.status, 200, "a narrower export still works");
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
