# Waste Providers — Norway Coverage Report

Comprehensive documentation of Norwegian waste collection providers, their APIs, and coverage gaps.
Last updated: 2026-02-25.

Norway has **356 municipalities**. This document tracks which are covered, which could be covered, and which have no feasible integration path.

## 1. Implemented Providers

### TRV (Trondheim Renholdsverk)

- **ID:** `trv`
- **API:** WordPress REST JSON, no auth
- **Endpoints:**
  - Address search: `GET https://trv.no/wp-json/wasteplan/v2/adress?s={query}`
  - Pickup calendar: `GET https://trv.no/wp-json/wasteplan/v2/calendar?id={locationId}`
- **Municipalities:** Trondheim

### BIR

- **ID:** `bir`
- **API:** REST JSON with token auth
- **Municipalities:** Bergen, Askoy, Bjornafjorden, Eidfjord, Kvam, Osteroy, Samnanger, Ulvik, Vaksdal, Voss

### Oslo (Renovasjonsetaten)

- **ID:** `oslo`
- **API:** REST JSON (Geonorge address lookup + frequency-based date generation)
- **Municipalities:** Oslo

### Norkart (MinRenovasjon)

- **ID:** `norkart`
- **API:** REST JSON via Azure proxy at `norkartrenovasjon.azurewebsites.net/proxyserver.ashx`
- **Auth:** Static app key header `RenovasjonAppKey: AE13DEEC-804F-4615-A74E-B4FAC11F0A30` + `Kommunenr` header
- **Endpoints:**
  - Customer list: `GET https://www.webatlas.no/wacloud/servicerepository/CatalogueService.svc/json/GetRegisteredAppCustomers?Appid=MobilOS-NorkartRenovasjon`
  - Fractions: `GET .../proxyserver.ashx?server=https://komteksky.norkart.no/MinRenovasjon.Api/api/fraksjoner`
  - Calendar: `GET .../proxyserver.ashx?server=https://komteksky.norkart.no/MinRenovasjon.Api/api/tommekalender?gatenavn={street}&gatekode={code}&husnr={number}`
- **Municipalities:** ~198 municipalities. Full list dynamically fetched from the customer API above.

### Avfall Sor

- **ID:** `avfallsor`
- **API:** WordPress REST JSON, no auth
- **Endpoints:**
  - Address search: `GET https://avfallsor.no/wp-json/addresses/v1/address?lookup_term={query}`
  - Pickup calendar: `GET https://avfallsor.no/wp-json/pickup-calendar/v1/collections/property-id/{uuid}`
- **Municipalities:** Kristiansand, Vennesla

### HIM (Haugaland Interkommunale Miljoverk)

- **ID:** `him`
- **API:** WordPress REST JSON, no auth
- **Endpoints:**
  - Address search: `GET https://him.as/wp-json/him/eiendommer?adresse={query}`
  - Pickup calendar: `GET https://him.as/wp-json/him/tomminger?eiendomId={uuid}&datoFra={from}&datoTil={to}`
- **Municipalities:** Haugesund, Karmoy, Tysvaer, Bokn, Vindafjord, Etne, Utsira

### ReMidt IKS

- **ID:** `remidt`
- **API:** renovasjonsportal.no REST JSON, no auth
- **Endpoints:**
  - Address search: `GET https://kalender.renovasjonsportal.no/api/address/{query}`
  - Pickup calendar: `GET https://kalender.renovasjonsportal.no/api/address/{uuid}/year?calendarYear={year}`
- **Municipalities:** Molde, Kristiansund, Orkland, Sunndal, Surnadal, Oppdal, Smola, Aure, Averoy, Tingvoll, Melhus, Skaun, Midtre Gauldal, Heim, Hitra, Froya, Rennebu, Rindal

### FREVAR

- **ID:** `frevar`
- **API:** ArcGIS REST (3-step query), no auth
- **Base URL:** `https://arcgis.fredrikstad.kommune.no/server/rest/services/`
- **Steps:** Address search → Agreement lookup → Pickup calendar
- **Municipalities:** Fredrikstad

### IRIS Salten

