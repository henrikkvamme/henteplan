import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getAllProviders, getProvider } from "../providers/registry";
import { addressMatchSchema } from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  path: "/api/v1/search",
  tags: ["Search"],
  summary: "Search for addresses",
  description: "Search for addresses across all providers, or a specific one",
  request: {
    query: z.object({
      q: z.string().min(2).openapi({ example: "Kongens gate 1" }),
      provider: z.string().optional().openapi({ example: "trv" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ results: z.array(addressMatchSchema) }),
        },
      },
      description: "Search results",
    },
    400: { description: "Invalid query" },
  },
});

app.openapi(route, async (c) => {
  const { q, provider: providerId } = c.req.valid("query");

  if (providerId) {
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
    const matches = await provider.searchAddress(q);
    return c.json({
      results: matches.map((m) => ({ ...m, provider: providerId })),
    });
  }

  // Search all providers in parallel
  const providers = getAllProviders();
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const matches = await p.searchAddress(q);
      return matches.map((m) => ({ ...m, provider: p.id }));
    })
  );

  const allResults = results
    // biome-ignore lint/suspicious/noExplicitAny: PromiseSettledResult requires any
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return c.json({ results: allResults });
});

export { app as searchRoute };
