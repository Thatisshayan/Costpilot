// Proves migration 0001 refuses to build the membership unique index over
// duplicate rows, leaves data untouched, and still applies cleanly otherwise.
// Only runs against a disposable costpilot_migration_rehearsal database.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connection = process.env.MIGRATION_REHEARSAL_DATABASE_URL;
if (!connection || new URL(connection).pathname !== "/costpilot_migration_rehearsal") {
  throw new Error("Use a disposable costpilot_migration_rehearsal database via MIGRATION_REHEARSAL_DATABASE_URL");
}
const migrations = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

// A copy of the migration folder whose journal stops after 0000 simulates a
// database that predates migration 0001.
function baselineFolder(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "costpilot-baseline-"));
  cpSync(migrations, dir, { recursive: true });
  const journalPath = path.join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx === 0);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

async function scenario(name: string, run: (pool: pg.Pool) => Promise<void>) {
  const pool = new pg.Pool({ connectionString: connection });
  try {
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    await migrate(drizzle(pool), { migrationsFolder: baselineFolder() });
    await run(pool);
    console.log(`Migration guard scenario passed: ${name}`);
  } finally {
    await pool.end();
  }
}

const tableExists = async (pool: pg.Pool, table: string) =>
  (await pool.query("SELECT to_regclass($1) AS t", [`public.${table}`])).rows[0].t !== null;

await scenario("duplicate memberships stop the migration without changing data", async pool => {
  const { rows: [ws] } = await pool.query(
    "INSERT INTO workspaces (name, slug, owner_id) VALUES ('Dup', 'dup', 'owner-1') RETURNING id");
  await pool.query(
    "INSERT INTO workspace_members (workspace_id, user_id, email, role) VALUES ($1, 'user-1', 'a@example.test', 'owner'), ($1, 'user-1', 'a@example.test', 'viewer')",
    [ws.id]);
  await assert.rejects(migrate(drizzle(pool), { migrationsFolder: migrations }), (error: Error & { cause?: Error }) => {
    const message = `${error.message} ${error.cause?.message ?? ""}`;
    assert.match(message, /duplicate \(workspace_id, user_id\) rows exist/);
    return true;
  });
  const { rows } = await pool.query("SELECT role FROM workspace_members WHERE workspace_id = $1 ORDER BY role", [ws.id]);
  assert.deepEqual(rows.map(r => r.role), ["owner", "viewer"], "duplicate rows must be preserved");
  assert.equal(await tableExists(pool, "workspace_invites"), false, "the failed migration must roll back completely");
});

await scenario("clean memberships migrate and keep their rows", async pool => {
  const { rows: [ws] } = await pool.query(
    "INSERT INTO workspaces (name, slug, owner_id) VALUES ('Clean', 'clean', 'owner-1') RETURNING id");
  await pool.query(
    "INSERT INTO workspace_members (workspace_id, user_id, email, role) VALUES ($1, 'user-1', 'a@example.test', 'owner'), ($1, 'user-2', 'b@example.test', 'viewer')",
    [ws.id]);
  await migrate(drizzle(pool), { migrationsFolder: migrations });
  await migrate(drizzle(pool), { migrationsFolder: migrations });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM workspace_members")).rows[0].n, 2);
  assert.equal(await tableExists(pool, "workspace_invites"), true);
  await assert.rejects(pool.query(
    "INSERT INTO workspace_members (workspace_id, user_id, email, role) VALUES ($1, 'user-1', 'a@example.test', 'viewer')", [ws.id]));
});
