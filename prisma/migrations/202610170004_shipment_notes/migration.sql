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
