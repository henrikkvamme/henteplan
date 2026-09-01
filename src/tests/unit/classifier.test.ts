import { describe, expect, test } from "bun:test";
import {
  applyFractionRoutes,
  classifyFraction,
  listPendingFractionLabels,
  normalizeFractionLabel,
} from "@/fractions/classifier";

describe("fraction classifier", () => {
  test.each([
    ["Papir og plastemballasje", ["paper", "plastic"]],
    ["Mat-/restavfall", ["food", "residual"]],
    ["Mat og restavfall", ["food", "residual"]],
    ["Papir og drikkekartong", ["paper"]],
    ["Papir, papp", ["paper"]],
    ["Plastemballasje/ Plastic packaging", ["plastic"]],
    ["Restavfall/ residual waste", ["residual"]],
    ["Glas- og metallemballasje", ["glass_metal"]],
  ] as const)(
    "classifies observed provider label %s",
    (fraction, categories) => {
      expect(
        classifyFraction({ fraction, providerId: "norkart" }).categories
      ).toEqual([...categories]);
    }
  );

  test.each([
    ["Glass-/metallemb", ["glass_metal"]],
    ["Hermetikk- og glassemballasje", ["glass_metal"]],
    ["Hage", ["garden"]],
    ["Matavfall/ Organic", ["food"]],
    ["Papir/ paper", ["paper"]],
    ["Papir/Plastemballasje", ["paper", "plastic"]],
    ["Papp, papir og drikkekartong", ["paper"]],
    ["Papp, papir og kartong", ["paper"]],
    ["Papp, papir, kartong", ["paper"]],
    ["Utkjøring Plast- og matposer", ["other"]],
  ] as const)(
    "covers remaining observed fallback label %s",
    (fraction, categories) => {
      expect(
        classifyFraction({ fraction, providerId: "observed" }).categories
      ).toEqual([...categories]);
    }
  );

  test("preserves every category in compound pickups", () => {
    expect(
      classifyFraction({
        fraction: "Mat-, plast- og restavfall",
        providerId: "trv",
      })
    ).toMatchObject({
      categories: ["food", "plastic", "residual"],
      primaryCategory: "residual",
    });
  });

  test.each(["Drikkekartonger", "Juletre", "Tekstiler", "Trevirke"])(
    "routes retired zero-observation group %s to other",
    (fraction) => {
      expect(
        classifyFraction({ fraction, providerId: "test" }).categories
      ).toEqual(["other"]);
    }
  );

  test("keeps observed garden and hazardous pickups first-class", () => {
    expect(
      classifyFraction({ fraction: "Hageavfall", providerId: "renovasjonen" })
        .categories
    ).toEqual(["garden"]);
    expect(
      classifyFraction({ fraction: "Farlig avfall", providerId: "frevar" })
        .categories
    ).toEqual(["hazardous"]);
  });

  test("normalizes Unicode, whitespace, casing, and dash variants", () => {
    expect(normalizeFractionLabel("  GLASS– OG   METALLEMBALLASJE  ")).toBe(
      "glass- og metallemballasje"
    );
    expect(
      classifyFraction({
        fraction: "  GLASS– OG   METALLEMBALLASJE  ",
        providerId: "test",
      }).categories
    ).toEqual(["glass_metal"]);
  });

  test("does not infer collection categories from bag-delivery labels", () => {
    const providerId = `test-${crypto.randomUUID()}`;
    expect(
      classifyFraction({
        fraction: "Utlevering av plastsekker",
        providerId,
      })
    ).toMatchObject({ categories: ["other"], source: "pending" });
  });

  test("records unknown labels and learns a validated provider route", () => {
    const providerId = `test-${crypto.randomUUID()}`;
    const fraction = "Ny sammensatt fraksjon";

    expect(classifyFraction({ fraction, providerId }).categories).toEqual([
      "other",
    ]);
    expect(listPendingFractionLabels(100)).toContainEqual(
      expect.objectContaining({
        normalizedLabel: "ny sammensatt fraksjon",
        providerId,
      })
    );

    applyFractionRoutes([
      {
        categories: ["paper", "plastic"],
        normalizedLabel: "ny sammensatt fraksjon",
        primaryCategory: "paper",
        providerId,
        rationale: "Test-approved compound route",
      },
    ]);

    expect(classifyFraction({ fraction, providerId })).toMatchObject({
      categories: ["paper", "plastic"],
      primaryCategory: "paper",
      source: "codex",
    });
    expect(listPendingFractionLabels(100)).not.toContainEqual(
      expect.objectContaining({ providerId })
    );
  });

  test("rejects invalid learned routes", () => {
    expect(() =>
      applyFractionRoutes([
        {
          categories: ["paper"],
          normalizedLabel: "invalid primary route",
          primaryCategory: "plastic",
          providerId: "test",
          rationale: "Primary category is not represented",
        },
      ])
    ).toThrow("Primary category must be included in categories");

    expect(() =>
      applyFractionRoutes([
        {
          categories: ["other", "paper"],
          normalizedLabel: "invalid other route",
          primaryCategory: "other",
          providerId: "test",
          rationale: "Other must never hide a concrete category",
        },
      ])
    ).toThrow("Other cannot be combined with a specific category");
  });
});
