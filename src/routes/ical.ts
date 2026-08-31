import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { generateIcal } from "../ical/generate";
import { getProvider } from "../providers/registry";
import {
  apiErrorResponse,
  iCalendarSchema,
  internalErrorResponse,
  rateLimitResponse,
  validationErrorResponse,
} from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  operationId: "getScheduleIcal",
  path: "/api/v1/schedule.ics",
  request: {
    query: z.object({
      locationId: z.string().min(1).openapi({
        description: "Opaque location ID returned by address search.",
        example: "12345",
      }),
      provider: z.string().min(1).openapi({
        description:
          "Provider ID from search results or the providers endpoint.",
        example: "trv",
      }),
    }),
  },
  responses: {
    200: {
      content: { "text/calendar": { schema: iCalendarSchema } },
      description: "iCal calendar feed",
    },
    400: validationErrorResponse,
    404: apiErrorResponse("Provider not found", {
      error: {
        code: "PROVIDER_NOT_FOUND",
        message: "Unknown provider: example",
      },
    }),
    429: rateLimitResponse,
    500: internalErrorResponse,
    502: apiErrorResponse("Upstream provider error", {
      error: {
        code: "UPSTREAM_ERROR",
        message: "Provider request failed",
        provider: "trv",
      },
    }),
  },
  summary: "Get waste collection schedule as iCal feed",
  tags: ["Schedule"],
});

app.openapi(route, async (c) => {
  const { provider: providerId, locationId } = c.req.valid("query");
  const provider = getProvider(providerId);
  if (!provider) {
    return c.json(
      {
        error: {
          code: "PROVIDER_NOT_FOUND",
          message: `Unknown provider: ${providerId}`,
        },
      },
      // biome-ignore lint/suspicious/noExplicitAny: OpenAPI route typing limitation
      404 as any
    );
  }

  try {
    const pickups = await provider.getPickups(locationId);
    const ical = generateIcal(providerId, locationId, pickups);
    return new Response(ical, {
      headers: {
        "Content-Disposition": "inline",
        "Content-Type": "text/calendar; charset=utf-8",
      },
    });
  } catch (err) {
    return c.json(
      {
        error: {
          code: "UPSTREAM_ERROR",
          message:
            err instanceof Error ? err.message : "Provider request failed",
          provider: providerId,
        },
      },
      // biome-ignore lint/suspicious/noExplicitAny: OpenAPI route typing limitation
      502 as any
    );
  }
});

export { app as icalRoute };
