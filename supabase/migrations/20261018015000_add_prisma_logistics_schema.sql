-- Additive Prisma logistics schema for NELTRIX.
-- Existing Supabase quote-intake tables are intentionally untouched.
-- RLS is enabled on every new public table; no client policies are granted.

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'OPERATIONS_STAFF', 'CARRIER');
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION');
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'PRICED', 'REJECTED', 'EXPIRED', 'INDICATIVE', 'BINDING', 'ACCEPTED');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ChatSender" AS ENUM ('CUSTOMER', 'AI', 'ADMIN');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL,
  "trackingNumber" TEXT NOT NULL,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "carrier" TEXT NOT NULL,
  "estimatedDelivery" TIMESTAMP(3),
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");
CREATE INDEX "Shipment_userId_createdAt_idx" ON "Shipment"("userId", "createdAt");
CREATE INDEX "Shipment_status_updatedAt_idx" ON "Shipment"("status", "updatedAt");
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShipmentNote" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "authorId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShipmentNote_shipmentId_createdAt_idx" ON "ShipmentNote"("shipmentId", "createdAt");
CREATE INDEX "ShipmentNote_authorId_createdAt_idx" ON "ShipmentNote"("authorId", "createdAt");
ALTER TABLE "ShipmentNote" ADD CONSTRAINT "ShipmentNote_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentNote" ADD CONSTRAINT "ShipmentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Quote" (
  "id" TEXT NOT NULL,
  "senderZip" TEXT NOT NULL,
  "receiverZip" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "weight" DECIMAL(10,2) NOT NULL,
  "dimensions" JSONB NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "status" "QuoteStatus" NOT NULL DEFAULT 'INDICATIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");
CREATE INDEX "Quote_status_createdAt_idx" ON "Quote"("status", "createdAt");

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "userId" TEXT,
  "customerEmail" TEXT,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "subject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_status_priority_updatedAt_idx" ON "Ticket"("status", "priority", "updatedAt");
CREATE INDEX "Ticket_userId_createdAt_idx" ON "Ticket"("userId", "createdAt");
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "sender" "ChatSender" NOT NULL,
  "message" TEXT NOT NULL,
  "isInternalNote" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatMessage_ticketId_createdAt_idx" ON "ChatMessage"("ticketId", "createdAt");
CREATE INDEX "ChatMessage_sender_createdAt_idx" ON "ChatMessage"("sender", "createdAt");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "userId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_action_timestamp_idx" ON "AuditLog"("action", "timestamp");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShipmentNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
