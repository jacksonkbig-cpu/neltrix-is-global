import { z } from "zod";

const countrySchema = z.enum(["Brazil", "United States"], {
  errorMap: () => ({ message: "Only the initial Brazil–United States corridor is currently supported." }),
});

export const quoteRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().default(""),
  originCountry: countrySchema,
  destinationCountry: countrySchema,
  shipmentType: z.enum([
    "Documents or parcel",
    "Commercial cargo",
    "Air freight",
    "Ocean freight",
    "Not sure yet",
  ]),
  details: z.string().trim().max(2000).optional().default(""),
  website: z.string().max(0).optional().default(""),
}).superRefine((value, context) => {
  if (value.originCountry === value.destinationCountry) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["destinationCountry"],
      message: "Origin and destination must be different countries.",
    });
  }
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
