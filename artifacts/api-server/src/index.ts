import { initSentry, flushMonitoring } from "./lib/sentry";
import { validateEnv } from "./lib/env";
import { logger } from "./lib/logger";

const env = validateEnv();
initSentry();
const { default: app } = await import("./app");
const { pool } = await import("@workspace/db");
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "Server listening"));
// Provider jobs are excluded from this launch runtime. A future worker needs a
// distributed execution lock, deduplication and explicit provider authorization.
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => process.exit(1), 15000);
  deadline.unref();
  server.close(async () => {
    try { await pool.end(); await flushMonitoring(); process.exitCode = 0; }
    catch { process.exitCode = 1; }
    clearTimeout(deadline);
  });
});
