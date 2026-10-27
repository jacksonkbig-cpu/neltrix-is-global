import { NextResponse } from "next/server";
import type { Shipment } from "@prisma/client";
import { db } from "@/lib/db";
import { CarrierLookupError, lookupCarrier } from "@/lib/logistics/carrier";
import { trackingNumberSchema } from "@/lib/logistics/validation";

type TrackingShipment = Pick<
  Shipment,
  "trackingNumber" | "status" | "origin" | "destination" | "carrier" | "estimatedDelivery"
>;

export type TrackingDependencies = {
  findShipment?: (trackingNumber: string) => Promise<TrackingShipment | null>;
  lookupCarrier?: typeof lookupCarrier;
};

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleTracking(
  trackingNumber: unknown,
  dependencies: TrackingDependencies = {},
) {
  const parsed = trackingNumberSchema.safeParse(trackingNumber);
  if (!parsed.success) return error("Provide a valid tracking number.", 400);

  const findShipment = dependencies.findShipment ?? (async (number: string) => db.shipment.findUnique({
    where: { trackingNumber: number },
    select: {
      trackingNumber: true,
      status: true,
      origin: true,
      destination: true,
      carrier: true,
      estimatedDelivery: true,
    },
  }));

  try {
    const shipment = await findShipment(parsed.data);
    if (shipment) {
      return NextResponse.json({
        tracking: {
          ...shipment,
          estimatedDelivery: shipment.estimatedDelivery?.toISOString() ?? null,
          source: "database",
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    // Only query the carrier after the database successfully confirms there is
    // no local record; this preserves local tracking as the source of truth.
    const external = await (dependencies.lookupCarrier ?? lookupCarrier)(parsed.data);
    if (external) return NextResponse.json({ tracking: external }, { headers: { "Cache-Control": "no-store" } });
    return error("Shipment not found", 404);
  } catch (cause) {
    if (cause instanceof CarrierLookupError) {
      return error("Tracking provider is temporarily unavailable. Please try again later.", 503);
    }

    // Log error class/code only. Do not log tracking numbers or customer data.
    const detail = cause && typeof cause === "object" ? cause as { name?: unknown; code?: unknown } : {};
    console.error("Tracking lookup failed", {
      name: typeof detail.name === "string" ? detail.name : "UnknownError",
      code: typeof detail.code === "string" ? detail.code : undefined,
    });

    // Avoid exposing database or provider internals in the public response.
    return error("Tracking is temporarily unavailable. Please try again later.", 503);
  }
}
