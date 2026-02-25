import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface HimAddress {
  adresse: string;
  bNr: number;
  fNr: number;
  gNr: number;
  id: string;
  kommune: string;
  kommuneNr: string;
  sNr: number;
}

interface HimPickupEntry {
  dato: string;
  fraksjon: string;
  fraksjonId: string;
  frekvensIntervall: number;
  frekvensType: string;
}

const meta: ProviderMeta = {
  id: "him",
  name: "HIM",
  website: "https://him.as",
  coverageAreas: [
    "Haugesund",
    "Karmøy",
    "Tysvær",
    "Bokn",
    "Vindafjord",
    "Etne",
  ],
  postalRanges: [[5500, 5599]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://him.as/wp-json/him/eiendommer?adresse=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HIM address search failed: ${res.status}`);
  }
  const data = (await res.json()) as HimAddress[];
  return data.map((item) => ({
    locationId: item.id,
    label: `${item.adresse}, ${item.kommune}`,
  }));
}

// noinspection MagicNumber
async function getPickups(locationId: string) {
  const cacheKey = `him:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const url = `https://him.as/wp-json/him/tomminger?eiendomId=${encodeURIComponent(locationId)}&datoFra=${from}&datoTil=${to}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HIM calendar fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as HimPickupEntry[];

  const pickups = normalizePickups(
    data.map((e) => ({
      date: e.dato.slice(0, 10),
      fraction: e.fraksjon,
      fractionId: e.fraksjonId,
    }))
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const himProvider: WasteProvider = {
  id: "him",
  meta,
  searchAddress,
  getPickups,
};
