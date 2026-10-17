export type CarrierTracking = {
  trackingNumber: string;
  carrier: string;
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "EXCEPTION" | "UNKNOWN";
  origin: string | null;
  destination: string | null;
  estimatedDelivery: string | null;
  events: Array<{ status: string; description: string; occurredAt: string | null; location: string | null }>;
};

export type RateRequest = {
  fromAddress: { name?: string; street1: string; city: string; state?: string; zip: string; country: string; phone?: string; email?: string };
  toAddress: { name?: string; street1: string; city: string; state?: string; zip: string; country: string; phone?: string; email?: string };
  parcel: { length: number; width: number; height: number; distanceUnit: "cm" | "in"; weight: number; massUnit: "kg" | "lb" };
};

export type CarrierRate = { provider: string; service: string; amount: number; currency: string; estimatedDays: number | null; rateId: string; shipmentId: string };
export type LabelPurchaseRequest = { shipmentId: string; rateId: string; labelFormat?: "PDF" | "PNG" | "ZPL" };

export interface CarrierProvider {
  getTracking(trackingNumber: string, carrier?: string): Promise<CarrierTracking | null>;
  getRates(request: RateRequest): Promise<CarrierRate[]>;
  createLabel(request: LabelPurchaseRequest): Promise<{ trackingNumber: string; labelUrl: string; transactionId: string }>;
}
