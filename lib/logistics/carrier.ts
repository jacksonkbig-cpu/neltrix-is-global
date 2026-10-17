import "server-only";
import type { ShipmentStatus } from "@prisma/client";
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

type CarrierPayload = {
  trackingNumber?: string;
  status?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  estimatedDelivery?: string | null;
};

function mapStatus(status: string | undefined): TrackingResult["status"] {
  switch (status?.toLowerCase().replace(/[ -]/g, "_")) {
    case "pending": case "label_created": return "PENDING";
    case "in_transit": case "out_for_delivery": return "IN_TRANSIT";
    case "delivered": return "DELIVERED";
    case "exception": case "failed": case "delivery_exception": return "EXCEPTION";
    default: return "UNKNOWN";
  }
}

export async function lookupCarrier(trackingNumber: string): Promise<TrackingResult | null> {
  const parsed = trackingNumberSchema.safeParse(trackingNumber);
  if (!parsed.success) return null;

  const endpoint = process.env.CARRIER_TRACKING_URL;
  const token = process.env.CARRIER_API_KEY;

  if (endpoint && token) {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") throw new Error("Carrier endpoint must use HTTPS.");
    url.searchParams.set("trackingNumber", parsed.data);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Carrier provider returned an unsuccessful response.");
    const payload = (await response.json()) as CarrierPayload;
    return {
      trackingNumber: parsed.data,
      status: mapStatus(payload.status),
      origin: typeof payload.origin === "string" ? payload.origin.slice(0, 100) : null,
      destination: typeof payload.destination === "string" ? payload.destination.slice(0, 100) : null,
      carrier: typeof payload.carrier === "string" ? payload.carrier.slice(0, 80) : "External carrier",
      estimatedDelivery: payload.estimatedDelivery ?? null,
      source: "carrier",
    };
  }

  // Explicitly labelled demo data; never misrepresent this as a live carrier scan.
  if (process.env.ENABLE_MOCK_TRACKING === "true") {
    return {
      trackingNumber: parsed.data,
      status: "PENDING",
      origin: null,
      destination: null,
      carrier: "Demo carrier (not live)",
      estimatedDelivery: null,
      source: "mock",
    };
  }
  return null;
}
