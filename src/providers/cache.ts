import type { WastePickup } from "./types";

const CACHE = new Map<string, { data: WastePickup[]; expiresAt: number }>();
// noinspection MagicNumber
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function getCached(key: string): WastePickup[] | null {
  const entry = CACHE.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  return null;
}

export function setCache(key: string, data: WastePickup[]): void {
  CACHE.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

// Generic cache for non-pickup data (e.g. Norkart customer list)
const GENERIC_CACHE = new Map<string, { data: unknown; expiresAt: number }>();

export function getCachedGeneric<T>(key: string): T | null {
  const entry = GENERIC_CACHE.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  return null;
}

export function setCacheGeneric(
  key: string,
  data: unknown,
  ttlMs: number
): void {
  GENERIC_CACHE.set(key, { data, expiresAt: Date.now() + ttlMs });
}
