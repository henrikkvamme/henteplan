# Henteplan

Open API and web app for Norwegian waste collection schedules. Look up pickup dates by address across 200+ municipalities.

**Live at [henteplan.no](https://henteplan.no)**

<p align="center">
  <img src="src/web/assets/hero.webp" alt="Henteplan — Norwegian waste collection schedule lookup" width="540">
</p>

## Providers

| Provider | Municipalities | Type |
|---|---|---|
| Norkart (MinRenovasjon) | ~198 | REST/Azure proxy |
| ReMidt | 18 | renovasjonsportal.no |
| BIR | 10 | REST + token auth |
| Innherred Renovasjon | 10 | WordPress REST |
| IRIS Salten | 9 | Session-based PHP |
| HIM | 7 | WordPress REST |
| RfD | 5 | Enonic XP service |
| Fosen Renovasjon | 3 | renovasjonsportal.no |
| Avfall Sor | 2 | WordPress REST |
| Renovasjonen IKS | 2 | JSON + HTML scraping |
| TRV | 1 | WordPress REST |
| Oslo | 1 | Geonorge + rules |
| FREVAR | 1 | ArcGIS REST |

See [`docs/PROVIDERS.md`](docs/PROVIDERS.md) for detailed API documentation and coverage analysis.

## API

Base URL: `https://henteplan.no/api/v1`

| Endpoint | Description |
|---|---|
| `GET /providers` | List all providers and their municipalities |
| `GET /detect?address=...` | Auto-detect provider from address |
| `GET /search?provider=...&query=...` | Search addresses within a provider |
| `GET /schedule?provider=...&locationId=...` | Get pickup schedule |
| `GET /schedule.ics?provider=...&locationId=...` | iCal feed |

Interactive docs at [henteplan.no/docs](https://henteplan.no/docs).

## Setup

```sh
bun install
cp .env.example .env  # add your MAPBOX_ACCESS_TOKEN
bun dev
```

## Stack

[Bun](https://bun.sh) + [Hono](https://hono.dev) + [Zod OpenAPI](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) + [Scalar](https://scalar.com) docs

## License

MIT
