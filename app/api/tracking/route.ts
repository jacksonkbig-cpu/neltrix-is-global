import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lookupCarrier } from "@/lib/logistics/carrier";
import { trackingNumberSchema, trackingRequestSchema } from "@/lib/logistics/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function handleTracking(trackingNumber: unknown) {
  const parsed = trackingNumberSchema.safeParse(trackingNumber);
  if (!parsed.success) return error("Provide a valid tracking number.", 400);

  try {
    const shipment = await db.shipment.findUnique({
      where: { trackingNumber: parsed.data },
      select: { trackingNumber: true, status: true, origin: true, destination: true, carrier: true, estimatedDelivery: true },
    });
    if (shipment) {
      return NextResponse.json({
        tracking: {
          ...shipment,
          estimatedDelivery: shipment.estimatedDelivery?.toISOString() ?? null,
          source: "database",
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const external = await lookupCarrier(parsed.data);
    if (external) return NextResponse.json({ tracking: external }, { headers: { "Cache-Control": "no-store" } });
    return error("No shipment was found for that tracking number.", 404);
  } catch (cause) {
    // Log only error type/code; never log tracking numbers, credentials, or customer data.
    const detail = cause && typeof cause === "object" ? cause as { name?: unknown; code?: unknown } : {};
    console.error("Tracking lookup failed", {
      name: typeof detail.name === "string" ? detail.name : "UnknownError",
      code: typeof detail.code === "string" ? detail.code : undefined,
    });
    return error("Tracking is temporarily unavailable. Please try again later.", 503);
  }
}

export async function GET(request: NextRequest) {
  return handleTracking(request.nextUrl.searchParams.get("trackingNumber"));
}

export async function POST(request: NextRequest) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return error("Send the tracking request as JSON.", 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON.", 400);
  }
  const parsed = trackingRequestSchema.safeParse(body);
  if (!parsed.success) return error("Provide a valid tracking number.", 400);
  return handleTracking(parsed.data.trackingNumber);
}
