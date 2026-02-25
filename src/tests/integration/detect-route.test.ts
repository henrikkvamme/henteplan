import { describe, expect, test } from "bun:test";
import { app } from "../setup";

describe("GET /api/v1/detect", () => {
  test("detects provider by postal code", async () => {
    const res = await app.request("/api/v1/detect?postalCode=7013");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.provider).not.toBeNull();
    expect(data.provider.id).toBe("trv");
  });

  test("detects provider by city", async () => {
    const res = await app.request("/api/v1/detect?city=Bergen");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.provider).not.toBeNull();
    expect(data.provider.id).toBe("bir");
  });

  test("returns null for unknown location", async () => {
    const res = await app.request(
      "/api/v1/detect?postalCode=9999&city=Ukjentby",
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.provider).toBeNull();
  });

  test("returns 200 with no params (both null)", async () => {
    const res = await app.request("/api/v1/detect");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.provider).toBeNull();
  });
});
