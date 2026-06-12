process.env["NODE_ENV"] = process.env["NODE_ENV"] || "development";

import { initSentry } from "./lib/sentry";
import app from "./app";
import { logger } from "./lib/logger";
import { initCronJobs } from "./lib/cron-service";

// Validate required environment variables in production
const requiredEnvVars = [
  "ENCRYPTION_KEY",
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "WEBHOOK_SECRET",
  "JWT_SECRET",
  "CLERK_WEBHOOK_SIGNING_SECRET",
] as const;

if (process.env["NODE_ENV"] === "production") {
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missingEnvVars.join(", ")}`,
    );
  }
}

initSentry();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Initialize background automation
  initCronJobs();
});


