import { parse as parseHtml } from "node-html-parser";
import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface IrisEstate {
  adresse: string;
  id: string;
  kommune: string;
}

const IRIS_SEARCH =
  "https://iris-salten.no/wp-content/themes/iris/data/location-search.php";
const IRIS_CALENDAR = "https://iris-salten.no/privat/tommeplan/";

const MONTH_MAP: Record<string, string> = {
  januar: "01",
  februar: "02",
  mars: "03",
  april: "04",
  mai: "05",
  juni: "06",
  juli: "07",
  august: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

const DATE_RE = /(\d{1,2})\.\s*(\w+)/;

function parseIrisCalendarHtml(
  html: string
): Array<{ date: string; fraction: string; fractionId: string }> {
  const root = parseHtml(html);
  const results: Array<{
    date: string;
    fraction: string;
    fractionId: string;
  }> = [];
  const year = new Date().getFullYear();

  const dateHeaders = root.querySelectorAll("h4.calendar__date");
  for (const header of dateHeaders) {
    const dateText = header.text.trim();
    const match = dateText.match(DATE_RE);
    if (!match) continue;

    const day = (match[1] ?? "01").padStart(2, "0");
    const monthName = (match[2] ?? "").toLowerCase();
    const month = MONTH_MAP[monthName];
    if (!month) continue;

    const isoDate = `${year}-${month}-${day}`;

    // Find the sibling <ul class="calendar__fractions">
    let sibling = header.nextElementSibling;
    while (sibling && sibling.tagName !== "UL") {
      sibling = sibling.nextElementSibling;
    }
    if (!sibling) continue;

    const labels = sibling.querySelectorAll(".calendar__label");
    for (const label of labels) {
      const fraction = label.text.trim();
      if (fraction) {
        results.push({
          date: isoDate,
          fraction,
          fractionId: fraction.toLowerCase().replace(/\s+/g, "-"),
        });
      }
    }
  }

  return results;
}

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

async function irisSearch(query: string): Promise<IrisEstate[]> {
  const url = `${IRIS_SEARCH}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`IRIS address search failed: ${res.status}`);
  }
  return (await res.json()) as IrisEstate[];
}

async function searchAddress(query: string): Promise<AddressMatch[]> {
  let data = await irisSearch(query);

  // Fallback: retry without house number if no results
  if (data.length === 0) {
    const streetOnly = query.replace(/\s+\d+\s*$/, "").trim();
    if (streetOnly && streetOnly !== query) {
      data = await irisSearch(streetOnly);
    }
  }

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

  const calendarUrl = `${IRIS_CALENDAR}?lookup=${encodeURIComponent(estateId ?? "")}&address=${encodeURIComponent(estateName ?? "")}&municipality=${encodeURIComponent(municipality ?? "")}`;
  const res = await fetch(calendarUrl);
  if (!res.ok) {
    throw new Error(`IRIS calendar fetch failed: ${res.status}`);
  }
  const html = await res.text();

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    parseIrisCalendarHtml(html).filter((p) => p.date >= today)
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
