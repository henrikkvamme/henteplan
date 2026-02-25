import { describe, expect, test } from "bun:test";
import { app } from "../setup";

describe("GET /api/v1/schedule", () => {
  test("returns 400 for missing provider", async () => {
    const res = await app.request("/api/v1/schedule?locationId=123");
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing locationId", async () => {
    const res = await app.request("/api/v1/schedule?provider=trv");
    expect(res.status).toBe(400);
  });

  test("returns 404 for unknown provider", async () => {
    const res = await app.request(
      "/api/v1/schedule?provider=nonexistent&locationId=123",
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("PROVIDER_NOT_FOUND");
  });
});
