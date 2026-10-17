import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quoteCalculatorSchema } from "@/lib/logistics/validation";
import { quoteRequestSchema } from "@/lib/quotes/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function originAllowed(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production" && !configuredSiteUrl) {
    return jsonError("Quote requests are temporarily unavailable.", 503);
  }
  if (origin && configuredSiteUrl) {
    try {
      if (new URL(origin).origin !== new URL(configuredSiteUrl).origin) {
        return jsonError("Request origin is not allowed.", 403);
      }
    } catch {
      return jsonError("Site URL configuration is invalid.", 503);
    }
  }
  return null;
}

async function calculateQuote(body: unknown) {
  const parsed = quoteCalculatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the shipment details.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const dimensionsCm = data.dimensions.unit === "in"
    ? { length: data.dimensions.length * 2.54, width: data.dimensions.width * 2.54, height: data.dimensions.height * 2.54 }
    : { length: data.dimensions.length, width: data.dimensions.width, height: data.dimensions.height };
  const volumetricWeightKg = (dimensionsCm.length * dimensionsCm.width * dimensionsCm.height) / 5000;
  const chargeableWeightKg = Math.max(data.weight, volumetricWeightKg);
  // Transparent estimate only; replace with contracted carrier/routing rates before commercial use.
  const baseRate = Number(process.env.QUOTE_BASE_RATE_USD ?? "12");
  const perKgRate = Number(process.env.QUOTE_PER_KG_RATE_USD ?? "2.4");
  if (!Number.isFinite(baseRate) || baseRate < 0 || !Number.isFinite(perKgRate) || perKgRate < 0) {
    return jsonError("Quote calculator is not configured.", 503);
  }
  const rate = Math.round((baseRate + chargeableWeightKg * perKgRate) * 100) / 100;

  try {
    const quote = await db.quote.create({
      data: {
        senderZip: data.senderZip,
        receiverZip: data.receiverZip,
        origin: data.origin,
        destination: data.destination,
        weight: data.weight,
        dimensions: { ...dimensionsCm, unit: "cm", enteredUnit: data.dimensions.unit },
        rate,
        currency: "USD",
      },
      select: { id: true, rate: true, currency: true, status: true, createdAt: true },
    });
    return NextResponse.json({
      quote: {
        id: quote.id,
        rate: Number(quote.rate),
        currency: quote.currency,
        status: quote.status,
        createdAt: quote.createdAt.toISOString(),
        chargeableWeightKg: Math.round(chargeableWeightKg * 100) / 100,
        estimateOnly: true,
        note: "Indicative estimate, not a carrier-confirmed or binding rate.",
      },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("We could not save the quote. Please try again later.", 503);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Send the quote request as JSON.", 415);
  }
  const originFailure = originAllowed(request);
  if (originFailure) return originFailure;

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 12_000) return jsonError("Request is too large.", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  // The calculator API and the existing contact/quote-intake form share this route
  // without breaking the established Supabase-backed workflow.
  if (typeof body === "object" && body !== null && "senderZip" in body) {
    return calculateQuote(body);
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true, requestId: null }, { status: 202 });
  }

  const rateLimitSecret = process.env.QUOTE_RATE_LIMIT_SECRET;
  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    return jsonError("Quote requests are temporarily unavailable while the service is being configured.", 503);
  }

  // Vercel overwrites x-real-ip at its trusted edge. For other hosts, configure a
  // trusted proxy and never blindly trust arbitrary x-forwarded-for values.
  const clientAddress = request.headers.get("x-real-ip") || "unknown";
  const ipHash = createHmac("sha256", rateLimitSecret).update(clientAddress).digest("hex");

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("submit_quote_request", {
      p_full_name: parsed.data.fullName,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone || null,
      p_origin_country: parsed.data.originCountry,
      p_destination_country: parsed.data.destinationCountry,
      p_shipment_type: parsed.data.shipmentType,
      p_details: parsed.data.details || null,
      p_ip_hash: ipHash,
    });

    if (error?.message?.includes("RATE_LIMITED")) return jsonError("Too many requests. Please try again later.", 429);
    if (error) {
      console.error("Quote persistence failed:", error.code ?? "unknown");
      return jsonError("We could not save your request. Please try again later.", 503);
    }
    return NextResponse.json({ ok: true, requestId: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Quote requests are not configured yet. No request was saved.", 503);
  }
}
