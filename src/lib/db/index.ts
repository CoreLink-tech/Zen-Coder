/**
 * Database client for Turso / libSQL via Drizzle.
 *
 * Production requires TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN).
 * Local dev falls back to file:local.db when Turso is not set.
 */

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    return createClient({
      url,
      authToken,
    });
  }

  // Vercel / production must not use a local file DB (read-only / ephemeral FS)
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Configure Turso env vars in Vercel project settings."
    );
  }

  // Local development fallback (file-based)
  return createClient({
    url: "file:local.db",
  });
}

const client = createDbClient();

export const db = drizzle(client, { schema });

export type Database = typeof db;

export { schema };
