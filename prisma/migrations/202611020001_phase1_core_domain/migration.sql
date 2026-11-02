-- NELTRIX Phase 1: additive core domain and access-control foundation.
-- This migration intentionally preserves all existing shipment/quote records.
-- Do not apply until the existing Prisma migration history is safely baselined.

ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'LABEL_CREATED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'BOOKED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'AT_FACILITY';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'CUSTOMS_HOLD';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_ATTEMPTED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'RETURN_IN_TRANSIT';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "User" ADD COLUMN "authSubject" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
CREATE UNIQUE INDEX "User_authSubject_key" ON "User"("authSubject");

CREATE TYPE "OrganizationType" AS ENUM ('BUSINESS', 'INDIVIDUAL');
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'BILLING');
CREATE TYPE "ShipmentEventSource" AS ENUM ('CARRIER', 'INTERNAL', 'SYSTEM', 'ADMIN');
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'SUCCEEDED', 'FAILED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL DEFAULT 'BUSINESS',
  "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
  "billingEmail" TEXT,
  "taxIdentifier" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Organization_status_createdAt_idx" ON "Organization"("status", "createdAt");
CREATE INDEX "Organization_type_name_idx" ON "Organization"("type", "name");

CREATE TABLE "OrganizationMember" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("organizationId", "userId")
);
CREATE INDEX "OrganizationMember_userId_role_idx" ON "OrganizationMember"("userId", "role");
ALTER TABLE "OrganizationMember"
  ADD CONSTRAINT "OrganizationMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember"
  ADD CONSTRAINT "OrganizationMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Address" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "organizationId" TEXT,
  "label" TEXT,
  "contactName" TEXT NOT NULL,
  "companyName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "region" TEXT,
  "postalCode" TEXT NOT NULL,
  "countryCode" CHAR(2) NOT NULL,
  "residential" BOOLEAN NOT NULL DEFAULT false,
  "validatedAt" TIMESTAMP(3),
  "validationProvider" TEXT,
  "validationReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Address_countryCode_length_check" CHECK (char_length(trim("countryCode")) = 2)
);
CREATE INDEX "Address_ownerId_createdAt_idx" ON "Address"("ownerId", "createdAt");
CREATE INDEX "Address_organizationId_createdAt_idx" ON "Address"("organizationId", "createdAt");
CREATE INDEX "Address_countryCode_postalCode_idx" ON "Address"("countryCode", "postalCode");
ALTER TABLE "Address"
  ADD CONSTRAINT "Address_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Address"
  ADD CONSTRAINT "Address_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Shipment"
  ADD COLUMN "carrierTrackingNumber" TEXT,
  ADD COLUMN "serviceCode" TEXT,
  ADD COLUMN "currency" CHAR(3),
  ADD COLUMN "quotedAmountMinor" BIGINT,
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "senderAddressId" TEXT,
  ADD COLUMN "recipientAddressId" TEXT;
CREATE INDEX "Shipment_organizationId_status_createdAt_idx" ON "Shipment"("organizationId", "status", "createdAt");
CREATE INDEX "Shipment_carrier_carrierTrackingNumber_idx" ON "Shipment"("carrier", "carrierTrackingNumber");
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_senderAddressId_fkey"
  FOREIGN KEY ("senderAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_recipientAddressId_fkey"
  FOREIGN KEY ("recipientAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShipmentPackage" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "packageNumber" INTEGER NOT NULL DEFAULT 1,
  "weightGrams" INTEGER NOT NULL,
  "lengthMm" INTEGER NOT NULL,
  "widthMm" INTEGER NOT NULL,
  "heightMm" INTEGER NOT NULL,
  "declaredValueMinor" BIGINT,
  "declaredValueCurrency" CHAR(3),
  "contentsDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShipmentPackage_packageNumber_positive_check" CHECK ("packageNumber" > 0),
  CONSTRAINT "ShipmentPackage_weight_positive_check" CHECK ("weightGrams" > 0),
  CONSTRAINT "ShipmentPackage_dimensions_positive_check" CHECK ("lengthMm" > 0 AND "widthMm" > 0 AND "heightMm" > 0),
  CONSTRAINT "ShipmentPackage_declaredValue_nonnegative_check" CHECK ("declaredValueMinor" IS NULL OR "declaredValueMinor" >= 0)
);
CREATE UNIQUE INDEX "ShipmentPackage_shipmentId_packageNumber_key" ON "ShipmentPackage"("shipmentId", "packageNumber");
CREATE INDEX "ShipmentPackage_shipmentId_idx" ON "ShipmentPackage"("shipmentId");
ALTER TABLE "ShipmentPackage"
  ADD CONSTRAINT "ShipmentPackage_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShipmentEvent" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" "ShipmentStatus" NOT NULL,
  "description" TEXT NOT NULL,
  "originalStatusCode" TEXT,
  "source" "ShipmentEventSource" NOT NULL,
  "sourceIntegration" TEXT,
  "sourceReference" TEXT,
  "locationName" TEXT,
  "locationCity" TEXT,
  "locationRegion" TEXT,
  "locationCountryCode" CHAR(2),
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "actorId" TEXT,
  CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShipmentEvent_eventKey_key" UNIQUE ("eventKey")
);
CREATE INDEX "ShipmentEvent_shipmentId_occurredAt_idx" ON "ShipmentEvent"("shipmentId", "occurredAt");
CREATE INDEX "ShipmentEvent_sourceIntegration_sourceReference_idx" ON "ShipmentEvent"("sourceIntegration", "sourceReference");
CREATE INDEX "ShipmentEvent_status_occurredAt_idx" ON "ShipmentEvent"("status", "occurredAt");
ALTER TABLE "ShipmentEvent"
  ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentEvent"
  ADD CONSTRAINT "ShipmentEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shipment events are append-only. Corrections must be represented by a new event.
