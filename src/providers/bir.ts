import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface BirAddressResult {
  Id: string;
  SubTitle: string;
  Title: string;
}

interface BirPickupEntry {
  dato: string;
  fraksjon: string;
  fraksjonId: number;
}

// noinspection SpellCheckingInspection
const BIR_APP_ID = "94FA72AD-583D-4AA3-988F-491F694DFB7B";
let birToken: string | null = null;
let birTokenExpiresAt = 0;

async function getBirToken(): Promise<string> {
  if (birToken && birTokenExpiresAt > Date.now()) {
    return birToken;
  }

  const res = await fetch("https://webservice.bir.no/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applikasjonsId: BIR_APP_ID,
      oppdragsgiverId: "100;300;400",
    }),
  });

  if (!res.ok) {
    throw new Error(`BIR login failed: ${res.status}`);
  }

  const token = res.headers.get("token");
  if (!token) {
    throw new Error("BIR login response missing token header");
  }

  birToken = token;
  // noinspection MagicNumber — refresh token every 50 minutes
  birTokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return token;
}

const meta: ProviderMeta = {
  id: "bir",
  name: "BIR",
  website: "https://bir.no",
  coverageAreas: [
    "Bergen",
    "Askøy",
    "Bjørnafjorden",
    "Eidfjord",
    "Kvam",
    "Osterøy",
    "Samnanger",
    "Ulvik",
    "Vaksdal",
    "Voss",
  ],
  postalRanges: [
    [5003, 5499],
    [5600, 5660],
    [5700, 5786],
  ],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `https://bir.no/api/search/AddressSearch?q=${encodeURIComponent(query)}&s=false`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`BIR address search failed: ${res.status}`);
  }
  const data = (await res.json()) as BirAddressResult[];
  return data.map((item) => ({
    locationId: item.Id,
    label: [item.Title, item.SubTitle].filter(Boolean).join(", "),
  }));
}

// noinspection MagicNumber
async function getPickups(locationId: string) {
  const cacheKey = `bir:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const token = await getBirToken();

  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const url = `https://webservice.bir.no/api/tomminger?eiendomId=${encodeURIComponent(locationId)}&datoFra=${from}&datoTil=${to}`;
  const res = await fetch(url, {
    headers: { Token: token },
  });
  if (!res.ok) {
    throw new Error(`BIR pickups fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as BirPickupEntry[];

  const pickups = normalizePickups(
    data.map((e) => ({
      date: e.dato.slice(0, 10),
      fraction: e.fraksjon,
      fractionId: String(e.fraksjonId),
    }))
  );

  setCache(cacheKey, pickups);
  return pickups;
}

export const birProvider: WasteProvider = {
  id: "bir",
  meta,
  searchAddress,
  getPickups,
};
