import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().transform(Number).pipe(z.coerce.number().int().positive()),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_JWT_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  WEBHOOK_SECRET: z.string().min(1).optional(),
  KMS_MASTER_KEY: z.string().length(64).optional(),
  ENCRYPTION_KEY: z.string().length(64).optional(),
  SENTRY_DSN: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_JWT_KEY: process.env.CLERK_JWT_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    KMS_MASTER_KEY: process.env.KMS_MASTER_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${errors.join("\n")}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error("Environment not validated. Call validateEnv() first.");
  }
  return cachedEnv;
}