CREATE OR REPLACE FUNCTION prevent_shipment_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Shipment events are append-only; create a correction event instead.';
END;
$$;
CREATE TRIGGER "ShipmentEvent_immutable_trigger"
BEFORE UPDATE OR DELETE ON "ShipmentEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_shipment_event_mutation();

CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

CREATE TABLE "RolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "organizationId" TEXT,
  "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoleAssignment_scope_check"
    CHECK (
      ("organizationId" IS NULL AND "scopeKey" = 'GLOBAL')
      OR ("organizationId" IS NOT NULL AND "scopeKey" = 'ORG:' || "organizationId")
    )
);
CREATE UNIQUE INDEX "RoleAssignment_userId_roleId_scopeKey_key" ON "RoleAssignment"("userId", "roleId", "scopeKey");
CREATE INDEX "RoleAssignment_organizationId_roleId_idx" ON "RoleAssignment"("organizationId", "roleId");
CREATE INDEX "RoleAssignment_userId_organizationId_idx" ON "RoleAssignment"("userId", "organizationId");
ALTER TABLE "RoleAssignment"
  ADD CONSTRAINT "RoleAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment"
  ADD CONSTRAINT "RoleAssignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment"
  ADD CONSTRAINT "RoleAssignment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment"
  ADD CONSTRAINT "RoleAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "scope" VARCHAR(80) NOT NULL,
  "key" VARCHAR(200) NOT NULL,
  "requestHash" VARCHAR(128) NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "responsePayload" JSONB,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");
CREATE INDEX "IdempotencyRecord_status_expiresAt_idx" ON "IdempotencyRecord"("status", "expiresAt");
CREATE INDEX "IdempotencyRecord_resourceType_resourceId_idx" ON "IdempotencyRecord"("resourceType", "resourceId");

