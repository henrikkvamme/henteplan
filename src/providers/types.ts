export type FractionCategory =
  | "carton"
  | "christmas_tree"
  | "food"
  | "garden"
  | "glass_metal"
  | "hazardous"
  | "other"
  | "paper"
  | "plastic"
  | "residual"
  | "textile"
  | "wood";

export interface WastePickup {
  /** Normalized canonical category ID */
  category: FractionCategory;
  /** Hex color for the category */
  color: string;
  /** ISO date string, e.g. "2026-03-05" */
  date: string;
  /** Human-readable fraction name from the provider */
  fraction: string;
  /** Provider-specific fraction identifier */
  fractionId: string;
}

export interface AddressMatch {
  label: string;
  locationId: string;
}

export interface ProviderMeta {
  coverageAreas: string[];
  id: string;
  name: string;
  postalRanges: [number, number][];
  website: string;
}

export interface WasteProvider {
  getPickups(locationId: string): Promise<WastePickup[]>;
  id: string;
  meta: ProviderMeta;
  searchAddress(query: string): Promise<AddressMatch[]>;
}
