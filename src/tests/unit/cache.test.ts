import { afterEach, describe, expect, test } from "bun:test";
import { scanCachedFractionLabels } from "@/fractions/classifier";
import { withFallback, withGenericFallback } from "@/providers/cache";
import type { WastePickup } from "@/providers/types";
import { db } from "@/storage/database";

afterEach(() => {
  db.exec("DELETE FROM cache");
});

const PICKUP: WastePickup = {
  categories: ["residual"],
  category: "residual",
  color: "#71717a",
  date: "2026-01-01",
  fraction: "Restavfall",
  fractionId: "residual",
};

describe("withFallback", () => {
  test("scans and upgrades existing schedule cache entries without exposing keys", () => {
    db.exec("INSERT INTO cache (key, data, expires_at) VALUES (?1, ?2, ?3)", [
      "test:private-location",
      JSON.stringify([
        {
          category: "other",
          color: "#a1a1aa",
          date: "2026-01-01",
          fraction: "Papir og plastemballasje",
          fractionId: "compound",
        },
      ]),
      Date.now() + 60_000,
    ]);

    expect(scanCachedFractionLabels()).toEqual({
      cacheEntries: 1,
      labels: 1,
      pickups: 1,
    });
    const stored = db
      .query<{ data: string }, []>("SELECT data FROM cache LIMIT 1")
      .get();
    expect(JSON.parse(stored?.data ?? "[]")[0]).toMatchObject({
      categories: ["paper", "plastic"],
      category: "paper",
    });
  });

  test("upgrades cached singular-category pickups", async () => {
    db.exec("INSERT INTO cache (key, data, expires_at) VALUES (?1, ?2, ?3)", [
      "test:legacy",
      JSON.stringify([
        {
          category: "paper",
          color: "#3b82f6",
          date: "2026-01-01",
          fraction: "Papir og plastemballasje",
          fractionId: "legacy",
        },
      ]),
      Date.now() + 60_000,
    ]);

    const result = await withFallback("test:legacy", () =>
      Promise.reject(new Error("fresh fetch should not run"))
    );

    expect(result[0]).toMatchObject({
      categories: ["paper", "plastic"],
      category: "paper",
    });
  });

  test("caches successful fetch", async () => {
    let calls = 0;
    const fetcher = () => {
      calls += 1;
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
      calls += 1;
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
