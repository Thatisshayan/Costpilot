import pg from "pg";

const target = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/postgres");
if (!["localhost", "127.0.0.1"].includes(target.hostname)) throw new Error("Local PostgreSQL required; remote databases are not used for rehearsals.");
const client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["costpilot_launch_rehearsal"]);
  if (!result.rowCount) await client.query("CREATE DATABASE costpilot_launch_rehearsal");
  console.log("Disposable local rehearsal database is ready; original application database was not migrated.");
} catch (error) {
  console.error(`Local rehearsal database unavailable: ${error.code ?? "connection failed"}`);
  process.exitCode = 1;
} finally { await client.end(); }
