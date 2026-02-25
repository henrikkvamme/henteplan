import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface FosenSearchResult {
  id: string;
  subTitle: string;
  title: string;
}

interface FosenDisposal {
  date: string;
  description: string;
  fraction: string;
  symbolId: string;
  type: string;
}

const meta: ProviderMeta = {
  id: "fosen",
  name: "Fosen Renovasjon",
  website: "https://fosen.no",
  coverageAreas: ["Indre Fosen", "Orland", "Afjord"],
  postalRanges: [[7100, 7180]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://fosen.renovasjonsportal.no/api/address/${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fosen address search failed: ${res.status}`);
  }
  const data = (await res.json()) as { searchResults: FosenSearchResult[] };
  return data.searchResults.map((item) => ({
    locationId: item.id,
    label: [item.title, item.subTitle].filter(Boolean).join(", "),
  }));
}

async function getPickups(locationId: string) {
  const cacheKey = `fosen:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const year = new Date().getFullYear();
  const url = `https://fosen.renovasjonsportal.no/api/address/${locationId}/year?calendarYear=${year}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fosen calendar fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { disposals: FosenDisposal[] };

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    data.disposals
      .filter((d) => d.date.slice(0, 10) >= today)
      .map((d) => ({
        date: d.date.slice(0, 10),
        fraction: d.fraction,
        fractionId: d.symbolId,
      }))
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const fosenProvider: WasteProvider = {
  id: "fosen",
  meta,
  searchAddress,
  getPickups,
};
