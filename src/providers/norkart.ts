import { normalizePickups } from "../fractions/normalize";
import { withFallback, withGenericFallback } from "./cache";
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

export function getNorkartCustomerNames(): Promise<string[]> {
  return withGenericFallback("norkart:customers", CUSTOMER_CACHE_TTL, async () => {
    const res = await fetch(
      "https://www.webatlas.no/wacloud/servicerepository/CatalogueService.svc/json/GetRegisteredAppCustomers?Appid=MobilOS-NorkartRenovasjon"
    );
    if (!res.ok) {
      throw new Error(`Norkart customer list failed: ${res.status}`);
    }
    const customers = (await res.json()) as NorkartCustomer[];
    return customers
      .filter((c) => c.Name != null)
      .map((c) => c.Name.toLowerCase());
  });
}

const meta: ProviderMeta = {
  id: "norkart",
  name: "MinRenovasjon (Norkart)",
  website: "https://www.norkart.no",
  coverageAreas: ["~198 kommuner"],
  postalRanges: [],
};

const GEONORGE_FILTER =
  "adresser.kommunenummer,adresser.adressenavn,adresser.adressekode,adresser.nummer,adresser.kommunenavn,adresser.postnummer,adresser.poststed";

function toAddressMatches(addresses: GeonorgeAddress[]): AddressMatch[] {
  return addresses.map((a) => ({
    locationId: `${a.kommunenummer}|${a.adressenavn}|${a.adressekode}|${a.nummer}`,
    label: `${a.adressenavn} ${a.nummer}, ${a.postnummer} ${a.poststed} (${a.kommunenavn})`,
  }));
}

async function geonorgeSok(
  params: Record<string, string>
): Promise<GeonorgeAddress[]> {
  const searchParams = new URLSearchParams({
    ...params,
    filtrer: GEONORGE_FILTER,
  });
  const res = await fetch(
    `https://ws.geonorge.no/adresser/v1/sok?${searchParams.toString()}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as GeonorgeResponse;
  return data.adresser;
}

function detectMunicipality(
  query: string,
  customers: string[]
): { municipality: string; addressPart: string } | null {
  const words = query.trim().split(/\s+/);
  // Try matching last 2 words, then last 1 word against customer list
  for (let n = Math.min(2, words.length - 1); n >= 1; n--) {
    const candidate = words.slice(-n).join(" ").toLowerCase();
    if (customers.includes(candidate)) {
      return {
        municipality: words.slice(-n).join(" "),
        addressPart: words.slice(0, -n).join(" "),
      };
    }
  }
  return null;
}

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const customers = await getNorkartCustomerNames();

  // Step 1: Exact search with fuzzy matching
  const addresses = await geonorgeSok({ sok: query, fuzzy: "true" });
  const filtered = addresses.filter((a) =>
    customers.includes(a.kommunenavn.toLowerCase())
  );
  if (filtered.length > 0) {
    return toAddressMatches(filtered);
  }

  // Step 2: Detect municipality name in query and use structured search
  const detected = detectMunicipality(query, customers);
  if (!detected) return [];

  const { municipality, addressPart } = detected;
  // Try with full address part (e.g. "Storgata 1")
  const step2 = await geonorgeSok({
    sok: addressPart,
    kommunenavn: municipality,
    fuzzy: "true",
  });
  const filtered2 = step2.filter((a) =>
    customers.includes(a.kommunenavn.toLowerCase())
  );
  if (filtered2.length > 0) {
    return toAddressMatches(filtered2);
  }

  // Step 3: Try without house number (e.g. "Storgata")
  const streetOnly = addressPart.replace(/\s+\d+\s*$/, "").trim();
  if (streetOnly && streetOnly !== addressPart) {
    const step3 = await geonorgeSok({
      sok: streetOnly,
      kommunenavn: municipality,
      fuzzy: "true",
    });
    const filtered3 = step3.filter((a) =>
      customers.includes(a.kommunenavn.toLowerCase())
    );
    if (filtered3.length > 0) {
      return toAddressMatches(filtered3);
    }
  }

  // Step 4: Wildcard prefix search on street name
  if (streetOnly && streetOnly.length >= 4) {
    const prefix = streetOnly.substring(0, 4);
    const step4 = await geonorgeSok({
      "adressenavn": `${prefix}*`,
      kommunenavn: municipality,
    });
    const filtered4 = step4.filter((a) =>
      customers.includes(a.kommunenavn.toLowerCase())
    );
    if (filtered4.length > 0) {
      return toAddressMatches(filtered4);
    }
  }

  return [];
}

// noinspection MagicNumber
function getPickups(locationId: string) {
  return withFallback(`norkart:${locationId}`, async () => {
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
    const calBody = (await calRes.json()) as
      | NorkartCalendarEntry[]
      | { Tommedatoer: NorkartCalendarEntry[] };
    const calendar = Array.isArray(calBody) ? calBody : calBody.Tommedatoer;

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
    return pickups;
  });
}

export const norkartProvider: WasteProvider = {
  id: "norkart",
  meta,
  searchAddress,
  getPickups,
};
