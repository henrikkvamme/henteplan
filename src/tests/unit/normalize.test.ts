import { describe, expect, test } from "bun:test";
import { CATEGORIES } from "@/fractions/categories";
import { normalizeCategory, normalizePickups } from "@/fractions/normalize";
import { VALID_CATEGORIES } from "../setup";

describe("normalizeCategory", () => {
  test("maps known fractions correctly", () => {
    expect(normalizeCategory("restavfall")).toBe("residual");
    expect(normalizeCategory("papir")).toBe("paper");
    expect(normalizeCategory("plastemballasje")).toBe("plastic");
    expect(normalizeCategory("matavfall")).toBe("food");
    expect(normalizeCategory("glass og metallemballasje")).toBe("glass_metal");
    expect(normalizeCategory("drikkekartonger")).toBe("carton");
    expect(normalizeCategory("farlig avfall")).toBe("hazardous");
    expect(normalizeCategory("tekstiler")).toBe("textile");
    expect(normalizeCategory("hageavfall")).toBe("garden");
    expect(normalizeCategory("juletre")).toBe("christmas_tree");
    expect(normalizeCategory("trevirke")).toBe("wood");
  });

  test("is case insensitive", () => {
    expect(normalizeCategory("Restavfall")).toBe("residual");
    expect(normalizeCategory("PAPIR")).toBe("paper");
    expect(normalizeCategory("Matavfall")).toBe("food");
    expect(normalizeCategory("Glass Og Metallemballasje")).toBe("glass_metal");
  });

  test("returns 'other' for unknown fractions", () => {
    expect(normalizeCategory("ukjent")).toBe("other");
    expect(normalizeCategory("")).toBe("other");
    expect(normalizeCategory("something random")).toBe("other");
  });

  test("handles alternate spellings", () => {
    expect(normalizeCategory("rest")).toBe("residual");
    expect(normalizeCategory("papp og papir")).toBe("paper");
    expect(normalizeCategory("bioavfall")).toBe("food");
    expect(normalizeCategory("glass- og metallemballasje")).toBe("glass_metal");
    expect(normalizeCategory("tekstil")).toBe("textile");
    expect(normalizeCategory("plast")).toBe("plastic");
    expect(normalizeCategory("mat")).toBe("food");
  });
});

describe("normalizePickups", () => {
  test("adds category and color to raw pickups", () => {
    const raw = [
      { date: "2026-03-05", fraction: "Restavfall", fractionId: "1" },
      { date: "2026-03-06", fraction: "Papir", fractionId: "2" },
    ];
    const result = normalizePickups(raw);

    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("residual");
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
    const result = normalizePickups(raw);

    expect(result[0].category).toBe("other");
    expect(result[0].color).toBe(CATEGORIES.other.color);
  });

  test("handles empty array", () => {
    expect(normalizePickups([])).toEqual([]);
  });

  test("all categories have valid colors", () => {
    for (const category of VALID_CATEGORIES) {
      expect(CATEGORIES[category]).toBeDefined();
      expect(CATEGORIES[category].color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
