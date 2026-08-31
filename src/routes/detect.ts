import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { detectProvider } from "../detection/detect";
import { getProvider } from "../providers/registry";
import {
  detectionResponseSchema,
  internalErrorResponse,
  rateLimitResponse,
  validationErrorResponse,
} from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  operationId: "detectProvider",
  path: "/api/v1/detect",
  request: {
    query: z.object({
      city: z.string().min(1).optional().openapi({
        description: "Norwegian municipality or city name.",
        example: "Trondheim",
      }),
      postalCode: z
        .string()
        .regex(/^\d{4}$/)
        .optional()
        .openapi({
          description: "Four-digit Norwegian postal code.",
          example: "7013",
        }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: detectionResponseSchema,
        },
      },
      description: "Detected provider or null",
    },
    400: validationErrorResponse,
    429: rateLimitResponse,
    500: internalErrorResponse,
  },
  summary: "Detect waste provider for a postal code or city",
  tags: ["Detection"],
});

app.openapi(route, async (c) => {
  const { postalCode, city } = c.req.valid("query");
  const providerId = await detectProvider(postalCode ?? null, city ?? null);
  const provider = providerId ? getProvider(providerId) : null;
  return c.json({ provider: provider?.meta ?? null }, 200);
});

export { app as detectRoute };
