import { normalizePickups } from "../fractions/normalize";
import { withFallback } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface InnherredAddressResult {
  address: string;
  bNumber: string;
  gNumber: string;
  id: string;
  municipality: string;
}

interface InnherredFraction {
  dates: string[];
  fraction_id: string;
  fraction_name: string;
}

const meta: ProviderMeta = {
  id: "innherred",
  name: "Innherred Renovasjon",
  website: "https://innherredrenovasjon.no",
  coverageAreas: ["Levanger", "Verdal", "Inderøy", "Snåsa"],
  postalRanges: [[7600, 7699]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://innherredrenovasjon.no/wp-json/ir/v1/addresses/${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Innherred address search failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    data: { results: InnherredAddressResult[] };
  };
  return json.data.results.map((r) => ({
    label: `${r.address}, ${r.municipality}`,
    locationId: r.address,
  }));
}

function getPickups(locationId: string) {
  return withFallback(`innherred:${locationId}`, async () => {
    const url = `https://innherredrenovasjon.no/wp-json/ir/v1/garbage-disposal-dates-by-address?address=${encodeURIComponent(locationId)}&days=365`;
    const res = await fetch(url);
    if (!res.ok) {
      // The API returns 404 when an address has no disposal dates registered
      if (res.status === 404) {
        return [];
      }
      throw new Error(`Innherred calendar fetch failed: ${res.status}`);
    }

    const json = (await res.json()) as Record<string, InnherredFraction>;
    const today = new Date().toISOString().slice(0, 10);
    const raw: Array<{ date: string; fraction: string; fractionId: string }> =
      [];

    for (const frac of Object.values(json)) {
      for (const dt of frac.dates) {
        const date = dt.slice(0, 10);
        if (date >= today) {
          raw.push({
            date,
            fraction: frac.fraction_name,
            fractionId: frac.fraction_id,
          });
        }
      }
    }

    const pickups = normalizePickups(raw);
    pickups.sort((a, b) => a.date.localeCompare(b.date));
    return pickups;
  });
}

export const innherredProvider: WasteProvider = {
  id: "innherred",
  meta,
  searchAddress,
  getPickups,
};
