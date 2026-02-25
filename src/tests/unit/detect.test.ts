import { afterEach, describe, expect, mock, test } from "bun:test";

// Mock getNorkartCustomerNames before importing detectProvider
// Must re-export all original exports to avoid breaking other modules
const originalModule = await import("@/providers/norkart");
const mockGetCustomerNames = mock(() =>
  Promise.resolve(["lillestrøm", "hamar", "gjøvik"]),
);

mock.module("@/providers/norkart", () => ({
  ...originalModule,
  getNorkartCustomerNames: mockGetCustomerNames,
}));

const { detectProvider } = await import("@/detection/detect");

afterEach(() => {
  mockGetCustomerNames.mockClear();
});

describe("detectProvider", () => {
  describe("postal code detection", () => {
    test("detects trv by postal code", async () => {
      expect(await detectProvider("7013", null)).toBe("trv");
    });

    test("detects bir by postal code", async () => {
      expect(await detectProvider("5003", null)).toBe("bir");
    });

    test("detects oslo by postal code", async () => {
      expect(await detectProvider("0150", null)).toBe("oslo");
    });

    test("detects avfallsor by postal code", async () => {
      expect(await detectProvider("4612", null)).toBe("avfallsor");
    });

    test("detects him by postal code", async () => {
      expect(await detectProvider("5527", null)).toBe("him");
    });

    test("detects remidt by postal code", async () => {
      expect(await detectProvider("6413", null)).toBe("remidt");
    });

    test("detects fosen by postal code", async () => {
      expect(await detectProvider("7130", null)).toBe("fosen");
    });

    test("detects frevar by postal code", async () => {
      expect(await detectProvider("1601", null)).toBe("frevar");
    });

    test("detects iris by postal code", async () => {
      expect(await detectProvider("8006", null)).toBe("iris");
    });

    test("detects rfd by postal code", async () => {
      expect(await detectProvider("3015", null)).toBe("rfd");
    });

    test("detects renovasjonen by postal code", async () => {
      expect(await detectProvider("4006", null)).toBe("renovasjonen");
    });

    test("detects innherred by postal code", async () => {
      expect(await detectProvider("7600", null)).toBe("innherred");
    });
  });

  describe("city detection", () => {
    test("detects trv by city name", async () => {
      expect(await detectProvider(null, "Trondheim")).toBe("trv");
    });

    test("detects bir by city name", async () => {
      expect(await detectProvider(null, "Bergen")).toBe("bir");
    });

    test("detects oslo by city name", async () => {
      expect(await detectProvider(null, "Oslo")).toBe("oslo");
    });

    test("is case insensitive", async () => {
      expect(await detectProvider(null, "TRONDHEIM")).toBe("trv");
      expect(await detectProvider(null, "bergen")).toBe("bir");
      expect(await detectProvider(null, "OSLO")).toBe("oslo");
    });

    test("detects renovasjonen for Stavanger", async () => {
      expect(await detectProvider(null, "Stavanger")).toBe("renovasjonen");
    });

    test("detects renovasjonen for Sandnes", async () => {
      expect(await detectProvider(null, "Sandnes")).toBe("renovasjonen");
    });
  });

  describe("norkart fallback", () => {
    test("falls back to norkart when city matches customer list", async () => {
      expect(await detectProvider(null, "Lillestrøm")).toBe("norkart");
      expect(mockGetCustomerNames).toHaveBeenCalled();
    });

    test("returns null for unknown city not in norkart list", async () => {
      expect(await detectProvider(null, "Ukjentby")).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("returns null when both postal and city are null", async () => {
      expect(await detectProvider(null, null)).toBeNull();
    });

    test("returns null for invalid postal code", async () => {
      expect(await detectProvider("9999", null)).toBeNull();
    });
  });
});
