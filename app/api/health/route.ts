import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const processStartedAt = Date.now();

type Check = "connected" | "incomplete" | "unavailable";

async function tableExists(table: string): Promise<boolean> {
  const relation = ["User", "Shipment", "ShipmentNote", "Quote", "Ticket", "ChatMessage", "AuditLog"].includes(table)
    ? `public."${table}"`
    : `public.${table}`;
  const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass(${relation}) IS NOT NULL AS exists
  `;
  return rows[0]?.exists === true;
}

async function safeCheck(check: () => Promise<boolean>): Promise<Check> {
  try {
    return (await check()) ? "connected" : "incomplete";
  } catch {
    return "unavailable";
  }
}

export async function GET() {
  let database: Check = "unavailable";
  let prismaSchema: Check = "unavailable";
  let supabaseIntakeSchema: Check = "unavailable";

  try {
    await db.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (error) {
    // Emit a safe diagnostic category to deployment logs; never log raw connection
    // strings, passwords, query parameters, or complete Prisma error messages.
    const failure = error && typeof error === "object"
      ? error as { name?: unknown; code?: unknown; message?: unknown }
      : undefined;
    const message = typeof failure?.message === "string" ? failure.message.toLowerCase() : "";
    const reason =
      /authentication failed|password authentication|invalid credentials/.test(message) ? "authentication_failed" :
      /can't reach database server|could not connect|connection refused|econnrefused|etimedout|timed out|timeout/.test(message) ? "database_unreachable" :
      /malformed connection string|invalid .*url|datasource.*url|must start with/.test(message) ? "invalid_connection_config" :
      /database .*does not exist|unknown database/.test(message) ? "database_not_found" :
      "database_query_failed";
    const diagnostic = {
      name: typeof failure?.name === "string" ? failure.name : "UnknownError",
      code: typeof failure?.code === "string" ? failure.code : undefined,
      reason,
    };
    console.error("[health] database connection failed", diagnostic);
    return Response.json({
      status: "degraded",
      service: "neltrix-web",
      uptimeSeconds: Math.max(0, Math.floor((Date.now() - processStartedAt) / 1000)),
      checks: { database, prismaSchema, supabaseIntakeSchema },
      timestamp: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const prismaTables = [
    "User", "Shipment", "ShipmentNote", "Quote", "Ticket", "ChatMessage", "AuditLog",
  ];
  const prismaResults = await Promise.all(prismaTables.map((table) => safeCheck(() => tableExists(table))));
  prismaSchema = prismaResults.every((result) => result === "connected")
    ? "connected"
    : prismaResults.some((result) => result === "unavailable") ? "unavailable" : "incomplete";

  const intakeResults = await Promise.all([
    safeCheck(() => tableExists("profiles")),
    safeCheck(() => tableExists("quote_requests")),
    safeCheck(async () => {
      const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
        SELECT to_regprocedure(
          'public.submit_quote_request(text,text,text,text,text,text,text,text)'
        ) IS NOT NULL AS exists
      `;
      return rows[0]?.exists === true;
    }),
  ]);
  supabaseIntakeSchema = intakeResults.every((result) => result === "connected")
    ? "connected"
    : intakeResults.some((result) => result === "unavailable") ? "unavailable" : "incomplete";

  const healthy = database === "connected" &&
    prismaSchema === "connected" &&
    supabaseIntakeSchema === "connected";

  return Response.json({
    status: healthy ? "ok" : "degraded",
    service: "neltrix-web",
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - processStartedAt) / 1000)),
    checks: { database, prismaSchema, supabaseIntakeSchema },
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
