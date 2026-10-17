import { z } from "zod";

const postalCode = z.string().trim().min(2).max(16).regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "Enter a valid postal code.");

export const trackingNumberSchema = z.string().trim().min(5).max(64).regex(/^[A-Za-z0-9-]+$/, "Tracking number contains unsupported characters.");

export const trackingRequestSchema = z.object({
  trackingNumber: trackingNumberSchema,
}).strict();

export const quoteCalculatorSchema = z.object({
  senderZip: postalCode,
  receiverZip: postalCode,
  weight: z.coerce.number().finite().positive().max(5000),
  dimensions: z.object({
    length: z.coerce.number().finite().positive().max(500),
    width: z.coerce.number().finite().positive().max(500),
    height: z.coerce.number().finite().positive().max(500),
    unit: z.enum(["cm", "in"]).default("cm"),
  }).strict(),
  origin: z.string().trim().min(2).max(100),
  destination: z.string().trim().min(2).max(100),
}).strict();

export type QuoteCalculatorInput = z.infer<typeof quoteCalculatorSchema>;
