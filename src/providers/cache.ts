import { normalizePickups } from "../fractions/classifier";
import { db } from "../storage/database";
import type { WastePickup } from "./types";

// noinspection MagicNumber
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const stmtGet = db.prepare<{ data: string; expires_at: number }, [string]>(
  "SELECT data, expires_at FROM cache WHERE key = ?1"
);
const stmtUpsert = db.prepare(
  "INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?1, ?2, ?3)"
);

function getRow(key: string) {
  return stmtGet.get(key);
}

function classifyCachedPickups(
  key: string,
  pickups: WastePickup[]
): WastePickup[] {
  const providerId = key.split(":", 1)[0] ?? "unknown";
  return normalizePickups(providerId, pickups);
}

export async function withFallback(
  key: string,
  fetcher: () => Promise<WastePickup[]>
): Promise<WastePickup[]> {
  const row = getRow(key);
  if (row && row.expires_at > Date.now()) {
    return classifyCachedPickups(key, JSON.parse(row.data) as WastePickup[]);
  }

  try {
    const data = await fetcher();
    const classified = classifyCachedPickups(key, data);
    stmtUpsert.run(key, JSON.stringify(classified), Date.now() + TTL_MS);
    return classified;
  } catch (err) {
    if (row) {
      console.warn(
        `[cache] Serving stale data for ${key} (expired ${new Date(row.expires_at).toISOString()})`
      );
      return classifyCachedPickups(key, JSON.parse(row.data) as WastePickup[]);
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
