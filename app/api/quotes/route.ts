import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { quoteRequestSchema } from "@/lib/quotes/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Send the quote request as JSON.", 415);
  }

  const origin = request.headers.get("origin");
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (origin && configuredSiteUrl) {
    try {
      if (new URL(origin).origin !== new URL(configuredSiteUrl).origin) {
        return jsonError("Request origin is not allowed.", 403);
      }
    } catch {
      return jsonError("Site URL configuration is invalid.", 500);
    }
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 12_000) return jsonError("Request is too large.", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Quietly accept the honeypot but do not store bot submissions.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, requestId: null }, { status: 202 });
  }

  const rateLimitSecret = process.env.QUOTE_RATE_LIMIT_SECRET;
  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    return jsonError("Quote requests are temporarily unavailable while the service is being configured.", 503);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
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

    if (error?.message?.includes("RATE_LIMITED")) {
      return jsonError("Too many requests. Please try again later.", 429);
    }
    if (error) {
      console.error("Quote persistence failed:", error.code ?? "unknown");
      return jsonError("We could not save your request. Please try again later.", 503);
    }

    return NextResponse.json({ ok: true, requestId: data }, { status: 201 });
  } catch (error) {
    console.error("Quote intake configuration error:", error instanceof Error ? error.message : "unknown");
    return jsonError("Quote requests are not configured yet. No request was saved.", 503);
  }
}
