import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/authz";

export const dynamic = "force-dynamic";

async function redisStatus() {
  const url = process.env.RATE_LIMIT_REDIS_REST_URL;
  const token = process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  if (!url || !token) return "not configured";
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:") return "misconfigured";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["PING"]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return response.ok ? "connected" : "unavailable";
  } catch { return "unavailable"; }
}

export default async function AdminHomePage() {
  await requireStaff();
  const [activeShipments, openTickets, latestAudit, redis] = await Promise.all([
    db.shipment.count({ where: { status: { not: "DELIVERED" } } }).catch(() => null),
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }).catch(() => null),
    db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 8, select: { id: true, action: true, ipAddress: true, timestamp: true } }).catch(() => []),
    redisStatus(),
  ]);
  const database = activeShipments === null || openTickets === null ? "unavailable" : "connected";
  return <main className="mx-auto max-w-7xl p-6 text-slate-900">
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX I.S. Global</p><h1 className="mt-1 text-3xl font-bold">Operations overview</h1><p className="mt-2 text-slate-600">Operational indicators for the current serverless instance and shared services.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[{label:"Active shipments",value:activeShipments === null ? "Unavailable" : String(activeShipments)},{label:"Open support tickets",value:openTickets === null ? "Unavailable" : String(openTickets)},{label:"PostgreSQL",value:database},{label:"Rate-limit Redis",value:redis}].map((card) => <section key={card.label} className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-bold capitalize">{card.value}</p></section>)}
    </div>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/admin/shipments" className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Manage shipments</Link><Link href="/admin/support" className="rounded-lg border bg-white px-4 py-2 font-semibold">Support inbox</Link><Link href="/ops" className="rounded-lg border bg-white px-4 py-2 font-semibold">Quote requests</Link><Link href="/admin/audit" className="rounded-lg border bg-white px-4 py-2 font-semibold">Audit trail</Link></div>
    <section className="mt-8 overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-bold">Recent audit activity</h2></div><div className="divide-y">{latestAudit.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span>{item.action}</span><span className="text-slate-500">{item.timestamp.toLocaleString("en-US", { timeZone: "UTC" })} UTC · {item.ipAddress ?? "IP unavailable"}</span></div>)}{latestAudit.length === 0 && <p className="p-5 text-sm text-slate-500">No audit events have been recorded.</p>}</div></section>
  </main>;
}
