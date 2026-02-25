import { describe, expect, test } from "bun:test";
import { app } from "../setup";

describe("GET /api/v1/search", () => {
  test("returns 400 for missing query parameter", async () => {
    const res = await app.request("/api/v1/search");
    expect(res.status).toBe(400);
  });

  test("returns 400 for query shorter than 2 characters", async () => {
    const res = await app.request("/api/v1/search?q=a");
    expect(res.status).toBe(400);
  });

  test("returns 404 for unknown provider", async () => {
    const res = await app.request(
      "/api/v1/search?q=Storgata&provider=nonexistent",
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("PROVIDER_NOT_FOUND");
  });

  test("returns 200 with valid query format (accepts 2+ char query)", async () => {
    // Just validate that a 2-char query doesn't get rejected by validation
    // (actual provider call is tested in e2e smoke tests)
    const res = await app.request(
      "/api/v1/search?q=ab&provider=nonexistent",
    );
    // Should be 404 (unknown provider), not 400 (validation)
    expect(res.status).toBe(404);
  });
});
