import { describe, expect, test } from "bun:test";
import { app } from "../setup";

describe("GET /api/v1/providers", () => {
  test("returns 200 with list of providers", async () => {
    const res = await app.request("/api/v1/providers");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("providers");
    expect(Array.isArray(data.providers)).toBe(true);
  });

  test("returns exactly 13 providers", async () => {
    const res = await app.request("/api/v1/providers");
    const data = await res.json();
    expect(data.providers).toHaveLength(13);
  });

  test("each provider has required fields", async () => {
    const res = await app.request("/api/v1/providers");
    const data = await res.json();

    for (const provider of data.providers) {
      expect(typeof provider.id).toBe("string");
      expect(provider.id.length).toBeGreaterThan(0);

      expect(typeof provider.name).toBe("string");
      expect(provider.name.length).toBeGreaterThan(0);

      expect(typeof provider.website).toBe("string");
      expect(provider.website.length).toBeGreaterThan(0);

      expect(Array.isArray(provider.coverageAreas)).toBe(true);
      expect(Array.isArray(provider.postalRanges)).toBe(true);
    }
  });

  test("includes expected provider IDs", async () => {
    const res = await app.request("/api/v1/providers");
    const data = await res.json();
    const ids = data.providers.map((p: { id: string }) => p.id);

    const expected = [
      "trv",
      "bir",
      "oslo",
      "norkart",
      "avfallsor",
      "him",
      "remidt",
      "fosen",
      "frevar",
      "iris",
      "rfd",
      "renovasjonen",
      "innherred",
    ];
    for (const id of expected) {
      expect(ids).toContain(id);
    }
  });
});