- **ID:** `iris`
- **API:** Session-based PHP (3 sequential calls with cookie jar)
- **Base URL:** `https://www.iris-salten.no/xmlhttprequest.php`
- **Steps:** Address search → Set estate (session) → Get schedule
- **Municipalities:** Bodo, Fauske, Saltdal, Sorfold, Steigen, Gildeskal, Meloy, Beiarn, Hamaroy

### RfD (Renovasjonsselskapet for Drammensregionen)

- **ID:** `rfd`
- **API:** Enonic XP service REST, no auth
- **Endpoints:**
  - Address search: `GET https://www.rfd.no/_/service/com.enonic.app.rfd/addressLookup?query={query}`
  - Pickup calendar: `GET https://www.rfd.no/_/service/com.enonic.app.rfd/pickupDays?id={locationId}`
- **Fraction ID mapping:** 1=Matavfall, 2=Papiravfall, 3=Restavfall, 4/5=Glass- og metallemballasje, 7/11=Plastemballasje
- **Municipalities:** Drammen, Lier, Ovre Eiker, Modum, Sigdal

### Renovasjonen IKS

- **ID:** `renovasjonen`
- **API:** JSON address search + HTML calendar scraping (requires `node-html-parser`)
- **Endpoints:**
  - Stavanger address: `GET https://www.stavanger.kommune.no/api/renovasjonservice/GroupedAddressSearch?address={query}`
  - Sandnes address: `GET https://www.hentavfall.no/api/renovasjonservice/AddressSearch?address={query}&municipalityId=1108`
  - Calendar: HTML pages parsed for `<tr class="waste-calendar__item">` rows
- **Municipalities:** Stavanger, Sandnes

### Innherred Renovasjon

- **ID:** `innherred`
- **API:** WordPress REST JSON, no auth
- **Endpoints:**
  - Address search: `GET https://innherredrenovasjon.no/wp-json/ir/v1/addresses/{query}`
  - Pickup calendar: `GET https://innherredrenovasjon.no/wp-json/ir/v1/garbage-disposal-dates-by-address?address={addr}&days=365`
  - Municipality list: `GET https://innherredrenovasjon.no/wp-json/ir/v1/municipalities`
- **Municipalities:** Levanger, Verdal, Inderoy, Snasa, Malvik, Stjordal, Selbu, Tydal, Meraker, Frosta

---

## 2. Detection Rule Gaps

These municipalities are **already supported** by existing provider APIs but need detection rules added (city names + postal code ranges in the provider detection logic):

| Provider | Missing Municipalities | Status |
|---|---|---|
| **ReMidt** | Melhus, Skaun, Midtre Gauldal, Heim, Hitra, Froya, Rennebu, Rindal, Aure, Averoy, Tingvoll | API verified working for all |
| **Innherred** | Malvik, Stjordal, Selbu, Tydal, Meraker, Frosta | API verified working for all |
| **RfD** | Sigdal | Joined RfD in July 2021 |
| **Avfall Sor** | Vennesla | Part of Avfall Sor service area |
| **HIM** | Utsira | Likely covered (needs address verification) |
| **IRIS Salten** | Hamaroy | Confirmed on IRIS website |

**Total: ~19 municipalities unlocked by expanding detection rules alone.**

---

## 3. New Providers — Feasible (Verified APIs)

### Fosen Renovasjon IKS — TRIVIAL

- **Municipalities:** Indre Fosen, Orland, Afjord (3)
- **API:** renovasjonsportal.no REST JSON — **identical** to ReMidt, different subdomain
- **Endpoints:**
  - Address search: `GET https://fosen.renovasjonsportal.no/api/address/{query}`
  - Pickup calendar: `GET https://fosen.renovasjonsportal.no/api/address/{uuid}/year?calendarYear={year}`
- **Auth:** None
- **Effort:** Trivial — clone ReMidt with different base URL, or refactor both into a factory
- **Verified:** Yes, all 3 municipalities tested and working

### HRA (Hadeland og Ringerike Avfallsselskap) — MEDIUM

- **Municipalities:** Gran, Lunner, Jevnaker, Ringerike, Hole (5)
- **API:** Custom REST at `api.hra.no`
- **Endpoints:**
  - Address search: `GET https://api.hra.no/search/address?q={query}` — returns addresses with agreement GUIDs
  - Calendar endpoint: needs further reverse-engineering from the hra.no calendar page
