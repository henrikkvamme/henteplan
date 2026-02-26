import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface OsloService {
  Fraksjon: { Id: number; Tekst: string };
  Hyppighet: { Faktor: number; Tekst: string };
  TommeDato: string;
  TommeUkedag: string;
}

interface OsloHentePunkt {
  Tjenester: OsloService[];
}

interface OsloResult {
  HentePunkts: OsloHentePunkt[];
}

interface OsloResponse {
  result: OsloResult[];
}

interface GeonorgeAddress {
  adressekode: number;
  adressenavn: string;
  bokstav?: string;
  kommunenavn: string;
  kommunenummer: string;
  nummer: number;
  postnummer: string;
  poststed: string;
}

interface GeonorgeResponse {
  adresser: GeonorgeAddress[];
}

function parseOsloDate(dateStr: string): string {
  const [day, month, year] = dateStr.split(".");
  return `${year}-${month}-${day}`;
}

const OSLO_FREQ_RE = /(\d+)\.\s*uke/;

// noinspection MagicNumber
function generateOsloDates(nextDateIso: string, frequency: string): string[] {
  const dates: string[] = [nextDateIso];
  const start = new Date(nextDateIso);

  const weekMatch = frequency.match(OSLO_FREQ_RE);
  let intervalWeeks: number;
  if (weekMatch) {
    intervalWeeks = Number(weekMatch[1]);
  } else if (frequency.toLowerCase().includes("uke")) {
    intervalWeeks = 1;
  } else {
    intervalWeeks = 2;
  }

  const intervalMs = intervalWeeks * 7 * 24 * 60 * 60 * 1000;
  const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;
  const endDate = Date.now() + sixMonthsMs;

  let current = start.getTime() + intervalMs;
  while (current <= endDate) {
    dates.push(new Date(current).toISOString().slice(0, 10));
    current += intervalMs;
  }

  return dates;
}

const meta: ProviderMeta = {
  id: "oslo",
  name: "Oslo Kommune",
  website: "https://oslo.kommune.no",
  coverageAreas: ["Oslo"],
  postalRanges: [[1, 1299]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const params = new URLSearchParams({
    sok: query,
    kommunenummer: "0301",
    filtrer:
      "adresser.kommunenummer,adresser.adressenavn,adresser.adressekode,adresser.nummer,adresser.bokstav,adresser.kommunenavn,adresser.postnummer,adresser.poststed",
  });
  const res = await fetch(
    `https://ws.geonorge.no/adresser/v1/sok?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Oslo address search failed: ${res.status}`);
  }
  const data = (await res.json()) as GeonorgeResponse;
  return data.adresser.map((a) => ({
    locationId: `${a.adressenavn}|${a.adressekode}|${a.nummer}|${a.bokstav ?? ""}`,
    label: `${a.adressenavn} ${a.nummer}${a.bokstav ?? ""}, ${a.postnummer} ${a.poststed}`,
  }));
}

async function getPickups(locationId: string) {
  const cacheKey = `oslo:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const parts = locationId.split("|");
  const street = parts[0] ?? "";
  const streetId = parts[1] ?? "";
  const number = parts[2] ?? "";
  const letter = parts[3] ?? "";
  const params = new URLSearchParams({
    street,
    number,
    letter,
    street_id: streetId,
  });
  const res = await fetch(
    `https://www.oslo.kommune.no/actions/snap-lib-waste-complaint/search-by-address?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Oslo calendar fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as OsloResponse;
  const services = data.result.flatMap((r) =>
    r.HentePunkts.flatMap((hp) => hp.Tjenester)
  );

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    services.flatMap((svc) => {
      const nextDateIso = parseOsloDate(svc.TommeDato);
      const dates = generateOsloDates(nextDateIso, svc.Hyppighet.Tekst);
      return dates
        .filter((d) => d >= today)
        .map((d) => ({
          date: d,
          fraction: svc.Fraksjon.Tekst,
          fractionId: String(svc.Fraksjon.Id),
        }));
    })
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const osloProvider: WasteProvider = {
  id: "oslo",
  meta,
  searchAddress,
  getPickups,
};
