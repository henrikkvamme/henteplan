import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { generateIcal } from "../ical/generate";
import { getProvider } from "../providers/registry";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  path: "/api/v1/schedule.ics",
  tags: ["Schedule"],
  summary: "Get waste collection schedule as iCal feed",
  request: {
    query: z.object({
      provider: z.string().openapi({ example: "trv" }),
      locationId: z.string().openapi({ example: "12345" }),
    }),
  },
  responses: {
    200: {
      content: { "text/calendar": { schema: z.string() } },
      description: "iCal calendar feed",
    },
    404: { description: "Provider not found" },
    502: { description: "Upstream provider error" },
  },
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
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline",
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
