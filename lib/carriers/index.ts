import "server-only";
import type { CarrierProvider } from "./types";
import { EasyPostCarrier } from "./easypost";

export function getCarrierProvider(): CarrierProvider | null {
  if (process.env.EASYPOST_API_KEY) return new EasyPostCarrier();
  return null;
}
export type { CarrierProvider, CarrierTracking, CarrierRate, RateRequest, LabelPurchaseRequest } from "./types";
