import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

const RFD_SERVICE = "https://www.rfd.no/_/service/com.enonic.app.rfd";

// noinspection MagicNumber
const RFD_FRACTION_MAP: Record<number, string> = {
  1: "Matavfall",
  2: "Papiravfall",
  3: "Restavfall",
  4: "Glass- og metallemballasje",
  5: "Glass- og metallemballasje",
  7: "Plastemballasje",
  11: "Plastemballasje",
};

interface RfdAddress {
  AdresseBokstav: string;
  AdresseHusNummer: number;
  GateId: string;
  GateNavn: string;
  KommuneNavn: string;
  KommuneNummer: number;
  PostNummer: string;
  PostSted: string;
  Text: string;
}

interface RfdFetchDay {
  fraksjonId: number;
  tommedatoer: string[];
}

const meta: ProviderMeta = {
  id: "rfd",
  name: "RfD",
  website: "https://rfd.no",
  coverageAreas: ["Drammen", "Lier", "Øvre Eiker", "Modum"],
  postalRanges: [[3000, 3099]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const params = new URLSearchParams({
    address: query,
    size: "10",
    type: "pickup",
  });
  const url = `${RFD_SERVICE}/addressLookup?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RfD address search failed: ${res.status}`);
  }
  const data = (await res.json()) as { addresses: RfdAddress[] };
  return data.addresses.map((a) => ({
    locationId: `${a.KommuneNummer}|${a.GateId}|${a.GateNavn}|${a.AdresseHusNummer}|${a.AdresseBokstav}`,
    label: `${a.Text}, ${a.PostNummer} ${a.PostSted}`,
  }));
}

async function getPickups(locationId: string) {
  const cacheKey = `rfd:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const [regionId, streetCode, street, houseNumber, letter] =
    locationId.split("|");
  const params = new URLSearchParams({
    region_id: regionId ?? "",
    street_code: streetCode ?? "",
    street: street ?? "",
    house_number: houseNumber ?? "",
    address_letter: letter ?? "",
    pickupLimit: "500",
  });
  const url = `${RFD_SERVICE}/pickupDays?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RfD calendar fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { fetchDays: RfdFetchDay[] };

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    data.fetchDays.flatMap((entry) => {
      const fraction =
        RFD_FRACTION_MAP[entry.fraksjonId] ?? `Fraksjon ${entry.fraksjonId}`;
      return entry.tommedatoer
        .map((d) => d.slice(0, 10))
        .filter((d) => d >= today)
        .map((d) => ({
          date: d,
          fraction,
          fractionId: String(entry.fraksjonId),
        }));
    })
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const rfdProvider: WasteProvider = {
  id: "rfd",
  meta,
  searchAddress,
  getPickups,
};
