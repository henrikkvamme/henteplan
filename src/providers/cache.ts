import type { WastePickup } from "./types";

const CACHE = new Map<string, { data: WastePickup[]; expiresAt: number }>();
// noinspection MagicNumber
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getCached(key: string): WastePickup[] | null {
  const entry = CACHE.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: WastePickup[]): void {
  CACHE.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export async function withFallback(
  key: string,
  fetcher: () => Promise<WastePickup[]>
): Promise<WastePickup[]> {
  const fresh = getCached(key);
  if (fresh) {
    return fresh;
  }

  try {
    const data = await fetcher();
    setCache(key, data);
    return data;
  } catch (err) {
    const stale = CACHE.get(key);
    if (stale) {
      console.warn(
        `[cache] Serving stale data for ${key} (expired ${new Date(stale.expiresAt).toISOString()})`
      );
      return stale.data;
    }
    throw err;
  }
}

// Generic cache for non-pickup data (e.g. Norkart customer list)
const GENERIC_CACHE = new Map<string, { data: unknown; expiresAt: number }>();

function getCachedGeneric<T>(key: string): T | null {
  const entry = GENERIC_CACHE.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setCacheGeneric(key: string, data: unknown, ttlMs: number): void {
  GENERIC_CACHE.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function withGenericFallback<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const fresh = getCachedGeneric<T>(key);
  if (fresh) {
    return fresh;
  }

  try {
    const data = await fetcher();
    setCacheGeneric(key, data, ttlMs);
    return data;
  } catch (err) {
    const stale = GENERIC_CACHE.get(key);
    if (stale) {
      console.warn(
        `[cache] Serving stale data for ${key} (expired ${new Date(stale.expiresAt).toISOString()})`
      );
      return stale.data as T;
    }
    throw err;
  }
}

// Exported for testing only
export { CACHE, GENERIC_CACHE, getCached, setCache, TTL_MS };
