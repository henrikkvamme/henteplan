# Integrasjoner

Henteplan tilbyr iCal-feeds (`.ics`) som fungerer med de fleste kalenderapper og smarthjem-systemer.

## Home Assistant

### Via Remote Calendar (enklest)

1. Gå til [henteplan.no](https://henteplan.no) og søk opp adressen din
2. Klikk **Abonner i kalender** for å kopiere iCal-URLen
3. I Home Assistant: **Settings → Devices & Services → Add Integration → Local Calendar** eller søk etter "Remote Calendar"
4. Lim inn URLen og gi kalenderen et navn (f.eks. "Henteplan")

Kalenderen oppdateres automatisk (standard 24-timers intervall i HA).

### Via waste_collection_schedule (HACS)

[waste_collection_schedule](https://github.com/mampfes/hacs_waste_collection_schedule) er en populær HACS-integrasjon som støtter generiske ICS-kilder. Den gir deg sensorer i tillegg til kalender-events, nyttig for automatiseringer.

1. Installer `waste_collection_schedule` via HACS
2. Legg til i `configuration.yaml`:

```yaml
waste_collection_schedule:
  sources:
    - name: ics
      args:
        url: "https://henteplan.no/api/v1/schedule.ics?provider=PROVIDER&locationId=LOCATION_ID"
```

3. Erstatt `PROVIDER` og `LOCATION_ID` med verdiene fra iCal-URLen du finner på henteplan.no

Dette gir deg sensorer som `sensor.henteplan_restavfall`, `sensor.henteplan_papir` osv. som du kan bruke i automatiseringer og dashboards.

## Google Calendar

1. Kopier iCal-URLen fra henteplan.no
2. Åpne [Google Calendar](https://calendar.google.com)
3. Klikk **+** ved "Other calendars" → **From URL**
4. Lim inn URLen og klikk **Add calendar**

## Apple Calendar

1. Kopier iCal-URLen fra henteplan.no
2. I Calendar-appen: **File → New Calendar Subscription…**
3. Lim inn URLen og klikk **Subscribe**

Fungerer også på iPhone/iPad via **Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar**.

## Outlook

1. Kopier iCal-URLen fra henteplan.no
2. I Outlook (web): **Add calendar → Subscribe from web**
3. Lim inn URLen og gi kalenderen et navn
