import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/authz";
import ShipmentActions from "@/components/admin/ShipmentActions";

export const dynamic = "force-dynamic";

const statuses = ["PENDING", "IN_TRANSIT", "DELIVERED", "EXCEPTION"] as const;

export default async function AdminShipmentsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff();
  const params = await searchParams;
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status as typeof statuses[number] : undefined;
  const query = (params.q ?? "").trim().slice(0, 64);
  const where = {
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { trackingNumber: { contains: query, mode: "insensitive" as const } },
      { origin: { contains: query, mode: "insensitive" as const } },
      { destination: { contains: query, mode: "insensitive" as const } },
    ] } : {}),
  };
  const [shipments, active] = await Promise.all([
    db.shipment.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, trackingNumber: true, status: true, origin: true, destination: true, carrier: true, estimatedDelivery: true, updatedAt: true },
    }),
    db.shipment.count({ where: { status: { not: "DELIVERED" } } }),
  ]);
  return (
    <main className="mx-auto max-w-7xl p-6 text-slate-900">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX Operations</p><h1 className="text-3xl font-bold">Shipment dashboard</h1><p className="mt-1 text-slate-600">Filter shipments and use the audited management drawer to change operational data.</p></div>
        <div className="rounded-xl border bg-white px-5 py-3"><p className="text-sm text-slate-500">Active shipments</p><p className="text-2xl font-bold">{active}</p></div>
      </div>
      <form method="get" className="mb-4 flex flex-wrap gap-2 rounded-xl border bg-white p-3">
        <label className="sr-only" htmlFor="shipment-query">Search shipments</label><input id="shipment-query" name="q" defaultValue={query} placeholder="Tracking, origin, destination" maxLength={64} className="min-w-56 flex-1 rounded-lg border p-2 text-sm" />
        <label className="sr-only" htmlFor="shipment-status">Filter status</label><select id="shipment-status" name="status" defaultValue={status ?? ""} className="rounded-lg border p-2 text-sm"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select>
        <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Filter</button><Link href="/admin/shipments" className="rounded-lg border px-4 py-2 text-sm">Reset</Link>
      </form>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Tracking</th><th className="p-3">Status</th><th className="p-3">Carrier</th><th className="p-3">Origin</th><th className="p-3">Destination</th><th className="p-3">ETA</th><th className="p-3">Updated</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{shipments.map((shipment) => <tr key={shipment.id} className="border-t"><td className="p-3 font-mono font-semibold">{shipment.trackingNumber}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1">{shipment.status.replace("_", " ")}</span></td><td className="p-3">{shipment.carrier}</td><td className="p-3">{shipment.origin}</td><td className="p-3">{shipment.destination}</td><td className="p-3">{shipment.estimatedDelivery?.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" }) ?? "—"}</td><td className="p-3">{shipment.updatedAt.toLocaleString("en-US", { timeZone: "UTC" })} UTC</td><td className="p-3"><ShipmentActions id={shipment.id} status={shipment.status} trackingNumber={shipment.trackingNumber} carrier={shipment.carrier} /></td></tr>)}</tbody>
        </table>
        {shipments.length === 0 && <p className="p-8 text-center text-slate-500">No shipments match these filters.</p>}
      </div>
    </main>
  );
}
