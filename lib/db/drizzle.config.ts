import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/costpilot";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});

