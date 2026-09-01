import type { FractionCategory } from "../providers/types";

interface CategoryInfo {
  color: string;
  displayName: string;
}

// noinspection MagicNumber
export const CATEGORIES: Record<FractionCategory, CategoryInfo> = {
  residual: { displayName: "Restavfall", color: "#71717a" },
  paper: { displayName: "Papir", color: "#3b82f6" },
  plastic: { displayName: "Plast", color: "#f59e0b" },
  food: { displayName: "Matavfall", color: "#10b981" },
  glass_metal: { displayName: "Glass og metall", color: "#0d9488" },
  hazardous: { displayName: "Farlig avfall", color: "#dc2626" },
  garden: { displayName: "Hageavfall", color: "#84cc16" },
  other: { displayName: "Annet", color: "#a1a1aa" },
};
