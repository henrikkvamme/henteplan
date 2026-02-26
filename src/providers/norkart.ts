import { normalizePickups } from "../fractions/normalize";
import {
  getCached,
  getCachedGeneric,
  setCache,
  setCacheGeneric,
} from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

// noinspection SpellCheckingInspection
const NORKART_APP_KEY = "AE13DEEC-804F-4615-A74E-B4FAC11F0A30";
const NORKART_PROXY =
  "https://norkartrenovasjon.azurewebsites.net/proxyserver.ashx";
const NORKART_API = "https://komteksky.norkart.no/MinRenovasjon.Api/api";

interface NorkartCustomer {
  Name: string;
  Number: string;
}

interface GeonorgeAddress {
  adressekode: number;
  adressenavn: string;
  kommunenavn: string;
  kommunenummer: string;
  nummer: number;
  postnummer: string;
  poststed: string;
}

interface GeonorgeResponse {
  adresser: GeonorgeAddress[];
}

interface NorkartFraction {
  Id: number;
  Navn: string;
}

interface NorkartCalendarEntry {
  FraksjonId: number;
  Tommedatoer: string[];
}

// noinspection MagicNumber
const CUSTOMER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getNorkartCustomerNames(): Promise<string[]> {
  const cached = getCachedGeneric<string[]>("norkart:customers");
  if (cached) {
    return cached;
  }

  const res = await fetch(
    "https://www.webatlas.no/wacloud/servicerepository/CatalogueService.svc/json/GetRegisteredAppCustomers?Appid=MobilOS-NorkartRenovasjon"
  );
  if (!res.ok) {
    throw new Error(`Norkart customer list failed: ${res.status}`);
  }
  const customers = (await res.json()) as NorkartCustomer[];
  const names = customers.map((c) => c.Name.toLowerCase());

  setCacheGeneric("norkart:customers", names, CUSTOMER_CACHE_TTL);
  return names;
}

const meta: ProviderMeta = {
  id: "norkart",
  name: "MinRenovasjon (Norkart)",
  website: "https://www.norkart.no",
  coverageAreas: ["~198 kommuner"],
  postalRanges: [],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const customers = await getNorkartCustomerNames();

  const params = new URLSearchParams({
    sok: query,
    filtrer:
      "adresser.kommunenummer,adresser.adressenavn,adresser.adressekode,adresser.nummer,adresser.kommunenavn,adresser.postnummer,adresser.poststed",
  });
  const res = await fetch(
    `https://ws.geonorge.no/adresser/v1/sok?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Norkart address search failed: ${res.status}`);
  }
  const data = (await res.json()) as GeonorgeResponse;

  return data.adresser
    .filter((a) => customers.includes(a.kommunenavn.toLowerCase()))
    .map((a) => ({
      locationId: `${a.kommunenummer}|${a.adressenavn}|${a.adressekode}|${a.nummer}`,
      label: `${a.adressenavn} ${a.nummer}, ${a.postnummer} ${a.poststed} (${a.kommunenavn})`,
    }));
}

// noinspection MagicNumber
async function getPickups(locationId: string) {
  const cacheKey = `norkart:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const parts = locationId.split("|");
  const kommunenr = parts[0] ?? "";
  const gatenavn = parts[1] ?? "";
  const gatekode = parts[2] ?? "";
  const husnr = parts[3] ?? "";
  const headers = {
    Kommunenr: kommunenr,
    RenovasjonAppKey: NORKART_APP_KEY,
  };

  // Fetch fractions to map IDs to names
  const fractionsRes = await fetch(
    `${NORKART_PROXY}?server=${encodeURIComponent(`${NORKART_API}/fraksjoner`)}`,
    { headers }
  );
  if (!fractionsRes.ok) {
    throw new Error(`Norkart fractions fetch failed: ${fractionsRes.status}`);
  }
  const fractions = (await fractionsRes.json()) as NorkartFraction[];
  const fractionMap = new Map(fractions.map((f) => [f.Id, f.Navn]));

  // Fetch calendar
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const calendarUrl = `${NORKART_API}/tommekalender/?gatenavn=${encodeURIComponent(gatenavn)}&gatekode=${gatekode}&husnr=${husnr}&fraDato=${from}&dato=${to}&api-version=2`;
  const calRes = await fetch(
    `${NORKART_PROXY}?server=${encodeURIComponent(calendarUrl)}`,
    { headers }
  );
  if (!calRes.ok) {
    throw new Error(`Norkart calendar fetch failed: ${calRes.status}`);
  }
  const calendar = (await calRes.json()) as NorkartCalendarEntry[];

  const today = from;
  const pickups = normalizePickups(
    calendar.flatMap((entry) => {
      const fractionName =
        fractionMap.get(entry.FraksjonId) ?? `Fraksjon ${entry.FraksjonId}`;
      return entry.Tommedatoer.filter((d) => d.slice(0, 10) >= today).map(
        (d) => ({
          date: d.slice(0, 10),
          fraction: fractionName,
          fractionId: String(entry.FraksjonId),
        })
      );
    })
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const norkartProvider: WasteProvider = {
  id: "norkart",
  meta,
  searchAddress,
  getPickups,
};
