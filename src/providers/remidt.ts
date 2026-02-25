import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface ReMidtSearchResult {
  id: string;
  subTitle: string;
  title: string;
}

interface ReMidtDisposal {
  date: string;
  description: string;
  fraction: string;
  symbolId: string;
  type: string;
}

const meta: ProviderMeta = {
  id: "remidt",
  name: "ReMidt",
  website: "https://remidt.no",
  coverageAreas: [
    "Kristiansund",
    "Molde",
    "Orkland",
    "Sunndal",
    "Surnadal",
    "Oppdal",
    "Smøla",
  ],
  postalRanges: [
    [6400, 6499],
    [6500, 6549],
  ],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://kalender.renovasjonsportal.no/api/address/${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ReMidt address search failed: ${res.status}`);
  }
  const data = (await res.json()) as { searchResults: ReMidtSearchResult[] };
  return data.searchResults.map((item) => ({
    locationId: item.id,
    label: [item.title, item.subTitle].filter(Boolean).join(", "),
  }));
}

async function getPickups(locationId: string) {
  const cacheKey = `remidt:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const year = new Date().getFullYear();
  const url = `https://kalender.renovasjonsportal.no/api/address/${locationId}/year?calendarYear=${year}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ReMidt calendar fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { disposals: ReMidtDisposal[] };

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

export const remidtProvider: WasteProvider = {
  id: "remidt",
  meta,
  searchAddress,
  getPickups,
};
