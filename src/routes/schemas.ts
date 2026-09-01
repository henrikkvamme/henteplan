import { z } from "@hono/zod-openapi";
import type { FractionCategory } from "../providers/types";

export const wasteCategoryValues = [
  "food",
  "garden",
  "glass_metal",
  "hazardous",
  "other",
  "paper",
  "plastic",
  "residual",
] as const satisfies readonly FractionCategory[];

export const wasteCategorySchema = z
  .enum(wasteCategoryValues)
  .openapi("WasteCategory", {
    description:
      "Canonical waste category. A schedule lists only the categories available at the requested address.",
    example: "paper",
  });

export const providerHealthStatusSchema = z
  .enum(["up", "degraded", "down", "unknown"])
  .openapi("ProviderHealthStatus", {
    description:
      "Latest provider health. Unknown means no check has been recorded yet.",
    example: "up",
  });

export const providerCheckStatusSchema = z
  .enum(["up", "degraded", "down"])
  .openapi("ProviderCheckStatus", {
    description: "Health derived from one recorded provider check.",
    example: "up",
  });

export const pickupSchema = z
  .object({
    categories: z
      .array(wasteCategorySchema)
      .min(1)
      .openapi({
        description:
          "Every canonical waste category represented by this pickup. Compound fractions contain multiple values.",
        example: ["paper", "plastic"],
      }),
    category: wasteCategorySchema,
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .openapi({
        description: "Six-digit hexadecimal color for the canonical category.",
        example: "#3b82f6",
      }),
    date: z.string().date().openapi({
      description:
        "Provider-local collection date. This is a civil date, not a timestamp.",
      example: "2026-03-05",
    }),
    fraction: z.string().min(1).openapi({
      description: "Human-readable fraction name supplied by the provider.",
      example: "Papp og papir",
    }),
    fractionId: z.string().min(1).openapi({
      description: "Provider-specific fraction identifier.",
      example: "2",
    }),
  })
  .openapi("Pickup", {
    description:
      "A dated collection. Use categories for filtering compound fractions; category is the backward-compatible primary category.",
  });

export const addressMatchSchema = z
  .object({
    label: z.string().min(1).openapi({
      description: "Provider-formatted address label.",
      example: "Kongens gate 1, 7011 Trondheim",
    }),
    locationId: z.string().min(1).openapi({
      description:
        "Opaque provider location identifier to pass to the schedule endpoint.",
      example: "12345",
    }),
    provider: z.string().min(1).openapi({
      description: "Henteplan provider ID.",
      example: "trv",
    }),
  })
  .openapi("AddressMatch");

export const providerSchema = z
  .object({
    coverageAreas: z.array(z.string().min(1)).openapi({
      description:
        "Human-readable summary of municipalities or regions served.",
      example: ["Trondheim"],
    }),
    id: z.string().min(1).openapi({
      description: "Stable provider ID used by search and schedule requests.",
      example: "trv",
    }),
    name: z.string().min(1).openapi({
      description: "Provider display name.",
      example: "Trondheim Renholdsverk",
    }),
    postalRanges: z
      .array(
        z.tuple([
          z.number().int().min(0).max(9999),
          z.number().int().min(0).max(9999),
        ])
      )
      .openapi({
        description: "Inclusive numeric Norwegian postal-code ranges.",
        example: [[7000, 7099]],
      }),
    website: z.string().url().openapi({
      description: "Provider website.",
      example: "https://trv.no",
    }),
  })
  .openapi("Provider");

export const errorCodeSchema = z
  .enum(["INTERNAL_ERROR", "PROVIDER_NOT_FOUND", "UPSTREAM_ERROR"])
  .openapi("ErrorCode");

export const errorSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string().min(1).openapi({
        example: "Unknown provider: example",
      }),
      provider: z.string().min(1).optional().openapi({
        description: "Provider ID associated with an upstream failure.",
        example: "trv",
      }),
    }),
  })
  .openapi("Error");

