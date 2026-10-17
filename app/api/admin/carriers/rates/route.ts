import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStaffContext } from "@/lib/authz";
import { getCarrierProvider } from "@/lib/carriers";
import type { RateRequest } from "@/lib/carriers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const address = z.object({
  name: z.string().trim().max(100).optional(),
  street1: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).optional(),
  zip: z.string().trim().min(2).max(16),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional(),
}).strict();

const rateRequestSchema = z.object({
  fromAddress: address,
  toAddress: address,
  parcel: z.object({
    length: z.number().finite().positive().max(500),
    width: z.number().finite().positive().max(500),
    height: z.number().finite().positive().max(500),
    distanceUnit: z.enum(["cm", "in"]),
    weight: z.number().finite().positive().max(5000),
    massUnit: z.enum(["kg", "lb"]),
  }).strict(),
}).strict();

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const staff = await getStaffContext(["ADMIN", "OPERATIONS_STAFF"]);
  if (!staff) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return NextResponse.json({ error: "Send JSON." }, { status: 415 });

  if (Number(request.headers.get("content-length") ?? "0") > 20_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = rateRequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please check the address and parcel fields." }, { status: 400 });

  const provider = getCarrierProvider();
  if (!provider) return NextResponse.json({ error: "Live carrier rates are not configured." }, { status: 503 });
  try {
    const rates = await provider.getRates(parsed.data as RateRequest);
    return NextResponse.json({ rates, binding: false, rateType: "CARRIER_QUOTE", provider: "EasyPost", disclaimer: "Carrier-provided rates are estimates and are not binding until the carrier accepts a purchase." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Carrier rates are temporarily unavailable." }, { status: 503 });
  }
}