-- Seed a permission catalog and system-role templates only. No users are granted
-- privileges automatically; assignments require an explicit trusted admin action.
INSERT INTO "Role" ("id", "key", "name", "description", "isSystem", "createdAt", "updatedAt")
VALUES
  ('role_platform_admin', 'platform_admin', 'Platform administrator', 'Full platform administration.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_operations_staff', 'operations_staff', 'Operations staff', 'Shipment handling and operational exception management.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_dispatcher', 'dispatcher', 'Dispatcher', 'Dispatch, courier assignment and route management.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_driver', 'driver', 'Driver', 'Access to assigned delivery work and delivery confirmation.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_support_agent', 'support_agent', 'Customer support', 'Customer support and shipment assistance.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_finance', 'finance', 'Finance', 'Payment, refund and invoice operations.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_security_auditor', 'security_auditor', 'Security auditor', 'Read-only audit and investigation access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_customer', 'customer', 'Customer', 'Personal shipment and quote access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_business_owner', 'business_owner', 'Business account owner', 'Business account administration and shipment access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_business_member', 'business_member', 'Business team member', 'Scoped business shipment access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Permission" ("id", "key", "description")
VALUES
  ('permission_shipment_create', 'shipment.create', 'Create a shipment booking.'),
  ('permission_shipment_read_own', 'shipment.read.own', 'Read shipments owned by the authenticated user.'),
  ('permission_shipment_read_assigned', 'shipment.read.assigned', 'Read shipments assigned to the authenticated driver.'),
  ('permission_shipment_read_all', 'shipment.read.all', 'Read all shipments; platform administrator only.'),
  ('permission_shipment_read_operations', 'shipment.read.operations', 'Read shipments within assigned operational facility or region.'),
  ('permission_shipment_read_dispatch_queue', 'shipment.read.dispatch_queue', 'Read shipments eligible for the dispatcher's assigned queues.'),
  ('permission_shipment_read_support', 'shipment.read.support', 'Read only the shipment details permitted for customer support.'),
  ('permission_shipment_read_audit', 'shipment.read.audit', 'Read shipment event metadata within an authorized audit investigation.'),
  ('permission_shipment_update_own', 'shipment.update.own', 'Request changes to eligible owned shipments.'),
  ('permission_shipment_scan', 'shipment.scan', 'Record authorized shipment scans.'),
  ('permission_shipment_dispatch', 'shipment.dispatch', 'Dispatch shipments and assign couriers.'),
  ('permission_shipment_correct', 'shipment.correct', 'Record an audited correction to shipment state.'),
  ('permission_shipment_cancel', 'shipment.cancel', 'Cancel eligible shipments.'),
  ('permission_quote_create', 'quote.create', 'Create a shipping quote.'),
  ('permission_quote_read_own', 'quote.read.own', 'Read quotes owned by the authenticated user.'),
  ('permission_pricing_manage', 'pricing.manage', 'Manage pricing tables and service rates.'),
  ('permission_payment_read', 'payment.read', 'Read payment and reconciliation records.'),
  ('permission_payment_refund', 'payment.refund', 'Issue refunds within finance policy.'),
  ('permission_invoice_read', 'invoice.read', 'Read invoices.'),
  ('permission_invoice_manage', 'invoice.manage', 'Create and manage invoices.'),
  ('permission_organization_manage', 'organization.manage', 'Manage an assigned business organization.'),
  ('permission_support_manage', 'support.manage', 'Manage support cases and customer communications.'),
  ('permission_audit_read', 'audit.read', 'Read security and operational audit records.'),
  ('permission_user_manage', 'user.manage', 'Manage user accounts.'),
  ('permission_role_manage', 'role.manage', 'Assign roles and manage permissions.'),
  ('permission_route_manage', 'route.manage', 'Create and manage delivery routes.'),
  ('permission_delivery_confirm', 'delivery.confirm', 'Record delivery outcomes and proof metadata.')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."key" = 'platform_admin'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM (VALUES
  ('operations_staff', 'shipment.read.operations'),
  ('operations_staff', 'shipment.scan'),
  ('operations_staff', 'shipment.correct'),
  ('dispatcher', 'shipment.read.dispatch_queue'),
  ('dispatcher', 'shipment.scan'),
  ('dispatcher', 'shipment.dispatch'),
  ('dispatcher', 'route.manage'),
  ('driver', 'shipment.read.assigned'),
  ('driver', 'shipment.scan'),
  ('driver', 'delivery.confirm'),
  ('support_agent', 'shipment.read.support'),
  ('support_agent', 'support.manage'),
  ('finance', 'payment.read'),
  ('finance', 'payment.refund'),
  ('finance', 'invoice.read'),
  ('finance', 'invoice.manage'),
  ('security_auditor', 'audit.read'),
  ('security_auditor', 'shipment.read.audit'),
  ('customer', 'shipment.create'),
  ('customer', 'shipment.read.own'),
  ('customer', 'shipment.update.own'),
  ('customer', 'quote.create'),
  ('customer', 'quote.read.own'),
  ('business_owner', 'shipment.create'),
  ('business_owner', 'shipment.read.own'),
  ('business_owner', 'shipment.update.own'),
  ('business_owner', 'quote.create'),
  ('business_owner', 'quote.read.own'),
  ('business_owner', 'organization.manage'),
  ('business_owner', 'invoice.read'),
  ('business_member', 'shipment.create'),
  ('business_member', 'shipment.read.own'),
  ('business_member', 'shipment.update.own'),
  ('business_member', 'quote.create'),
  ('business_member', 'quote.read.own')
) AS grants("roleKey", "permissionKey")
JOIN "Role" r ON r."key" = grants."roleKey"
JOIN "Permission" p ON p."key" = grants."permissionKey"
ON CONFLICT DO NOTHING;

-- New tables are server-managed. Supabase browser roles receive no direct access.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShipmentPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShipmentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoleAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyRecord" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  "Organization", "OrganizationMember", "Address", "ShipmentPackage",
  "ShipmentEvent", "Role", "Permission", "RolePermission",
  "RoleAssignment", "IdempotencyRecord"
FROM anon, authenticated;
