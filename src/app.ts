import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { analytics } from "./middleware/analytics";
import { apiKeyAuth } from "./middleware/api-key";
import { errorHandler } from "./middleware/error-handler";
import { rateLimiter } from "./middleware/rate-limit";
import { detectRoute } from "./routes/detect";
import { geocodeRoute } from "./routes/geocode";
import { icalRoute } from "./routes/ical";
import { providersRoute } from "./routes/providers";
import { scheduleRoute } from "./routes/schedule";
import { searchRoute } from "./routes/search";
import { seoRoutes } from "./routes/seo";
import { statusRoute } from "./routes/status";

export function createApp() {
  const app = new OpenAPIHono();

  // Global middleware
  app.use("*", cors());
  app.onError(errorHandler);

  // Analytics
  app.use("/api/v1/*", analytics());

  // API key auth — sets "trusted" flag to bypass rate limits
  app.use("/api/v1/*", apiKeyAuth());

  // noinspection MagicNumber — rate limits per minute
  app.use("/api/v1/search", rateLimiter({ max: 30, window: 60 }));
  app.use("/api/v1/schedule*", rateLimiter({ max: 60, window: 60 }));
  app.use("/api/v1/providers", rateLimiter({ max: 120, window: 60 }));
  app.use("/api/v1/detect", rateLimiter({ max: 120, window: 60 }));

  // API routes
  app.route("/", providersRoute);
  app.route("/", searchRoute);
  app.route("/", scheduleRoute);
  app.route("/", icalRoute);
  app.route("/", detectRoute);
  app.route("/", statusRoute);

  // Internal routes (server-side Mapbox proxy for web interface)
  app.route("/", geocodeRoute);

  // SEO routes (robots.txt, sitemap, llms.txt, manifest, etc.)
  app.route("/", seoRoutes);

  // OpenAPI spec
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Henteplan API",
      version: "0.1.0",
      description:
        "Open API for Norwegian waste collection schedules. Supports 13 providers covering 200+ municipalities.",
      contact: {
        name: "Henteplan",
        url: "https://henteplan.no",
      },
      license: {
        name: "MIT",
        url: "https://github.com/henrikkvamme/henteplan/blob/main/LICENSE",
      },
    },
    servers: [{ url: "https://henteplan.no", description: "Production" }],
    externalDocs: {
      description: "Full documentation (LLM-optimized)",
      url: "https://henteplan.no/llms-full.txt",
    },
  });

  // Scalar docs
  app.get(
    "/docs",
    apiReference({
      spec: { url: "/openapi.json" },
      theme: "kepler",
      metaData: {
        title: "Henteplan API Documentation",
        description:
          "Interactive API docs for Norwegian waste collection schedules.",
      },
      defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
    })
  );

  // Serve static assets
  const assetsDir = new URL("./web/assets/", import.meta.url).pathname;
  app.get("/assets/:filename", async (c) => {
    const filename = c.req.param("filename");
    const file = Bun.file(`${assetsDir}${filename}`);
    if (!(await file.exists())) return c.notFound();
    return new Response(file, {
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  });

  // Serve web interface
  const htmlPath = new URL("./web/index.html", import.meta.url).pathname;
  app.get("/", async (c) => {
    const file = Bun.file(htmlPath);
    return c.html(await file.text());
  });

  // Status page
  const statusHtmlPath = new URL("./web/status.html", import.meta.url).pathname;
  app.get("/status", async (c) => {
    const file = Bun.file(statusHtmlPath);
    return c.html(await file.text());
  });

  return app;
}
