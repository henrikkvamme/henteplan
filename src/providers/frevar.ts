import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

const FREVAR_BASE =
  "https://arcgis.fredrikstad.kommune.no/server/rest/services";

// noinspection MagicNumber
const FREVAR_AVFALL_MAP: Record<number, string> = {
  1: "Restavfall",
  2: "Papir og plast",
  4: "Glass og metall",
  6: "Farlig avfall",
  9: "Tekstil",
  16: "Matavfall",
};

interface ArcGisFeature<T> {
  attributes: T;
}

interface ArcGisResponse<T> {
  features: ArcGisFeature<T>[];
}

const meta: ProviderMeta = {
  id: "frevar",
  name: "FREVAR",
  website: "https://frevar.no",
  coverageAreas: ["Fredrikstad"],
  postalRanges: [[1601, 1639]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const where = `ADRESSE LIKE '${query.toUpperCase().replace(/'/g, "''")}%' AND KOMMUNEID=3107`;
  const url = `${FREVAR_BASE}/Matrikkel/Eiendomskart/MapServer/0/query?where=${encodeURIComponent(where)}&outFields=ADRESSE&returnGeometry=false&f=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FREVAR address search failed: ${res.status}`);
  }
  const data = (await res.json()) as ArcGisResponse<{ ADRESSE: string }>;

  const unique = [...new Set(data.features.map((f) => f.attributes.ADRESSE))];
  return unique.map((addr) => ({
    locationId: addr,
    label: `${addr}, Fredrikstad`,
  }));
}

// noinspection MagicNumber
async function getPickups(locationId: string) {
  const parts = locationId.split("|");
  const address = parts[0] ?? "";
  let avtLnr = parts[1];

  const cacheKey = `frevar:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Step 1: Look up agreement number if not already known
  if (!avtLnr) {
    const agreementWhere = `UPPER(Adresse)='${address.toUpperCase().replace(/'/g, "''")}' AND AvtStatus=0`;
    const agreementUrl = `${FREVAR_BASE}/Renovasjon/MinRenovasjon/MapServer/0/query?where=${encodeURIComponent(agreementWhere)}&outFields=AvtLnr&returnGeometry=false&f=json`;
    const agreementRes = await fetch(agreementUrl);
    if (!agreementRes.ok) {
      throw new Error(`FREVAR agreement lookup failed: ${agreementRes.status}`);
    }
    const agreementData = (await agreementRes.json()) as ArcGisResponse<{
      AvtLnr: number;
    }>;
    const firstFeature = agreementData.features[0];
    if (!firstFeature) {
      throw new Error("FREVAR: no agreement found for address");
    }
    avtLnr = String(firstFeature.attributes.AvtLnr);
  }

  // Step 2: Fetch pickup calendar
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const calWhere = `AvtLnr=${avtLnr} AND Dato>=date'${from}' AND Dato<=date'${to}'`;
  const calUrl = `${FREVAR_BASE}/Renovasjon/MinRenovasjon/MapServer/1/query?where=${encodeURIComponent(calWhere)}&outFields=AvtLnr,Dato,AvfallId&returnGeometry=false&f=json`;
  const calRes = await fetch(calUrl);
  if (!calRes.ok) {
    throw new Error(`FREVAR calendar fetch failed: ${calRes.status}`);
  }
  const calData = (await calRes.json()) as ArcGisResponse<{
    AvfallId: number;
    AvtLnr: number;
    Dato: number;
  }>;

  const pickups = normalizePickups(
    calData.features.map((f) => {
      const date = new Date(f.attributes.Dato).toISOString().slice(0, 10);
      const fraction =
        FREVAR_AVFALL_MAP[f.attributes.AvfallId] ??
        `Type ${f.attributes.AvfallId}`;
      return {
        date,
        fraction,
        fractionId: String(f.attributes.AvfallId),
      };
    })
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const frevarProvider: WasteProvider = {
  id: "frevar",
  meta,
  searchAddress,
  getPickups,
};
