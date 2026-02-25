import { Hono } from "hono";

const app = new Hono();

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? "";

app.get("/api/internal/suggest", async (c) => {
  const q = c.req.query("q") ?? "";
  if (q.length < 2 || !MAPBOX_TOKEN) {
    return c.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    q,
    country: "NO",
    types: "address,street",
    limit: "5",
    language: "no",
    session_token: c.req.query("session_token") ?? "",
    access_token: MAPBOX_TOKEN,
  });

  const res = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`
  );

  if (!res.ok) {
    return c.json({ suggestions: [] });
  }

  const data = await res.json();
  return c.json(data);
});

app.get("/api/internal/retrieve/:mapboxId", async (c) => {
  const mapboxId = c.req.param("mapboxId");
  if (!MAPBOX_TOKEN) {
    return c.json({ features: [] });
  }

  const params = new URLSearchParams({
    session_token: c.req.query("session_token") ?? "",
    access_token: MAPBOX_TOKEN,
  });

  const res = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?${params}`
  );

  if (!res.ok) {
    return c.json({ features: [] });
  }

  const data = await res.json();
  return c.json(data);
});

export { app as geocodeRoute };
