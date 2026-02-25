import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { detectProvider } from "../detection/detect";
import { getProvider } from "../providers/registry";
import { providerSchema } from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  path: "/api/v1/detect",
  tags: ["Detection"],
  summary: "Detect waste provider for a postal code or city",
  request: {
    query: z.object({
      postalCode: z.string().optional().openapi({ example: "7013" }),
      city: z.string().optional().openapi({ example: "Trondheim" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ provider: providerSchema.nullable() }),
        },
      },
      description: "Detected provider or null",
    },
  },
});

app.openapi(route, async (c) => {
  const { postalCode, city } = c.req.valid("query");
  const providerId = await detectProvider(postalCode ?? null, city ?? null);
  const provider = providerId ? getProvider(providerId) : null;
  return c.json({ provider: provider?.meta ?? null });
});

export { app as detectRoute };