export const validationErrorSchema = z
  .object({
    error: z.object({
      issues: z.array(
        z
          .object({
            code: z.string().openapi({ example: "too_small" }),
            message: z.string().openapi({
              example: "String must contain at least 2 character(s)",
            }),
            path: z.array(z.union([z.string(), z.number()])).openapi({
              example: ["q"],
            }),
          })
          .passthrough()
      ),
      name: z.literal("ZodError"),
    }),
    success: z.literal(false),
  })
  .openapi("ValidationError");

export const rateLimitErrorSchema = z.string().openapi("RateLimitError", {
  example: "Too many requests, please try again later.",
});

export const providersResponseSchema = z
  .object({ providers: z.array(providerSchema) })
  .openapi("ProvidersResponse");

export const searchResponseSchema = z
  .object({ results: z.array(addressMatchSchema) })
  .openapi("SearchResponse");

export const scheduleSchema = z
  .object({
    categories: z.array(wasteCategorySchema).openapi({
      description:
        "Sorted unique waste categories available at this address. Compound provider fractions contribute every applicable category.",
      example: ["food", "glass_metal", "paper", "plastic", "residual"],
    }),
    pickups: z.array(pickupSchema),
    provider: z.string().min(1).openapi({
      description: "Provider that supplied this schedule.",
      example: "trv",
    }),
  })
  .openapi("Schedule");

export const detectionResponseSchema = z
  .object({ provider: providerSchema.nullable() })
  .openapi("DetectionResponse");

export const iCalendarSchema = z.string().openapi("ICalendar", {
  description: "RFC 5545 iCalendar feed.",
  example: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n",
});

export const providerStatusHistoryEntrySchema = z
  .object({
    checkedAt: z.string().datetime({ offset: true }),
    passed: z.number().int().nonnegative(),
    status: providerCheckStatusSchema,
    total: z.number().int().nonnegative(),
  })
  .openapi("ProviderStatusHistoryEntry");

export const providerStatusSchema = z
  .object({
    history: z.array(providerStatusHistoryEntrySchema),
    id: z.string().min(1),
    lastChecked: z.string().datetime({ offset: true }).nullable(),
    name: z.string().min(1),
    status: providerHealthStatusSchema,
    uptime30d: z.number().min(0).max(100).nullable().openapi({
      description:
        "Percentage of successful checks during the last 30 days, or null when no checks exist.",
      example: 99.95,
    }),
  })
  .openapi("ProviderStatus");

export const statusResponseSchema = z
  .object({ providers: z.array(providerStatusSchema) })
  .openapi("StatusResponse");

export const statusReportCheckSchema = z
  .object({
    errors: z.array(z.string()).optional(),
    passed: z.number().int().nonnegative(),
    providerId: z.string().min(1),
    total: z.number().int().nonnegative(),
  })
  .openapi("StatusReportCheck");

export const statusReportRequestSchema = z
  .object({
    checkedAt: z.string().datetime({ offset: true }).optional(),
    checks: z.array(statusReportCheckSchema),
  })
  .openapi("StatusReportRequest");

export const statusReportResponseSchema = z
  .object({ ok: z.literal(true) })
  .openapi("StatusReportResponse");

export const apiKeyErrorSchema = z
  .object({ error: z.literal("API key required") })
  .openapi("ApiKeyError");

export function apiErrorResponse(
  description: string,
  example: {
    error: {
      code: z.infer<typeof errorCodeSchema>;
      message: string;
      provider?: string;
    };
  }
) {
  return {
    content: {
      "application/json": {
        example,
        schema: errorSchema,
      },
    },
    description,
  } as const;
}

export const validationErrorResponse = {
  content: {
    "application/json": {
      schema: validationErrorSchema,
    },
  },
  description: "Request validation failed",
} as const;

export const internalErrorResponse = apiErrorResponse("Internal server error", {
  error: {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  },
});

export const rateLimitResponse = {
  content: {
    "text/plain": {
      schema: rateLimitErrorSchema,
    },
  },
  description: "Rate limit exceeded",
  headers: {
    RateLimit: {
      description: "Draft 7 rate-limit details for the current window.",
      schema: { type: "string" },
    },
    "RateLimit-Policy": {
      description: "Draft 7 rate-limit policy.",
      schema: { type: "string" },
    },
    "Retry-After": {
      description: "Seconds until another request may be attempted.",
      schema: { type: "string" },
    },
  },
} as const;
