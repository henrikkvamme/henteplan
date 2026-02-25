import type { FractionCategory, WastePickup } from "../providers/types";
import { CATEGORIES } from "./categories";

const FRACTION_MAP: Record<string, FractionCategory> = {
  // Residual waste
  restavfall: "residual",
  rest: "residual",
  "mat-, plast- og restavfall": "residual",

  // Paper
  papir: "paper",
  "papp og papir": "paper",
  "papp- og papiravfall": "paper",
  "papir og plast": "paper",
  "papp/papir": "paper",
  papiravfall: "paper",

  // Plastic
  plastemballasje: "plastic",
  plast: "plastic",

  // Food/organic
  matavfall: "food",
  bioavfall: "food",
  mat: "food",

  // Glass & metal
  "glass og metallemballasje": "glass_metal",
  "glass- og metallemballasje": "glass_metal",
  "glass og metall": "glass_metal",
  "glass/metallemballasje": "glass_metal",

  // Carton
  drikkekartonger: "carton",

  // Hazardous
  "farlig avfall": "hazardous",

  // Textile
  tekstiler: "textile",
  tekstil: "textile",

  // Garden
  hageavfall: "garden",

  // Christmas tree
  juletre: "christmas_tree",

  // Wood
  trevirke: "wood",
};

export function normalizeCategory(fraction: string): FractionCategory {
  return FRACTION_MAP[fraction.toLowerCase()] ?? "other";
}

export function normalizePickups(
  raw: Array<{ date: string; fraction: string; fractionId: string }>
): WastePickup[] {
  return raw.map((p) => {
    const category = normalizeCategory(p.fraction);
    return {
      ...p,
      category,
      color: CATEGORIES[category].color,
    };
  });
}
