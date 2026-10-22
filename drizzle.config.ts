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
    // drizzle-kit's sqlite config accepts only `url`; put ?authToken= on a
    // Turso URL via TURSO_DATABASE_URL if migrations need auth.
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  },
  verbose: true,
  strict: true,
});
