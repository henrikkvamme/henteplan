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
  app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
    in: "header",
    name: "x-api-key",
    type: "apiKey",
  });

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
    externalDocs: {
      description: "Full documentation (LLM-optimized)",
      url: "https://henteplan.no/llms-full.txt",
    },
    info: {
      contact: {
        name: "Henteplan",
        url: "https://henteplan.no",
      },
      description:
        "Open API for Norwegian waste collection schedules. Supports 13 providers covering 200+ municipalities.",
      license: {
        name: "MIT",
        url: "https://github.com/henrikkvamme/henteplan/blob/main/LICENSE",
      },
      title: "Henteplan API",
      version: "0.1.0",
    },
    openapi: "3.1.0",
    servers: [{ description: "Production", url: "https://henteplan.no" }],
  });

  // Scalar docs
  app.get(
    "/docs",
    apiReference({
      customCss: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;500;600&display=swap');
        .light-mode {
          --scalar-color-1: #2C2C2C;
          --scalar-color-2: rgba(44, 44, 44, 0.7);
          --scalar-color-3: rgba(44, 44, 44, 0.44);
          --scalar-color-accent: #2A7C6F;
          --scalar-background-1: #FAF7F2;
          --scalar-background-2: #F3EEE7;
          --scalar-background-3: #E8E2D8;
          --scalar-background-accent: #2A7C6F14;
          --scalar-border-color: #E8E2D8;
        }
        .dark-mode {
          --scalar-color-accent: #4DB8A8;
          --scalar-background-accent: #4DB8A81A;
        }
        .light-mode .sidebar {
          --scalar-sidebar-background-1: #F3EEE7;
          --scalar-sidebar-border-color: #E8E2D8;
          --scalar-sidebar-search-background: #FAF7F2;
          --scalar-sidebar-search-border-color: #E8E2D8;
        }
        .scalar-app .section-header-intro-key { font-family: 'Fraunces', Georgia, serif; }
      `,
      defaultHttpClient: { clientKey: "fetch", targetKey: "js" },
      favicon: "/assets/favicon.svg",
      hiddenClients: ["powershell", "objc", "ocaml", "r", "clojure", "c"],
      metaData: {
        description:
          "Interactive API docs for Norwegian waste collection schedules.",
        title: "Henteplan API Documentation",
      },
      pageTitle: "Henteplan API",
      spec: { url: "/openapi.json" },
      theme: "kepler",
    })
  );

  // Serve static assets
  const assetsDir = new URL("./web/assets/", import.meta.url).pathname;
  app.get("/assets/:filename", async (c) => {
    const filename = c.req.param("filename");
    const file = Bun.file(`${assetsDir}${filename}`);
    if (!(await file.exists())) {
      return c.notFound();
    }
    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": file.type,
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
