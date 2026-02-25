import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getAllProviders } from "../providers/registry";
import { providerSchema } from "./schemas";

const app = new OpenAPIHono();

const route = createRoute({
  method: "get",
  path: "/api/v1/providers",
  tags: ["Providers"],
  summary: "List all supported waste collection providers",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ providers: z.array(providerSchema) }),
        },
      },
      description: "List of providers",
    },
  },
});

app.openapi(route, (c) => {
  const providers = getAllProviders().map((p) => p.meta);
  return c.json({ providers });
});

export { app as providersRoute };
