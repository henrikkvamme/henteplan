import { Hono } from "hono";
import { getAllProviders } from "../providers/registry";

const app = new Hono();

const SITE_URL = "https://henteplan.no";
const SITE_NAME = "Henteplan";
const SITE_DESCRIPTION =
  "Søk opp adressen din og finn hentedager for avfall. Legg til i kalenderen din med ett klikk.";

app.get("/robots.txt", (c) => {
  const body = `# Henteplan – Norwegian waste collection schedules
User-agent: *
Allow: /
Disallow: /api/
Allow: /docs
Allow: /api/v1/providers

# AI crawlers – explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

User-agent: CCBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: DuckAssistBot
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return c.text(body, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

app.get("/sitemap.xml", (c) => {
  const today = new Date().toISOString().split("T")[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/docs</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  return c.text(xml, 200, {
    "Content-Type": "application/xml; charset=utf-8",
  });
});

app.get("/llms.txt", (c) => {
  const providers = getAllProviders();
  const providerList = providers
    .map(
      (p) =>
        `- ${p.meta.name} (${p.meta.id}): ${p.meta.coverageAreas.join(", ")}`
    )
    .join("\n");

  const body = `# Henteplan

> Norwegian waste collection schedule API and web app.

Henteplan provides a free, open API for looking up waste collection schedules across Norway. It supports 13+ providers covering 200+ municipalities.

## Links

- Website: ${SITE_URL}
- API Documentation: ${SITE_URL}/docs
- OpenAPI Spec: ${SITE_URL}/openapi.json
- Source Code: https://github.com/henrikkvamme/henteplan

## API Endpoints

- GET /api/v1/providers — List all supported waste collection providers
- GET /api/v1/detect?postalCode={code}&city={city} — Auto-detect provider for an address
- GET /api/v1/search?q={address}&provider={id} — Search for addresses within a provider
- GET /api/v1/schedule?provider={id}&locationId={id} — Get waste collection schedule
- GET /api/v1/schedule.ics?provider={id}&locationId={id} — Download iCal calendar

## Supported Providers

${providerList}
`;
  return c.text(body, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

app.get("/llms-full.txt", (c) => {
  const providers = getAllProviders();
  const providerDetails = providers
    .map((p) => {
      const postalRanges = p.meta.postalRanges
        .map(([from, to]) => `${from}–${to}`)
        .join(", ");
      return `### ${p.meta.name} (\`${p.meta.id}\`)
- Website: ${p.meta.website}
- Coverage: ${p.meta.coverageAreas.join(", ")}
- Postal ranges: ${postalRanges}`;
    })
    .join("\n\n");

  const body = `# Henteplan — Full Documentation

> Norwegian waste collection schedule API and web app.

Henteplan is a free, open-source service for looking up waste collection schedules across Norway. It aggregates data from 13+ municipal waste providers, covering 200+ municipalities, into a single unified API.

## Website

${SITE_URL}

## Source Code

https://github.com/henrikkvamme/henteplan

## API Base URL

${SITE_URL}/api/v1

## Authentication

The API is free and does not require authentication for normal use. Rate limits apply per endpoint.

## API Endpoints

### GET /api/v1/providers

List all supported waste collection providers.

**Response:** Array of provider objects with id, name, website, coverageAreas, and postalRanges.

### GET /api/v1/detect

Auto-detect which provider serves a given address.

**Query Parameters:**
- \`postalCode\` (string) — Norwegian postal code (e.g. "7030")
- \`city\` (string, optional) — City name

**Response:** Provider object or null if no match.

### GET /api/v1/search

Search for addresses within a specific provider.

**Query Parameters:**
- \`q\` (string) — Address search query
- \`provider\` (string) — Provider ID (e.g. "trv", "oslo", "bir")

**Response:** Array of address matches with label and locationId.

### GET /api/v1/schedule

Get the waste collection schedule for an address.

**Query Parameters:**
- \`provider\` (string) — Provider ID
- \`locationId\` (string) — Location ID from search results

**Response:** Array of pickup objects with date, fraction, category, color, and fractionId.

### GET /api/v1/schedule.ics

Download waste collection schedule as iCal calendar file.

**Query Parameters:**
- \`provider\` (string) — Provider ID
- \`locationId\` (string) — Location ID from search results

**Response:** iCalendar (.ics) file for calendar subscription.

## Providers

${providerDetails}

## Waste Fraction Categories

The API normalizes waste fractions into standard categories:

- \`residual\` — Restavfall (general waste)
- \`food\` — Matavfall (food waste)
- \`paper\` — Papir (paper and cardboard)
- \`plastic\` — Plastemballasje (plastic packaging)
- \`glass_metal\` — Glass og metallemballasje
- \`garden\` — Hageavfall (garden waste)
- \`hazardous\` — Farlig avfall (hazardous waste)
- \`textile\` — Tekstiler (textiles)
- \`carton\` — Drikkekartong (beverage cartons)
- \`wood\` — Trevirke (wood)
- \`christmas_tree\` — Juletre (Christmas trees)
- \`other\` — Annet (other/miscellaneous)

## Typical Usage Flow

1. Call \`/api/v1/detect\` with a postal code to find the provider
2. Call \`/api/v1/search\` with the address and provider to get locationId
3. Call \`/api/v1/schedule\` with provider and locationId to get the schedule
4. Optionally use \`/api/v1/schedule.ics\` for calendar integration
`;
  return c.text(body, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

app.get("/.well-known/llm-index.json", (c) => {
  return c.json({
    name: SITE_NAME,
    description:
      "Norwegian waste collection schedule API covering 13+ providers and 200+ municipalities.",
    url: SITE_URL,
    documentation: `${SITE_URL}/docs`,
    openapi: `${SITE_URL}/openapi.json`,
    llms_txt: `${SITE_URL}/llms.txt`,
    llms_full_txt: `${SITE_URL}/llms-full.txt`,
    endpoints: [
      {
        path: "/api/v1/providers",
        method: "GET",
        description: "List all supported waste collection providers",
      },
      {
        path: "/api/v1/detect",
        method: "GET",
        description: "Auto-detect provider for a postal code",
      },
      {
        path: "/api/v1/search",
        method: "GET",
        description: "Search for addresses within a provider",
      },
      {
        path: "/api/v1/schedule",
        method: "GET",
        description: "Get waste collection schedule for an address",
      },
      {
        path: "/api/v1/schedule.ics",
        method: "GET",
        description: "Download schedule as iCal calendar",
      },
    ],
  });
});

app.get("/manifest.webmanifest", (c) => {
  return c.json({
    name: "Henteplan — Finn din renovasjonskalender",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    theme_color: "#2A7C6F",
    background_color: "#FAF7F2",
    lang: "nb",
    icons: [
      {
        src: "/assets/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  });
});

export { app as seoRoutes };
