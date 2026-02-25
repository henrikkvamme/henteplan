import { z } from "@hono/zod-openapi";

export const pickupSchema = z
  .object({
    category: z.string().openapi({ example: "paper" }),
    color: z.string().openapi({ example: "#3b82f6" }),
    date: z.string().openapi({ example: "2026-03-05" }),
    fraction: z.string().openapi({ example: "Papp og papir" }),
    fractionId: z.string().openapi({ example: "2" }),
  })
  .openapi("Pickup");

export const addressMatchSchema = z
  .object({
    label: z.string().openapi({ example: "Kongens gate 1, 7011 Trondheim" }),
    locationId: z.string().openapi({ example: "12345" }),
    provider: z.string().openapi({ example: "trv" }),
  })
  .openapi("AddressMatch");

export const providerSchema = z
  .object({
    coverageAreas: z.array(z.string()),
    id: z.string(),
    name: z.string(),
    postalRanges: z.array(z.tuple([z.number(), z.number()])),
    website: z.string(),
  })
  .openapi("Provider");

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      provider: z.string().optional(),
    }),
  })
  .openapi("Error");
