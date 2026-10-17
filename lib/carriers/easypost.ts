import "server-only";
import { z } from "zod";
import type { CarrierProvider, CarrierTracking, CarrierRate, RateRequest, LabelPurchaseRequest } from "./types";

const eventSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  datetime: z.string().nullable().optional(),
  tracking_location: z.object({ city: z.string().nullable().optional(), state: z.string().nullable().optional(), country: z.string().nullable().optional() }).nullable().optional(),
});
const trackerSchema = z.object({
  tracking_code: z.string(),
  carrier: z.string().optional(),
  status: z.string().optional(),
  est_delivery_date: z.string().nullable().optional(),
  tracking_details: z.array(eventSchema).optional(),
  from_address: z.object({ city: z.string().optional(), state: z.string().optional(), country: z.string().optional() }).optional(),
  to_address: z.object({ city: z.string().optional(), state: z.string().optional(), country: z.string().optional() }).optional(),
});

function status(value?: string): CarrierTracking["status"] {
  switch (value?.toLowerCase()) {
    case "pre_transit": case "unknown": return "PENDING";
    case "in_transit": case "out_for_delivery": return "IN_TRANSIT";
    case "delivered": return "DELIVERED";
    case "failure": case "return_to_sender": case "cancelled": return "EXCEPTION";
    default: return "UNKNOWN";
  }
}
function address(value?: { city?: string; state?: string; country?: string }) {
  if (!value) return null;
  return [value.city, value.state, value.country].filter(Boolean).join(", ") || null;
}

export class EasyPostCarrier implements CarrierProvider {
  private readonly key: string;
  private readonly base = "https://api.easypost.com/v2";
  constructor() {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) throw new Error("EasyPost is not configured");
    this.key = key;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.key}:`).toString("base64")}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Carrier provider returned HTTP ${response.status}`);
    return await response.json() as T;
  }

  async getTracking(trackingNumber: string, carrier?: string): Promise<CarrierTracking | null> {
    const schema = z.string().trim().min(5).max(64).regex(/^[A-Za-z0-9-]+$/);
    const code = schema.safeParse(trackingNumber);
    if (!code.success) return null;
    const response = await this.request<unknown>("/trackers", {
      method: "POST",
      body: JSON.stringify({ tracker: { tracking_code: code.data, ...(carrier ? { carrier } : {}) } }),
    });
    const raw = z.object({ tracker: trackerSchema }).safeParse(response);
    if (!raw.success) throw new Error("Carrier provider returned an invalid tracking response");
    const item = raw.data.tracker;
    if (item.tracking_code.toUpperCase() !== code.data.toUpperCase()) throw new Error("Carrier returned a mismatched tracking number");
    return {
      trackingNumber: item.tracking_code,
      carrier: item.carrier ?? carrier ?? "EasyPost",
      status: status(item.status),
      origin: address(item.from_address),
      destination: address(item.to_address),
      estimatedDelivery: item.est_delivery_date ? new Date(item.est_delivery_date).toISOString() : null,
      events: (item.tracking_details ?? []).slice(0, 50).map((event) => ({
        status: event.status ?? "unknown",
        description: (event.message ?? "").slice(0, 500),
        occurredAt: event.datetime ?? null,
        location: address(event.tracking_location ?? undefined),
      })),
    };
  }

  async getRates(input: RateRequest): Promise<CarrierRate[]> {
    const shipment = await this.request<{ shipment?: { rates?: Array<{ id: string; carrier: string; service: string; rate: string; currency: string; delivery_days?: number | null }> } }>("/shipments", {
      method: "POST",
      body: JSON.stringify({
        shipment: {
          from_address: input.fromAddress,
          to_address: input.toAddress,
          parcel: input.parcel,
        },
      }),
    });
    return (shipment.shipment?.rates ?? []).map((rate) => ({
      provider: rate.carrier,
      service: rate.service,
      amount: Number(rate.rate),
      currency: rate.currency,
      estimatedDays: rate.delivery_days ?? null,
      rateId: rate.id,
    })).filter((rate) => Number.isFinite(rate.amount) && rate.amount >= 0);
  }

  async createLabel(input: LabelPurchaseRequest): Promise<{ trackingNumber: string; labelUrl: string; transactionId: string }> {
    if (process.env.ENABLE_LABEL_PURCHASES !== "true") {
      throw new Error("Label purchases are disabled. Enable only after production billing and approval checks.");
    }
    const rateId = z.string().min(3).max(128).safeParse(input.rateId);
    if (!rateId.success) throw new Error("Invalid carrier rate ID");
    const transaction = await this.request<{ id: string; tracking_code?: string; label_url?: string }>("/shipments", {
      method: "POST",
      body: JSON.stringify({ shipment: { rate: { id: rateId.data }, label_format: input.labelFormat ?? "PDF", buy: true } }),
    });
    if (!transaction.id || !transaction.tracking_code || !transaction.label_url) {
      throw new Error("Carrier did not return a complete purchased label");
    }
    return { transactionId: transaction.id, trackingNumber: transaction.tracking_code, labelUrl: transaction.label_url };
  }
}
