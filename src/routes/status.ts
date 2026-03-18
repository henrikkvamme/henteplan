import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getAllProviders } from "../providers/registry";
import {
  getLatestChecks,
  getProviderHistory,
  getProviderUptime,
  reportChecks,
} from "../status/db";

const app = new OpenAPIHono();

// POST /api/v1/status/report — CI posts smoke test results (API key protected)
app.post("/api/v1/status/report", async (c) => {
  const key = c.req.header("x-api-key");
  const validKeys = (process.env.HENTEPLAN_API_KEYS ?? "")
    .split(",")
    .filter(Boolean);
  if (!(key && validKeys.includes(key))) {
    return c.json({ error: "API key required" }, 403);
  }

  const body = await c.req.json<{
    checks: {
      providerId: string;
      total: number;
      passed: number;
      errors?: string[];
    }[];
    checkedAt?: string;
  }>();
  reportChecks(body.checks, body.checkedAt);
  return c.json({ ok: true });
});

// GET /api/v1/status — public status overview
const statusRoute = createRoute({
  method: "get",
  path: "/api/v1/status",
  tags: ["Status"],
  summary: "Get provider status and uptime",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            providers: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                status: z.enum(["up", "degraded", "down", "unknown"]),
                lastChecked: z.string().nullable(),
                uptime30d: z.number().nullable(),
                history: z.array(
                  z.object({
                    checkedAt: z.string(),
                    status: z.string(),
                    passed: z.number(),
                    total: z.number(),
                  })
                ),
              })
            ),
          }),
        },
      },
      description: "Provider status overview",
    },
  },
});

app.openapi(statusRoute, (c) => {
  const allProviders = getAllProviders();
  const latestChecks = getLatestChecks();
  const latestMap = new Map(latestChecks.map((r) => [r.provider_id, r]));

  const providers = allProviders.map((p) => {
    const latest = latestMap.get(p.id);
    const history = getProviderHistory(p.id, 90);
    const uptime = getProviderUptime(p.id, 30);

    return {
      id: p.id,
      name: p.meta.name,
      status: (latest?.status ?? "unknown") as
        | "up"
        | "degraded"
        | "down"
        | "unknown",
      lastChecked: latest?.checked_at ?? null,
      uptime30d: uptime === -1 ? null : Math.round(uptime * 10_000) / 100, // noinspection MagicNumber
      history: history.map((h) => ({
        checkedAt: h.checked_at,
        status: h.status,
        passed: h.passed,
        total: h.total,
      })),
    };
  });

  return c.json({ providers });
});

export { app as statusRoute };
