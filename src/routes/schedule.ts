import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getProvider } from "../providers/registry";
import { pickupSchema } from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  path: "/api/v1/schedule",
  tags: ["Schedule"],
  summary: "Get waste collection schedule",
  request: {
    query: z.object({
      provider: z.string().openapi({ example: "trv" }),
      locationId: z.string().openapi({ example: "12345" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            provider: z.string(),
            pickups: z.array(pickupSchema),
          }),
        },
      },
      description: "Pickup schedule",
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
    return c.json({ provider: providerId, pickups });
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

export { app as scheduleRoute };
