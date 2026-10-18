-- Keep Prisma-owned logistics tables server-only.
-- Browser roles must not query or mutate operational, shipment, customer, or audit records.
REVOKE ALL PRIVILEGES ON TABLE
  public."User", public."Shipment", public."ShipmentNote", public."Quote",
  public."Ticket", public."ChatMessage", public."AuditLog"
FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE
  public."User", public."Shipment", public."ShipmentNote", public."Quote",
  public."Ticket", public."ChatMessage", public."AuditLog"
TO service_role;
