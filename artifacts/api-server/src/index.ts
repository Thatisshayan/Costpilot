import { initSentry, flushMonitoring } from "./lib/sentry";
import { validateEnv } from "./lib/env";
import { logger } from "./lib/logger";

const env = validateEnv();
initSentry();
const { default: app } = await import("./app");
const { pool } = await import("@workspace/db");
const { startSyncScheduler } = await import("./lib/provider-sync/scheduler");
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "Server listening"));
// Single-instance scheduler; hosting several API instances would need a distributed lock first.
const stopSyncScheduler = startSyncScheduler(env.SYNC_INTERVAL_HOURS);
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
  if (shuttingDown) return;
  shuttingDown = true;
  stopSyncScheduler();
  const deadline = setTimeout(() => process.exit(1), 15000);
  deadline.unref();
  server.close(async () => {
    try { await pool.end(); await flushMonitoring(); process.exitCode = 0; }
    catch { process.exitCode = 1; }
    clearTimeout(deadline);
  });
});
