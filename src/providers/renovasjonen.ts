import { parse as parseHtml } from "node-html-parser";
import { normalizePickups } from "../fractions/normalize";
import { getCached, setCache } from "./cache";
import type { AddressMatch, ProviderMeta, WasteProvider } from "./types";

interface RenovasjonenAddress {
  adresse: string;
  bNr: number;
  gNr: number;
  id: string;
  kommuneNr: string;
  sNr: number;
}

const YEAR_RE = /(\d{4})/;
const DATE_DD_MM_RE = /(\d{1,2})\.(\d{1,2})/;

function parseRenovasjonenCalendarHtml(
  html: string
): Array<{ date: string; fraction: string; fractionId: string }> {
  const root = parseHtml(html);
  const results: Array<{ date: string; fraction: string; fractionId: string }> =
    [];

  const yearOption = root.querySelector(
    "select option[selected], select option"
  );
  let defaultYear = new Date().getFullYear();
  if (yearOption) {
    const val = yearOption.getAttribute("value") ?? "";
    const yearMatch = val.match(YEAR_RE);
    if (yearMatch) {
      defaultYear = Number(yearMatch[1]);
    }
  }

  const rows = root.querySelectorAll("tr.waste-calendar__item");
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    const dateCell = cells[0];
    const fractionCell = cells[1];
    if (!(dateCell && fractionCell)) {
      continue;
    }

    const dateText = dateCell.text.trim();
    const dateMatch = dateText.match(DATE_DD_MM_RE);
    if (!dateMatch) {
      continue;
    }
    const day = (dateMatch[1] ?? "01").padStart(2, "0");
    const month = (dateMatch[2] ?? "01").padStart(2, "0");
    const isoDate = `${defaultYear}-${month}-${day}`;

    const images = fractionCell.querySelectorAll("img");
    for (const img of images) {
      const fraction = img.getAttribute("title") ?? "Ukjent";
      results.push({
        date: isoDate,
        fraction,
        fractionId: fraction.toLowerCase().replace(/\s+/g, "-"),
      });
    }
  }

  return results;
}

const meta: ProviderMeta = {
  id: "renovasjonen",
  name: "Renovasjonen IKS",
  website: "https://renovasjonen.no",
  coverageAreas: ["Stavanger", "Sandnes"],
  postalRanges: [
    [4000, 4099],
    [4300, 4399],
  ],
};

async function searchAddress(query: string): Promise<AddressMatch[]> {
  const results: AddressMatch[] = [];

  // Stavanger
  const stUrl = `https://www.stavanger.kommune.no/api/renovasjonservice/GroupedAddressSearch?address=${encodeURIComponent(query)}`;
  const stRes = await fetch(stUrl);
  if (stRes.ok) {
    const stData = (await stRes.json()) as RenovasjonenAddress[];
    for (const a of stData) {
      results.push({
        locationId: `stavanger|${a.id}|${a.gNr}|${a.bNr}|${a.sNr}`,
        label: `${a.adresse}, Stavanger`,
      });
    }
  }

  // Sandnes
  const snUrl = `https://www.hentavfall.no/api/renovasjonservice/AddressSearch?address=${encodeURIComponent(query)}&municipalityId=1108`;
  const snRes = await fetch(snUrl);
  if (snRes.ok) {
    const snJson = (await snRes.json()) as {
      Result: RenovasjonenAddress[];
    };
    for (const a of snJson.Result ?? []) {
      results.push({
        locationId: `sandnes|${a.id}|${a.gNr}|${a.bNr}|${a.sNr}`,
        label: `${a.adresse}, Sandnes`,
      });
    }
  }

  return results;
}

async function getPickups(locationId: string) {
  const cacheKey = `renovasjonen:${locationId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const [variant, uuid, gNr, bNr, sNr] = locationId.split("|");

  let calendarUrl: string;
  if (variant === "sandnes") {
    calendarUrl = `https://www.hentavfall.no/rogaland/sandnes/tommekalender/show?id=${encodeURIComponent(uuid ?? "")}&municipality=${encodeURIComponent("Sandnes kommune 2020")}&gnumber=${gNr}&bnumber=${bNr}&snumber=${sNr}`;
  } else {
    calendarUrl = `https://www.stavanger.kommune.no/renovasjon-og-miljo/tommekalender/finn-kalender/show?ids=${encodeURIComponent(uuid ?? "")}&municipality=Stavanger&gnumber=${gNr}&bnumber=${bNr}&snumber=${sNr}`;
  }

  const res = await fetch(calendarUrl);
  if (!res.ok) {
    throw new Error(`Renovasjonen calendar fetch failed: ${res.status}`);
  }
  const html = await res.text();

  const today = new Date().toISOString().slice(0, 10);
  const pickups = normalizePickups(
    parseRenovasjonenCalendarHtml(html).filter((p) => p.date >= today)
  );

  pickups.sort((a, b) => a.date.localeCompare(b.date));
  setCache(cacheKey, pickups);
  return pickups;
}

export const renovasjonenProvider: WasteProvider = {
  id: "renovasjonen",
  meta,
  searchAddress,
  getPickups,
};
