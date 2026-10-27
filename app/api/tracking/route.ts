import { NextRequest, NextResponse } from "next/server";
import { handleTracking } from "@/lib/logistics/tracking-handler";
import { trackingRequestSchema } from "@/lib/logistics/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
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
