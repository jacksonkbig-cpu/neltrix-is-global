import "server-only";
import { z } from "zod";
import type { ShipmentStatus } from "@prisma/client";
import { getCarrierProvider } from "@/lib/carriers";
import { trackingNumberSchema } from "@/lib/logistics/validation";

export type TrackingResult = {
  trackingNumber: string;
  status: ShipmentStatus | "UNKNOWN";
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  source: "database" | "carrier" | "mock";
};

export class CarrierLookupError extends Error {
  constructor() {
    super("Carrier tracking provider is temporarily unavailable.");
    this.name = "CarrierLookupError";
  }
}

const carrierPayloadSchema = z.object({
  trackingNumber: z.string().trim().min(1).max(100).optional(),
  status: z.string().trim().min(1).max(80).optional(),
  origin: z.string().trim().max(100).optional(),
  destination: z.string().trim().max(100).optional(),
  carrier: z.string().trim().max(80).optional(),
  estimatedDelivery: z.string().datetime({ offset: true }).nullable().optional(),
});

function mapStatus(status: string | undefined): TrackingResult["status"] {
  switch (status?.toLowerCase().replace(/[ -]/g, "_")) {
    case "pending": case "label_created": case "pre_transit": return "PENDING";
    case "in_transit": case "out_for_delivery": case "available_for_pickup": return "IN_TRANSIT";
    case "delivered": return "DELIVERED";
    case "exception": case "failed": case "delivery_exception": case "failure": case "error": return "EXCEPTION";
    default: return "UNKNOWN";
  }
}

function mockTracking(trackingNumber: string): TrackingResult {
  return {
    trackingNumber,
    status: "PENDING",
    origin: null,
    destination: null,
    carrier: "Demo carrier (not live)",
    estimatedDelivery: null,
    source: "mock",
  };
}

export async function lookupCarrier(trackingNumber: string): Promise<TrackingResult | null> {
  const parsed = trackingNumberSchema.safeParse(trackingNumber);
  if (!parsed.success) return null;

  const endpoint = process.env.CARRIER_TRACKING_URL;
  const token = process.env.CARRIER_API_KEY;
  let providerFailed = false;

  if (endpoint || token) {
    if (!endpoint || !token) {
      providerFailed = true;
    } else {
      try {
        const url = new URL(endpoint);
        if (url.protocol !== "https:") throw new Error("Carrier endpoint must use HTTPS.");
        url.searchParams.set("trackingNumber", parsed.data);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(5000), cache: "no-store",
        });
        if (response.status !== 404) {
          if (!response.ok) throw new Error("Carrier provider returned an unsuccessful response.");
          const result = carrierPayloadSchema.safeParse(await response.json());
          if (!result.success) throw new Error("Carrier provider returned an invalid payload.");
          const payload = result.data;
          if (payload.trackingNumber && payload.trackingNumber.trim().toUpperCase() !== parsed.data.toUpperCase()) {
            throw new Error("Carrier provider returned a different tracking number.");
          }
          return {
            trackingNumber: parsed.data, status: mapStatus(payload.status),
            origin: payload.origin || null, destination: payload.destination || null,
            carrier: payload.carrier || "External carrier",
            estimatedDelivery: payload.estimatedDelivery ? new Date(payload.estimatedDelivery).toISOString() : null,
            source: "carrier",
          };
        }
        // A provider 404 is a genuine not-found result; still allow another
        // configured provider to answer before returning not found.
      } catch {
        // Keep provider details and credentials out of logs and public errors.
        providerFailed = true;
      }
    }
  }

  const provider = getCarrierProvider();
  if (provider) {
    try {
      const result = await provider.getTracking(parsed.data);
      if (result) return {
        trackingNumber: result.trackingNumber, status: result.status,
        origin: result.origin, destination: result.destination, carrier: result.carrier,
        estimatedDelivery: result.estimatedDelivery, source: "carrier",
      };
    } catch {
      // Never turn a carrier outage into a false "shipment not found" response.
      providerFailed = true;
    }
  }

  if (process.env.ENABLE_MOCK_TRACKING === "true") return mockTracking(parsed.data);
  if (providerFailed) throw new CarrierLookupError();
  return null;
}
