import { initSentry } from "./lib/sentry";
import app from "./app";
import { logger } from "./lib/logger";
import { initCronJobs } from "./lib/cron-service";
import { validateEnv } from "./lib/env";

validateEnv();

initSentry();

const env = validateEnv();
const port = env.PORT;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port: env.PORT }, "Server listening");

  // Initialize background automation
  initCronJobs();
});
