import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface AvfallSorAddress {
  href: string;
  label: string;
  value: string;
}

interface AvfallSorCollectionItem {
  dato: string;
  fraksjon: string;
  fraksjonId: string;
}

interface AvfallSorCalendar {
  collections: { dateIndex: string; items: AvfallSorCollectionItem[] }[];
}

const TRAILING_SLASH_RE = /\/$/;

const meta: ProviderMeta = {
  id: "avfallsor",
  name: "Avfall Sør",
  website: "https://avfallsor.no",
  coverageAreas: ["Kristiansand", "Vennesla"],
  postalRanges: [[4600, 4699]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://avfallsor.no/wp-json/addresses/v1/address?lookup_term=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Avfall Sør address search failed: ${res.status}`);
  }
  const data = (await res.json()) as AvfallSorAddress[];
  return data.map((item) => {
    const segments = item.href.replace(TRAILING_SLASH_RE, "").split("/");
    const uuid = segments.at(-1) ?? item.value;
    return { locationId: uuid, label: item.label };
  });
}

async function getPickups(locationId: string) {
  const cacheKey = `avfallsor:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `https://avfallsor.no/wp-json/pickup-calendar/v1/collections/property-id/${locationId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Avfall Sør calendar fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as AvfallSorCalendar;

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    data.collections
      .flatMap((c) => c.items)
      .filter((item) => item.dato >= today)
      .map((item) => ({
        date: item.dato.slice(0, 10),
        fraction: item.fraksjon,
        fractionId: item.fraksjonId,
      }))
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const avfallsorProvider: WasteProvider = {
  id: "avfallsor",
  meta,
  searchAddress,
  getPickups,
};
