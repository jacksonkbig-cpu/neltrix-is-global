import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Module-scoped process start time; serverless instances each report their own uptime.
const processStartedAt = Date.now();

type SchemaRow = {
  userTable: boolean;
  shipmentTable: boolean;
  shipmentNoteTable: boolean;
  quoteTable: boolean;
  ticketTable: boolean;
  chatMessageTable: boolean;
  auditLogTable: boolean;
};

export async function GET() {
  let database: "ok" | "unavailable" = "ok";
  let prismaSchema: "ok" | "incomplete" | "unavailable" = "unavailable";

  try {
    await db.$queryRawUnsafe("SELECT 1");
    database = "ok";
    const rows = await db.$queryRawUnsafe<SchemaRow[]>(`
      SELECT
        to_regclass('public."User"') IS NOT NULL AS "userTable",
        to_regclass('public."Shipment"') IS NOT NULL AS "shipmentTable",
        to_regclass('public."ShipmentNote"') IS NOT NULL AS "shipmentNoteTable",
        to_regclass('public."Quote"') IS NOT NULL AS "quoteTable",
        to_regclass('public."Ticket"') IS NOT NULL AS "ticketTable",
        to_regclass('public."ChatMessage"') IS NOT NULL AS "chatMessageTable",
        to_regclass('public."AuditLog"') IS NOT NULL AS "auditLogTable"
    `);
    const schema = rows[0];
    prismaSchema = schema && Object.values(schema).every(Boolean) ? "ok" : "incomplete";
  } catch {
    if (database === "ok") prismaSchema = "unavailable";
    else database = "unavailable";
  }

  const healthy = database === "ok" && prismaSchema === "ok";
  return Response.json({
    status: healthy ? "ok" : "degraded",
    service: "neltrix-web",
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - processStartedAt) / 1000)),
    checks: { database, prismaSchema },
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
