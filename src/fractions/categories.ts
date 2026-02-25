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
  carton: { displayName: "Drikkekartonger", color: "#fb923c" },
  hazardous: { displayName: "Farlig avfall", color: "#dc2626" },
  textile: { displayName: "Tekstil", color: "#a855f7" },
  garden: { displayName: "Hageavfall", color: "#84cc16" },
  christmas_tree: { displayName: "Juletre", color: "#15803d" },
  wood: { displayName: "Trevirke", color: "#65a30d" },
  other: { displayName: "Annet", color: "#a1a1aa" },
};
