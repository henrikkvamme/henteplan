import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getAllProviders } from "../providers/registry";
import {
  getLatestChecks,
  getProviderHistory,
  getProviderUptime,
  reportChecks,
} from "../status/db";
import {
  apiKeyErrorSchema,
  internalErrorResponse,
  statusReportRequestSchema,
  statusReportResponseSchema,
  statusResponseSchema,
  validationErrorResponse,
} from "./schemas";

const app = new OpenAPIHono();

const statusReportRoute = createRoute({
  description: "API-key-protected endpoint used by Henteplan monitoring.",
  method: "post",
  operationId: "reportProviderStatus",
  path: "/api/v1/status/report",
  request: {
    body: {
      content: {
        "application/json": {
          schema: statusReportRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: statusReportResponseSchema,
        },
      },
      description: "Status report recorded",
    },
    400: validationErrorResponse,
    403: {
      content: {
        "application/json": {
          schema: apiKeyErrorSchema,
        },
      },
      description: "API key required",
    },
    500: internalErrorResponse,
  },
  security: [{ ApiKeyAuth: [] }],
  summary: "Record provider smoke-test results",
  tags: ["Status"],
});

app.openapi(statusReportRoute, (c) => {
  const key = c.req.header("x-api-key");
  const validKeys = (process.env.HENTEPLAN_API_KEYS ?? "")
    .split(",")
    .filter(Boolean);
  if (!(key && validKeys.includes(key))) {
    return c.json({ error: "API key required" as const }, 403);
  }

  const body = c.req.valid("json");
  reportChecks(body.checks, body.checkedAt);
  return c.json({ ok: true as const }, 200);
});

// GET /api/v1/status - public status overview
const statusRoute = createRoute({
  method: "get",
  operationId: "getProviderStatus",
  path: "/api/v1/status",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: statusResponseSchema,
        },
      },
      description: "Provider status overview",
    },
    500: internalErrorResponse,
  },
  summary: "Get provider status and uptime",
  tags: ["Status"],
});

app.openapi(statusRoute, (c) => {
  const allProviders = getAllProviders();
  const latestChecks = getLatestChecks();
  const latestMap = new Map(latestChecks.map((r) => [r.provider_id, r]));

  const providers = allProviders.map((p) => {
    const latest = latestMap.get(p.id);
    const history = getProviderHistory(p.id, 90);
    const uptime = getProviderUptime(p.id, 30);
    const status = latest ? latest.status : ("unknown" as const);

    return {
      history: history.map((h) => ({
        checkedAt: h.checked_at,
        passed: h.passed,
        status: h.status,
        total: h.total,
      })),
      id: p.id,
      lastChecked: latest?.checked_at ?? null,
      name: p.meta.name,
      status,
      uptime30d: uptime === -1 ? null : Math.round(uptime * 10_000) / 100, // noinspection MagicNumber
    };
  });

  return c.json({ providers }, 200);
});

export { app as statusRoute };
