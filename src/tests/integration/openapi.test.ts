import { describe, expect, test } from "bun:test";
import { createApp } from "../../app";
import {
  apiKeyErrorSchema,
  detectionResponseSchema,
  errorSchema,
  providersResponseSchema,
  statusResponseSchema,
  validationErrorSchema,
} from "../../routes/schemas";

interface OpenAPISchema {
  $ref?: string;
  enum?: string[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
}

interface OpenAPIOperation {
  operationId?: string;
  responses: Record<
    string,
    {
      content?: Record<string, { schema: OpenAPISchema }>;
    }
  >;
  security?: Record<string, string[]>[];
}

interface OpenAPISpec {
  components: {
    schemas: Record<string, OpenAPISchema>;
    securitySchemes: Record<string, unknown>;
  };
  paths: Record<string, Record<string, OpenAPIOperation>>;
}

const expectedCategories = [
  "carton",
  "christmas_tree",
  "food",
  "garden",
  "glass_metal",
  "hazardous",
  "other",
  "paper",
  "plastic",
  "residual",
  "textile",
  "wood",
];

async function loadSpec(): Promise<OpenAPISpec> {
  const response = await createApp().request("/openapi.json");
  expect(response.status).toBe(200);
  return response.json();
}

describe("OpenAPI contract", () => {
  test("documents every public API operation with a stable operation ID", async () => {
    const spec = await loadSpec();
    const expectedOperations = new Map([
      ["GET /api/v1/detect", "detectProvider"],
      ["GET /api/v1/providers", "listProviders"],
      ["GET /api/v1/schedule", "getSchedule"],
      ["GET /api/v1/schedule.ics", "getScheduleIcal"],
      ["GET /api/v1/search", "searchAddresses"],
      ["GET /api/v1/status", "getProviderStatus"],
      ["POST /api/v1/status/report", "reportProviderStatus"],
    ]);

    const actualOperations = new Map<string, string | undefined>();
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        actualOperations.set(
          `${method.toUpperCase()} ${path}`,
          operation.operationId
        );
      }
    }

    expect(actualOperations).toEqual(expectedOperations);
  });

  test("publishes reusable enums and address-specific schedule categories", async () => {
    const spec = await loadSpec();
    expect(spec.components.schemas.WasteCategory.enum).toEqual(
      expectedCategories
    );
    expect(spec.components.schemas.ProviderHealthStatus.enum).toEqual([
      "up",
      "degraded",
      "down",
      "unknown",
    ]);
    expect(spec.components.schemas.ProviderCheckStatus.enum).toEqual([
      "up",
      "degraded",
      "down",
    ]);

    const pickupCategory = spec.components.schemas.Pickup.properties?.category;
    expect(pickupCategory?.$ref).toBe("#/components/schemas/WasteCategory");

    const scheduleCategories =
      spec.components.schemas.Schedule.properties?.categories;
    expect(scheduleCategories?.items?.$ref).toBe(
      "#/components/schemas/WasteCategory"
    );
  });

  test("uses named schemas for every documented response body", async () => {
    const spec = await loadSpec();

    for (const pathItem of Object.values(spec.paths)) {
      for (const operation of Object.values(pathItem)) {
        for (const response of Object.values(operation.responses)) {
          for (const mediaType of Object.values(response.content ?? {})) {
            expect(mediaType.schema.$ref).toStartWith("#/components/schemas/");
          }
        }
      }
    }
  });

  test("documents all validation, runtime, and rate-limit response bodies", async () => {
    const spec = await loadSpec();
    const operations = Object.values(spec.paths).flatMap((pathItem) =>
      Object.values(pathItem)
    );

    for (const operation of operations) {
      for (const [status, response] of Object.entries(operation.responses)) {
        if (Number(status) >= 400) {
          expect(Object.keys(response.content ?? {}).length).toBeGreaterThan(0);
        }
      }
    }

    for (const path of [
      "/api/v1/detect",
      "/api/v1/providers",
      "/api/v1/schedule",
      "/api/v1/schedule.ics",
      "/api/v1/search",
    ]) {
      expect(
        spec.paths[path].get.responses["429"].content?.["text/plain"]
      ).toBeDefined();
    }

    expect(spec.paths["/api/v1/status/report"].post.security).toEqual([
      { ApiKeyAuth: [] },
    ]);
    expect(spec.components.securitySchemes.ApiKeyAuth).toEqual({
      in: "header",
      name: "x-api-key",
      type: "apiKey",
    });
  });

  test("matches representative runtime responses", async () => {
    const app = createApp();
    const cases = [
      {
        path: "/api/v1/providers",
        schema: providersResponseSchema,
        status: 200,
      },
      {
        path: "/api/v1/detect?postalCode=7013",
        schema: detectionResponseSchema,
        status: 200,
      },
      {
        path: "/api/v1/status",
        schema: statusResponseSchema,
        status: 200,
      },
      {
        path: "/api/v1/search?q=a",
        schema: validationErrorSchema,
        status: 400,
      },
      {
        path: "/api/v1/search?q=Kongens%20gate&provider=unknown",
        schema: errorSchema,
        status: 404,
      },
      {
        path: "/api/v1/schedule?provider=unknown&locationId=123",
        schema: errorSchema,
        status: 404,
      },
      {
        path: "/api/v1/schedule.ics?provider=unknown&locationId=123",
        schema: errorSchema,
        status: 404,
      },
    ];

    await Promise.all(
      cases.map(async (entry) => {
        const response = await app.request(entry.path);
        expect(response.status).toBe(entry.status);
        entry.schema.parse(await response.json());
      })
    );

    const forbiddenReport = await app.request("/api/v1/status/report", {
      body: JSON.stringify({ checks: [] }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(forbiddenReport.status).toBe(403);
    apiKeyErrorSchema.parse(await forbiddenReport.json());
  });
});