- **Auth:** None observed
- **Effort:** Medium — address search confirmed, need to discover calendar data endpoint

### SIM (Sunnhordland Interkommunale Miljoselskap) — MEDIUM

- **Municipalities:** Stord, Bomlo, Fitjar, Kvinnherad, Tysnes, Sveio, Austevoll (7)
- **API:** WordPress REST at `sim.as`
- **Endpoints:**
  - Address search: `GET https://sim.as/wp-json/tommekalender/v1/address_search`
  - Route search: `GET https://sim.as/wp-json/tommekalender/v1/route_search`
- **Auth:** None
- **Effort:** Medium — endpoints return HTTP 500 without correct parameters; need to intercept mobile app ("Mitt SIM") traffic to discover parameter names
- **Note:** Previously incorrectly documented as "Horisont IKS on Norkart" — this is **wrong**, SIM is not on Norkart

---

## 4. Norconsult Tommeplan Platform

The **Norconsult Digital AS** Tommeplan platform is the single largest unlock opportunity. Multiple waste companies use the same proprietary app framework (`com.norconsult.tommeplan.*`). Reverse-engineering one APK would unlock all of them.

| Company | App Package | Municipalities | Pop. |
|---|---|---|---|
| Time kommune | `com.norconsult.tommeplan.time` | Time | ~19k |
| IVAR Ryfylke | `com.norconsult.tommeplan.ivar` | Strand, Hjelmeland, Suldal | ~14k |
| Hallingdal Renovasjon | `com.norconsult.tommeplan.hallingdal` | Gol, Hemsedal, Al, Hol, Fla, Nesbyen, Krodsherad | ~21k |
| NOMIL | `com.norconsult.tommeplan.nomil` | Bremanger, Kinn, Stad, Gloppen, Stryn | ~38k |
| SHMIL | `com.norconsult.tommeplan.shmil` | Alstahaug, Bronnoy, Donna, Grane, Hattfjelldal, Leirfjord, Somna, Vega, Vevelstad | ~22k |
| LAS Lofoten | `com.norconsult.tommeplan.las` | Vestvagoy, Vagan, Flakstad, Moskenes | ~18k |
| **Total** | | **~32 municipalities** | **~132k** |

**Approach:** Decompile one APK (e.g. `com.norconsult.tommeplan.shmil`) using jadx to find:
1. Base API URL
2. Authentication method (API key, app key, etc.)
3. Endpoint patterns (address search, calendar data)

**Developer:** Norconsult Digital AS (formerly Norconsult Informasjonssystemer AS). Contact: mobilutvikling@nois.no

---

## 5. Other Proprietary/Difficult Providers

### NGIR (Nordhordland) — Azure + SOAP

- **Municipalities:** Alver, Austrheim, Fedje, Masfjorden, Modalen, Gulen, Solund (7)
- **Website:** ngir.no (React SPA)
- **Endpoints found:**
  - Azure: `https://p-dt-ngir-tools-gfbne7cabsfkdwek.norwayeast-01.azurewebsites.net/GarbagePickUpPoint?x={x}&y={y}`
  - SOAP: `https://www.ngirkart.no/WebServices/client/DataView.asmx/ReadAny`
  - Search: `https://av-crawler-search.azurewebsites.net/api/search`
- **Difficulty:** High — coordinate-based (UTM), SOAP, undocumented

### RIR (Romsdalshalvoya) — VSP Platform

- **Municipalities:** Aukra, Hustadvika, Gjemnes, Rauma (4)
- **Website:** rir.no
- **App:** "RIR Renovasjon" (`no.vsp.rir`) by VSP AS
- **Note:** Explicitly left MinRenovasjon. JavaScript SPA with no discoverable API.
- **Difficulty:** High — proprietary VSP platform

### VKR (Valdres Kommunale Renovasjon)

- **Municipalities:** Nord-Aurdal, Vestre Slidre, Oystre Slidre, Vang, Etnedal, Sor-Aurdal (6)
- **Website:** vkr.no
- **Has address search on website** but API is undocumented. Cookie-based favorites system.
- **Difficulty:** Medium-High — web scraping of address search could work

### SUM (Sunnfjord Miljoverk)

