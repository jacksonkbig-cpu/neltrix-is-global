import test from "node:test";
import assert from "node:assert/strict";
import { quoteRequestSchema } from "../lib/quotes/validation";

const validRequest = {
  fullName: "Test Customer",
  email: "TEST@example.com",
  phone: "",
  originCountry: "Brazil",
  destinationCountry: "United States",
  shipmentType: "Documents or parcel",
  details: "",
  website: "",
};

test("accepts a valid Brazil to United States quote request and normalizes email", () => {
  const result = quoteRequestSchema.safeParse(validRequest);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.email, "test@example.com");
});

test("rejects countries outside the initial corridor", () => {
  const result = quoteRequestSchema.safeParse({ ...validRequest, originCountry: "Portugal" });
  assert.equal(result.success, false);
});

test("rejects same-country routes", () => {
  const result = quoteRequestSchema.safeParse({ ...validRequest, destinationCountry: "Brazil" });
  assert.equal(result.success, false);
});

test("rejects malformed email and oversized details", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...validRequest, email: "not-an-email" }).success, false);
  assert.equal(quoteRequestSchema.safeParse({ ...validRequest, details: "x".repeat(2001) }).success, false);
});

test("rejects non-empty honeypot submissions", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...validRequest, website: "bot" }).success, false);
});
