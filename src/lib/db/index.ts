/**
 * Database client for Turso / libSQL via Drizzle.
 *
 * In development without TURSO_DATABASE_URL we fall back to a local
 * file-based libSQL database so the app can boot and migrations can run.
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

  // Local development fallback (file-based)
  // Data lives in ./local.db — never commit this file.
  return createClient({
    url: "file:local.db",
  });
}

const client = createDbClient();

export const db = drizzle(client, { schema });

export type Database = typeof db;

export { schema };