- **Municipalities:** Sunnfjord, Fjaler, Hyllestad, Askvoll (4)
- **Website:** sumavfall.no (SPA, not WordPress)
- **App:** "SUM avfall" by Feed AS
- **Difficulty:** High — no API surface discovered

### Solor Renovasjon IKS

- **Municipalities:** Grue, Asnes (2)
- **Website:** solorrenovasjon.no (.NET backend)
- **Endpoints found:** `.ashx` handlers for markers, SMS, printable calendar
- **Difficulty:** High — .NET handlers, may need session cookies

### FIMIL (Finnmark Miljotjeneste)

- **Municipalities:** Karasjok, Nordkapp, Masoy, Lebesby, Gamvik (5)
- **Website:** fimil.no
- **Has custom JS widget** (`RenovationCpt`) with municipality data. Schedules are fixed weekday-based (e.g. "Mondays: all of Karasjok"), not date-specific.
- **Difficulty:** Medium — could generate dates from weekday rules

### Finnmark Ressursselskap

- **Municipalities:** Hammerfest (1)
- **Website:** finnress.no
- **Calendar:** Static HTML table (street → collection day + odd/even week)
- **Difficulty:** Medium — parse HTML table + generate dates from week parity rules

### Avfallsservice AS (Nord-Troms)

- **Municipalities:** Lyngen, Storfjord, Kafjord, Skjervoy, Nordreisa, Kvaenangen (6)
- **Website:** avfallsservice.no (Wix-based, no API)
- **Difficulty:** Very high — Wix site, no digital infrastructure

---

## 6. No Digital Infrastructure

These municipalities have **no API and no feasible integration path** — only static PDF calendars or manual systems:

| Municipality | Waste Company | Notes |
|---|---|---|
| Gjesdal | Renovasjonen IKS area | PDF-only, 4 routes. hentavfall.no returns HTTP 500 |
| Ha | Renovasjonen IKS area | Static HTML street-to-route listing |
| Kvitsoy | IVAR IKS | PDF only, ~500 residents |
| Sauda | Municipal department | PDF only, 9 employees, no digital system |
| Tinn | Municipal service | PDF only, no app, no address-based lookup |
| Bardu | Municipal operation | In-house, no digital calendar, voted against joining external company |
| Rost | Unknown | Very small island (~470 residents), not part of LAS |
| Vaeroy | Unknown | Very small island (~700 residents), not part of LAS |

---

## 7. Coverage Summary

| Category | Municipalities | Count |
|---|---|---|
| Implemented providers | All listed in Section 1 | ~243 |
| Detection rule gaps (easy fix) | Section 2 | +19 |
| Feasible new providers | Fosen (3) + HRA (5) + SIM (7) | +15 |
| Norconsult platform (1 reverse-eng.) | Section 4 | +32 |
| Other proprietary (hard) | Section 5 | +35 |
| No digital infrastructure | Section 6 | 8 |
| **Theoretical maximum** | | **~352 of 356** |

---

## 8. Norkart Customer Municipalities

Companies previously investigated and confirmed to use the Norkart/MinRenovasjon platform (already covered via the `norkart` provider):

| Company | Municipalities |
|---|---|
| ROAF | Lorenskog, Ralingen, Lillestrom, Nittedal, Gjerdrum, Aurskog-Holand, Enebakk |
| Follo Ren | Nordre Follo, Frogn, Nesodden, As |
| SIMAS | Sogndal, Luster, Aurland, Laerdal, Vik, Hoyanger |
| MNA | Namsos, Overhalla, Flatanger, Grong |
| Vesar | Tonsberg, Horten, Holmestrand, Sandefjord, Faerder, Larvik |
| RiG | Skien, Porsgrunn, Bamble, Siljan |

See the full Norkart customer list at: `https://www.webatlas.no/wacloud/servicerepository/CatalogueService.svc/json/GetRegisteredAppCustomers?Appid=MobilOS-NorkartRenovasjon`

**Note:** "Horisont IKS" was previously claimed to cover Stord/Bomlo/Fitjar/Kvinnherad via Norkart. This is **incorrect** — those municipalities are served by SIM (Sunnhordland Interkommunale Miljoselskap) which has its own WordPress REST API, not Norkart. Ullensvang IS on Norkart.
