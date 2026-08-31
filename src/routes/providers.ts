import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getAllProviders } from "../providers/registry";
import {
  internalErrorResponse,
  providersResponseSchema,
  rateLimitResponse,
} from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  operationId: "listProviders",
  path: "/api/v1/providers",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: providersResponseSchema,
        },
      },
      description: "List of providers",
    },
    429: rateLimitResponse,
    500: internalErrorResponse,
  },
  summary: "List all supported waste collection providers",
  tags: ["Providers"],
});

app.openapi(route, (c) => {
  const providers = getAllProviders().map((p) => p.meta);
  return c.json({ providers }, 200);
});

export { app as providersRoute };
