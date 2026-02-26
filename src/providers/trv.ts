import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface TrvAddressResult {
  adresse: string;
  id: string;
}

interface TrvCalendarEntry {
  dato: string;
  fraksjon: string;
  fraksjonId: string;
}

const meta: ProviderMeta = {
  id: "trv",
  name: "Trondheim Renholdsverk",
  website: "https://trv.no",
  coverageAreas: ["Trondheim"],
  postalRanges: [[7000, 7099]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://trv.no/wp-json/wasteplan/v3/adress?s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TRV address search failed: ${res.status}`);
  }
  const data = (await res.json()) as TrvAddressResult[];
  return data.map((item) => ({
    locationId: item.id,
    label: item.adresse,
  }));
}

async function getPickups(locationId: string) {
  const cacheKey = `trv:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `https://trv.no/wp-json/wasteplan/v2/calendar/${locationId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TRV calendar fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { calendar: TrvCalendarEntry[] };

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    json.calendar
      .filter((e) => e.dato >= today)
      .map((e) => ({
        date: e.dato.slice(0, 10),
        fraction: e.fraksjon,
        fractionId: e.fraksjonId,
      }))
  );

  setCache(cacheKey, pickups);
  return pickups;
}

export const trvProvider: WasteProvider = {
  id: "trv",
  meta,
  searchAddress,
  getPickups,
};
