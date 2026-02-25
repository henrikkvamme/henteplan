import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface IrisEstate {
  adresse: string;
  id: string;
  kommune: string;
}

interface IrisEvent {
  fractionIcon: string;
  fractionName: string;
}

interface IrisDay {
  date: string;
  events: IrisEvent[];
}

function extractCookies(res: Response): string {
  const cookies: string[] = [];
  for (const raw of res.headers.getSetCookie()) {
    const name = raw.split(";")[0];
    if (name) {
      cookies.push(name);
    }
  }
  return cookies.join("; ");
}

const IRIS_BASE = "https://www.iris-salten.no/xmlhttprequest.php";

const meta: ProviderMeta = {
  id: "iris",
  name: "IRIS Salten",
  website: "https://iris-salten.no",
  coverageAreas: [
    "Bodø",
    "Fauske",
    "Saltdal",
    "Sørfold",
    "Steigen",
    "Gildeskål",
    "Meløy",
    "Beiarn",
  ],
  postalRanges: [[8000, 8099]],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const url = `${IRIS_BASE}?service=irisapi.realestates&address=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`IRIS address search failed: ${res.status}`);
  }
  const data = (await res.json()) as IrisEstate[];
  return data.map((item) => ({
    locationId: `${item.id}|${item.adresse}|${item.kommune}`,
    label: `${item.adresse}, ${item.kommune}`,
  }));
}

async function getPickups(locationId: string) {
  const cacheKey = `iris:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const [estateId, estateName, municipality] = locationId.split("|");

  // Step 1: Initial request to get a session cookie
  const initUrl = `${IRIS_BASE}?service=irisapi.realestates&address=${encodeURIComponent(estateName ?? "")}`;
  const initRes = await fetch(initUrl);
  if (!initRes.ok) {
    throw new Error(`IRIS session init failed: ${initRes.status}`);
  }
  const cookies = extractCookies(initRes);

  // Step 2: Set estate in session
  const setUrl = `${IRIS_BASE}?service=irisapi.setestate&estateid=${encodeURIComponent(estateId ?? "")}&estatename=${encodeURIComponent(estateName ?? "")}&estatemunicipality=${encodeURIComponent(municipality ?? "")}`;
  const setRes = await fetch(setUrl, { headers: { Cookie: cookies } });
  if (!setRes.ok) {
    throw new Error(`IRIS set estate failed: ${setRes.status}`);
  }

  // Step 3: Get schedule
  const scheduleUrl = `${IRIS_BASE}?service=irisapi.estateempty`;
  const scheduleRes = await fetch(scheduleUrl, {
    headers: { Cookie: cookies },
  });
  if (!scheduleRes.ok) {
    throw new Error(`IRIS schedule fetch failed: ${scheduleRes.status}`);
  }
  const data = (await scheduleRes.json()) as { days: IrisDay[] };

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    data.days
      .filter((day) => day.date >= today)
      .flatMap((day) =>
        day.events.map((event) => ({
          date: day.date.slice(0, 10),
          fraction: event.fractionName,
          fractionId: event.fractionIcon,
        }))
      )
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const irisProvider: WasteProvider = {
  id: "iris",
  meta,
  searchAddress,
  getPickups,
};
