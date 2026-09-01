import { describe, expect, test } from "bun:test";
import { CATEGORIES } from "@/fractions/categories";
import { classifyFraction, normalizePickups } from "@/fractions/classifier";
import { VALID_CATEGORIES } from "../setup";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

describe("classifyFraction", () => {
  test("maps known fractions correctly", () => {
    const category = (fraction: string) =>
      classifyFraction({ fraction, providerId: "test" }).primaryCategory;
    expect(category("restavfall")).toBe("residual");
    expect(category("papir")).toBe("paper");
    expect(category("plastemballasje")).toBe("plastic");
    expect(category("matavfall")).toBe("food");
    expect(category("glass og metallemballasje")).toBe("glass_metal");
    expect(category("farlig avfall")).toBe("hazardous");
    expect(category("hageavfall")).toBe("garden");
  });

  test("is case insensitive", () => {
    const category = (fraction: string) =>
      classifyFraction({ fraction, providerId: "test" }).primaryCategory;
    expect(category("Restavfall")).toBe("residual");
    expect(category("PAPIR")).toBe("paper");
    expect(category("Matavfall")).toBe("food");
    expect(category("Glass Og Metallemballasje")).toBe("glass_metal");
  });

  test("returns 'other' for unknown fractions", () => {
    const category = (fraction: string) =>
      classifyFraction({ fraction, providerId: "test" }).primaryCategory;
    expect(category("ukjent")).toBe("other");
    expect(category("")).toBe("other");
    expect(category("something random")).toBe("other");
  });

  test("handles alternate spellings", () => {
    const category = (fraction: string) =>
      classifyFraction({ fraction, providerId: "test" }).primaryCategory;
    expect(category("rest")).toBe("residual");
    expect(category("papp og papir")).toBe("paper");
    expect(category("bioavfall")).toBe("food");
    expect(category("glass- og metallemballasje")).toBe("glass_metal");
    expect(category("plast")).toBe("plastic");
    expect(category("mat")).toBe("food");
  });

  test("preserves every waste type in compound provider fractions", () => {
    const categories = (fraction: string) =>
      classifyFraction({ fraction, providerId: "test" }).categories;
    expect(categories("Mat-, plast- og restavfall")).toEqual([
      "food",
      "plastic",
      "residual",
    ]);
    expect(categories("Papir og plast")).toEqual(["paper", "plastic"]);
    expect(categories("Glass og metall")).toEqual(["glass_metal"]);
  });
});

describe("normalizePickups", () => {
  test("adds category and color to raw pickups", () => {
    const raw = [
      { date: "2026-03-05", fraction: "Restavfall", fractionId: "1" },
      { date: "2026-03-06", fraction: "Papir", fractionId: "2" },
    ];
    const result = normalizePickups("test", raw);

    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("residual");
    expect(result[0].categories).toEqual(["residual"]);
    expect(result[0].color).toBe(CATEGORIES.residual.color);
    expect(result[0].date).toBe("2026-03-05");
    expect(result[0].fraction).toBe("Restavfall");
    expect(result[0].fractionId).toBe("1");

    expect(result[1].category).toBe("paper");
    expect(result[1].color).toBe(CATEGORIES.paper.color);
  });

  test("assigns 'other' category with correct color for unknown fractions", () => {
    const raw = [
      { date: "2026-04-01", fraction: "Spesialavfall", fractionId: "99" },
    ];
    const result = normalizePickups("test", raw);

    expect(result[0].category).toBe("other");
    expect(result[0].color).toBe(CATEGORIES.other.color);
  });

  test("handles empty array", () => {
    expect(normalizePickups("test", [])).toEqual([]);
  });

  test("all categories have valid colors", () => {
    for (const category of VALID_CATEGORIES) {
      expect(CATEGORIES[category]).toBeDefined();
      expect(CATEGORIES[category].color).toMatch(HEX_COLOR);
    }
  });
});
