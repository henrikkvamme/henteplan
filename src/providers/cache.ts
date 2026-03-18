import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { WastePickup } from "./types";

// noinspection MagicNumber
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const DB_PATH = process.env.CACHE_DB_PATH ?? "data/cache.db";
if (DB_PATH !== ":memory:") {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}
const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode=WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

const stmtGet = db.prepare<{ data: string; expires_at: number }, [string]>(
  "SELECT data, expires_at FROM cache WHERE key = ?1"
);
const stmtUpsert = db.prepare(
  "INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?1, ?2, ?3)"
);

function getRow(key: string) {
  return stmtGet.get(key);
}

export async function withFallback(
  key: string,
  fetcher: () => Promise<WastePickup[]>
): Promise<WastePickup[]> {
  const row = getRow(key);
  if (row && row.expires_at > Date.now()) {
    return JSON.parse(row.data) as WastePickup[];
  }

  try {
    const data = await fetcher();
    stmtUpsert.run(key, JSON.stringify(data), Date.now() + TTL_MS);
    return data;
  } catch (err) {
    if (row) {
      console.warn(
        `[cache] Serving stale data for ${key} (expired ${new Date(row.expires_at).toISOString()})`
      );
      return JSON.parse(row.data) as WastePickup[];
    }
    throw err;
  }
}

export async function withGenericFallback<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const row = getRow(key);
  if (row && row.expires_at > Date.now()) {
    return JSON.parse(row.data) as T;
  }

  try {
    const data = await fetcher();
    stmtUpsert.run(key, JSON.stringify(data), Date.now() + ttlMs);
    return data;
  } catch (err) {
    if (row) {
      console.warn(
        `[cache] Serving stale data for ${key} (expired ${new Date(row.expires_at).toISOString()})`
      );
      return JSON.parse(row.data) as T;
    }
    throw err;
  }
}

// Exported for testing only
export { db, TTL_MS };
