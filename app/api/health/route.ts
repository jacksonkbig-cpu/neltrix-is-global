import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Module-scoped process start time; serverless instances each report their own uptime.
const processStartedAt = Date.now();

export async function GET() {
  let database: "ok" | "unavailable" = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }

  const healthy = database === "ok";
  return Response.json({
    status: healthy ? "ok" : "degraded",
    service: "neltrix-web",
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - processStartedAt) / 1000)),
    checks: { database },
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
