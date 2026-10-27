import test, { afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db } from "../lib/db";
import { GET } from "../app/api/tracking/route";
import { CarrierLookupError, lookupCarrier } from "../lib/logistics/carrier";

const originalFetch = globalThis.fetch;
const envKeys = [
  "EASYPOST_API_KEY",
  "CARRIER_TRACKING_URL",
  "CARRIER_API_KEY",
  "ENABLE_MOCK_TRACKING",
] as const;
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof envKeys)[number], string | undefined>;

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof fetch;
}

function configureGenericCarrier() {
  delete process.env.EASYPOST_API_KEY;
  process.env.CARRIER_TRACKING_URL = "https://carrier.example.test/track";
  process.env.CARRIER_API_KEY = "test-only-token";
  delete process.env.ENABLE_MOCK_TRACKING;
}

beforeEach(() => {
  configureGenericCarrier();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("generic carrier HTTP 5xx becomes a safe provider-unavailable error", async () => {
  mockFetch(async () => new Response("private upstream detail", { status: 502 }));

  await assert.rejects(
    () => lookupCarrier("TRACKING12345"),
    (error: unknown) => error instanceof CarrierLookupError
      && !error.message.includes("private upstream detail"),
  );
});

test("generic carrier malformed JSON becomes a provider-unavailable error", async () => {
  mockFetch(async () => new Response("{not-json", { status: 200 }));

  await assert.rejects(() => lookupCarrier("TRACKING12345"), CarrierLookupError);
});

test("generic carrier invalid payload becomes a provider-unavailable error", async () => {
  mockFetch(async () => new Response(JSON.stringify({ status: 17 }), { status: 200 }));

  await assert.rejects(() => lookupCarrier("TRACKING12345"), CarrierLookupError);
});

test("generic carrier network failures become a provider-unavailable error", async () => {
  mockFetch(async () => {
    throw new TypeError("simulated network failure");
  });

  await assert.rejects(() => lookupCarrier("TRACKING12345"), CarrierLookupError);
});

test("generic carrier timeout becomes a provider-unavailable error", async () => {
  mockFetch(async (_input, init) => {
    assert.ok(init?.signal);
    throw new DOMException("simulated timeout", "TimeoutError");
  });

  await assert.rejects(() => lookupCarrier("TRACKING12345"), CarrierLookupError);
});

test("generic carrier 404 remains a genuine not-found result", async () => {
  mockFetch(async () => new Response(null, { status: 404 }));

  assert.equal(await lookupCarrier("TRACKING12345"), null);
});

test("generic carrier valid response is normalized to the existing contract", async () => {
  mockFetch(async () => new Response(JSON.stringify({
    trackingNumber: "TRACKING12345",
    status: "available for pickup",
    origin: "São Paulo",
    destination: "New York",
    carrier: "Example Carrier",
    estimatedDelivery: "2026-10-30T12:00:00Z",
  }), { status: 200 }));

  assert.deepEqual(await lookupCarrier("TRACKING12345"), {
    trackingNumber: "TRACKING12345",
    status: "IN_TRANSIT",
    origin: "São Paulo",
    destination: "New York",
    carrier: "Example Carrier",
    estimatedDelivery: "2026-10-30T12:00:00.000Z",
    source: "carrier",
  });
});

test("incomplete generic carrier configuration fails safely instead of returning not found", async () => {
  delete process.env.CARRIER_API_KEY;

  await assert.rejects(() => lookupCarrier("TRACKING12345"), CarrierLookupError);
});

test("tracking route returns database shipment data without calling a carrier", async () => {
  const shipment = {
    trackingNumber: "TRACKING12345",
    status: "IN_TRANSIT",
    origin: "São Paulo",
    destination: "New York",
    carrier: "NELTRIX",
    estimatedDelivery: new Date("2026-10-30T12:00:00Z"),
  };
  const delegate = db.shipment as unknown as {
    findUnique: (...args: never[]) => Promise<unknown>;
  };
  mock.method(delegate, "findUnique", async () => shipment);
  mockFetch(async () => {
    throw new Error("Carrier must not be called when a database shipment exists");
  });
  delete process.env.CARRIER_TRACKING_URL;
  delete process.env.CARRIER_API_KEY;

  const response = await GET(new NextRequest(
    "https://example.test/api/tracking?trackingNumber=TRACKING12345",
  ));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.tracking.source, "database");
  assert.equal(body.tracking.trackingNumber, "TRACKING12345");
  assert.equal(body.tracking.estimatedDelivery, "2026-10-30T12:00:00.000Z");
});

test("tracking route returns 404 only when the database and configured carriers report not found", async () => {
  const delegate = db.shipment as unknown as {
    findUnique: (...args: never[]) => Promise<unknown>;
  };
  mock.method(delegate, "findUnique", async () => null);
  delete process.env.CARRIER_TRACKING_URL;
  delete process.env.CARRIER_API_KEY;

  const response = await GET(new NextRequest(
    "https://example.test/api/tracking?trackingNumber=TRACKING12345",
  ));
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "Shipment not found");
});

test("tracking route returns a safe 503, not 404, when the database lookup fails", async () => {
  const delegate = db.shipment as unknown as {
    findUnique: (...args: never[]) => Promise<unknown>;
  };
  mock.method(delegate, "findUnique", async () => {
    const error = new Error("sensitive database connection details");
    error.name = "PrismaClientInitializationError";
    Object.assign(error, { code: "P1001" });
    throw error;
  });
  delete process.env.CARRIER_TRACKING_URL;
  delete process.env.CARRIER_API_KEY;

  const response = await GET(new NextRequest(
    "https://example.test/api/tracking?trackingNumber=TRACKING12345",
  ));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(body), /sensitive database connection details|P1001/);
});

test("tracking route returns a safe 503 for a generic carrier outage", async () => {
  const delegate = db.shipment as unknown as {
    findUnique: (...args: never[]) => Promise<unknown>;
  };
  mock.method(delegate, "findUnique", async () => null);
  mockFetch(async () => new Response("private upstream detail", { status: 503 }));

  const response = await GET(new NextRequest(
    "https://example.test/api/tracking?trackingNumber=TRACKING12345",
  ));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(body), /private upstream detail|test-only-token/);
});
