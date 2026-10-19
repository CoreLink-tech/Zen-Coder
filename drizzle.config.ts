import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Uses TURSO_DATABASE_URL when present, otherwise a local file database
 * so migrations can be generated and applied during development.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
});
