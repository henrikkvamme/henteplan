import { afterEach, describe, expect, test } from "bun:test";
import { db, withFallback, withGenericFallback } from "@/providers/cache";
import type { WastePickup } from "@/providers/types";

afterEach(() => {
  db.exec("DELETE FROM cache");
});

const PICKUP: WastePickup = {
  date: "2026-01-01",
  fraction: "Restavfall",
  color: "#000",
  category: "residual",
};

describe("withFallback", () => {
  test("caches successful fetch", async () => {
    let calls = 0;
    const fetcher = () => {
      calls++;
      return Promise.resolve([PICKUP]);
    };

    const first = await withFallback("test:1", fetcher);
    const second = await withFallback("test:1", fetcher);

    expect(first).toEqual(second);
    expect(calls).toBe(1);
  });

  test("returns stale data when fetcher throws after TTL expires", async () => {
    // Seed the cache
    await withFallback("test:stale", () => Promise.resolve([PICKUP]));

    // Expire the entry
    db.exec("UPDATE cache SET expires_at = ?1 WHERE key = 'test:stale'", [
      Date.now() - 1,
    ]);

    // Fetcher now fails
    const result = await withFallback("test:stale", () => {
      throw new Error("provider down");
    });

    expect(result).toEqual([PICKUP]);
  });

  test("throws when no stale data exists", () => {
    expect(
      withFallback("test:missing", () => {
        throw new Error("provider down");
      })
    ).rejects.toThrow("provider down");
  });
});

describe("withGenericFallback", () => {
  // noinspection MagicNumber
  const ttl = 60_000;

  test("caches successful fetch", async () => {
    let calls = 0;
    const fetcher = () => {
      calls++;
      return Promise.resolve(["a", "b"]);
    };

    const first = await withGenericFallback<string[]>("gen:1", ttl, fetcher);
    const second = await withGenericFallback<string[]>("gen:1", ttl, fetcher);

    expect(first).toEqual(second);
    expect(calls).toBe(1);
  });

  test("returns stale data when fetcher throws after TTL expires", async () => {
    const data = ["oslo", "bergen"];

    await withGenericFallback("gen:stale", ttl, () => Promise.resolve(data));

    db.exec("UPDATE cache SET expires_at = ?1 WHERE key = 'gen:stale'", [
      Date.now() - 1,
    ]);

    const result = await withGenericFallback<string[]>("gen:stale", ttl, () => {
      throw new Error("service down");
    });

    expect(result).toEqual(data);
  });

  test("throws when no stale data exists", () => {
    expect(
      withGenericFallback<string[]>("gen:missing", ttl, () => {
        throw new Error("service down");
      })
    ).rejects.toThrow("service down");
  });
});
