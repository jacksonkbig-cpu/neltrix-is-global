import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { EasyPostCarrier, normalizeEasyPostStatus } from "../lib/carriers/easypost";
import { lookupCarrier } from "../lib/logistics/carrier";

const originalFetch = globalThis.fetch;
const envKeys = ["EASYPOST_API_KEY", "CARRIER_TRACKING_URL", "CARRIER_API_KEY", "ENABLE_MOCK_TRACKING"] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<(typeof envKeys)[number], string | undefined>;

const tracker = (overrides: Record<string, unknown> = {}) => ({
  id: "trk_test_123",
  object: "Tracker",
  mode: "test",
  tracking_code: "EZ1000000001",
  carrier: "USPS",
  status: "in_transit",
  est_delivery_date: "2026-10-30T12:00:00Z",
  from_address: { city: "São Paulo", state: null, country: "BR" },
  to_address: { city: "New York", state: "NY", country: "US" },
  tracking_details: [{
    status: "in_transit",
    message: "Package accepted",
    datetime: "2026-10-27T10:00:00Z",
    tracking_location: { city: "Miami", state: "FL", country: "US" },
  }],
  ...overrides,
});

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof fetch;
}

beforeEach(() => {
  process.env.EASYPOST_API_KEY = "test-only-key";
  delete process.env.CARRIER_TRACKING_URL;
  delete process.env.CARRIER_API_KEY;
  delete process.env.ENABLE_MOCK_TRACKING;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("parses EasyPost's documented top-level Tracker response", async () => {
  mockFetch(async () => new Response(JSON.stringify(tracker()), { status: 201 }));
  const result = await new EasyPostCarrier().getTracking("EZ1000000001");

  assert.ok(result);
  assert.equal(result.trackingNumber, "EZ1000000001");
  assert.equal(result.carrier, "USPS");
  assert.equal(result.status, "IN_TRANSIT");
  assert.equal(result.origin, "São Paulo, BR");
  assert.equal(result.destination, "New York, NY, US");
  assert.equal(result.estimatedDelivery, "2026-10-30T12:00:00.000Z");
  assert.deepEqual(result.events[0], {
    status: "in_transit",
    description: "Package accepted",
    occurredAt: "2026-10-27T10:00:00Z",
    location: "Miami, FL, US",
  });
});

test("rejects the incorrect { tracker: ... } wrapper and malformed payloads", async () => {
  mockFetch(async () => new Response(JSON.stringify({ tracker: tracker() }), { status: 200 }));
  await assert.rejects(() => new EasyPostCarrier().getTracking("EZ1000000001"), /invalid tracking response/);

  mockFetch(async () => new Response(JSON.stringify({ tracking_code: 7 }), { status: 200 }));
  await assert.rejects(() => new EasyPostCarrier().getTracking("EZ1000000001"), /invalid tracking response/);
});

test("rejects a response for a different tracking number", async () => {
  mockFetch(async () => new Response(JSON.stringify(tracker({ tracking_code: "OTHER12345" })), { status: 200 }));
  await assert.rejects(() => new EasyPostCarrier().getTracking("EZ1000000001"), /mismatched tracking number/);
});

test("normalizes all supported EasyPost statuses, including pickup and error", () => {
  assert.equal(normalizeEasyPostStatus("pre_transit"), "PENDING");
  assert.equal(normalizeEasyPostStatus("in_transit"), "IN_TRANSIT");
  assert.equal(normalizeEasyPostStatus("out_for_delivery"), "IN_TRANSIT");
  assert.equal(normalizeEasyPostStatus("available_for_pickup"), "IN_TRANSIT");
  assert.equal(normalizeEasyPostStatus("delivered"), "DELIVERED");
  assert.equal(normalizeEasyPostStatus("failure"), "EXCEPTION");
  assert.equal(normalizeEasyPostStatus("return_to_sender"), "EXCEPTION");
  assert.equal(normalizeEasyPostStatus("cancelled"), "EXCEPTION");
  assert.equal(normalizeEasyPostStatus("error"), "EXCEPTION");
  assert.equal(normalizeEasyPostStatus("unknown"), "UNKNOWN");
  assert.equal(normalizeEasyPostStatus("future_status"), "UNKNOWN");
});

test("reports HTTP provider errors without exposing response bodies", async () => {
  mockFetch(async () => new Response("sensitive provider detail", { status: 401 }));
  await assert.rejects(
    () => new EasyPostCarrier().getTracking("EZ1000000001"),
    (error: unknown) => error instanceof Error
      && /HTTP 401/.test(error.message)
      && !error.message.includes("sensitive provider detail"),
  );
});

test("rejects invalid JSON from the provider", async () => {
  mockFetch(async () => new Response("{not-json", { status: 200 }));
  await assert.rejects(() => new EasyPostCarrier().getTracking("EZ1000000001"), /invalid JSON/);
});

test("propagates fetch timeouts so the tracking route can return a safe 503", async () => {
  mockFetch(async (_input, init) => {
    assert.ok(init?.signal);
    throw new DOMException("The operation timed out", "TimeoutError");
  });
  await assert.rejects(
    () => new EasyPostCarrier().getTracking("EZ1000000001"),
    (error: unknown) => error instanceof Error && error.name === "TimeoutError",
  );
});

test("normalizes provider data to the existing carrier-sourced tracking contract", async () => {
  mockFetch(async () => new Response(JSON.stringify(tracker()), { status: 201 }));
  const result = await lookupCarrier("EZ1000000001");

  assert.deepEqual(result, {
    trackingNumber: "EZ1000000001",
    status: "IN_TRANSIT",
    origin: "São Paulo, BR",
    destination: "New York, NY, US",
    carrier: "USPS",
    estimatedDelivery: "2026-10-30T12:00:00.000Z",
    source: "carrier",
  });
});
