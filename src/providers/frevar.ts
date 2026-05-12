import { normalizePickups } from "../fractions/normalize";
import { withFallback } from "./cache";
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

interface ArcGisErrorBody {
  error?: { code: number; message: string };
}

// ArcGIS at fredrikstad.kommune.no intermittently returns HTTP 200 with an
// error body (no `features` field). Retry with backoff on these responses.
// noinspection MagicNumber
async function fetchArcGis<T>(
  url: string,
  context: string
): Promise<ArcGisResponse<T>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
    const res = await fetch(url);
    if (!res.ok) {
      lastError = new Error(`FREVAR ${context} failed: ${res.status}`);
      continue;
    }
    const data = (await res.json()) as ArcGisResponse<T> & ArcGisErrorBody;
    if (Array.isArray(data.features)) {
      return data;
    }
    lastError = new Error(
      `FREVAR ${context} returned no features: ${data.error?.message ?? "unknown error"}`
    );
  }
  throw lastError ?? new Error(`FREVAR ${context} failed`);
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
  const data = await fetchArcGis<{ ADRESSE: string }>(url, "address search");

  const unique = [...new Set(data.features.map((f) => f.attributes.ADRESSE))];
  return unique.map((addr) => ({
    locationId: addr,
    label: `${addr}, Fredrikstad`,
  }));
}

// noinspection MagicNumber
function getPickups(locationId: string) {
  return withFallback(`frevar:${locationId}`, async () => {
    const parts = locationId.split("|");
    const address = parts[0] ?? "";
    let avtLnr = parts[1];

    // Step 1: Look up agreement number if not already known
    if (!avtLnr) {
      const agreementWhere = `UPPER(Adresse)='${address.toUpperCase().replace(/'/g, "''")}' AND AvtStatus=0`;
      const agreementUrl = `${FREVAR_BASE}/Renovasjon/MinRenovasjon/MapServer/0/query?where=${encodeURIComponent(agreementWhere)}&outFields=AvtLnr&returnGeometry=false&f=json`;
      const agreementData = await fetchArcGis<{ AvtLnr: number }>(
        agreementUrl,
        "agreement lookup"
      );
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
    const calData = await fetchArcGis<{
      AvfallId: number;
      AvtLnr: number;
      Dato: number;
    }>(calUrl, "calendar fetch");

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
    return pickups;
  });
}

export const frevarProvider: WasteProvider = {
  id: "frevar",
  meta,
  searchAddress,
  getPickups,
};
