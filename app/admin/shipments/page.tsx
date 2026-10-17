import { db } from "@/lib/db";
import { requireStaff } from "@/lib/authz";
import ShipmentActions from "@/components/admin/ShipmentActions";

export const dynamic = "force-dynamic";

export default async function AdminShipmentsPage() {
  await requireStaff();
  const shipments = await db.shipment.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, trackingNumber: true, status: true, origin: true, destination: true, carrier: true, estimatedDelivery: true, updatedAt: true },
  });
  const active = shipments.filter((item) => item.status !== "DELIVERED").length;
  return (
    <main className="mx-auto max-w-7xl p-6 text-slate-900">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX Operations</p><h1 className="text-3xl font-bold">Shipment dashboard</h1><p className="mt-1 text-slate-600">Latest 100 shipments. Status changes should be performed through an authenticated audited action.</p></div>
        <div className="rounded-xl border bg-white px-5 py-3"><p className="text-sm text-slate-500">Active shipments</p><p className="text-2xl font-bold">{active}</p></div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Tracking</th><th className="p-3">Status</th><th className="p-3">Carrier</th><th className="p-3">Origin</th><th className="p-3">Destination</th><th className="p-3">ETA</th><th className="p-3">Updated</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{shipments.map((shipment) => <tr key={shipment.id} className="border-t"><td className="p-3 font-mono font-semibold">{shipment.trackingNumber}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1">{shipment.status.replace("_", " ")}</span></td><td className="p-3">{shipment.carrier}</td><td className="p-3">{shipment.origin}</td><td className="p-3">{shipment.destination}</td><td className="p-3">{shipment.estimatedDelivery?.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" }) ?? "—"}</td><td className="p-3">{shipment.updatedAt.toLocaleString("en-US", { timeZone: "UTC" })} UTC</td><td className="p-3"><ShipmentActions id={shipment.id} status={shipment.status} trackingNumber={shipment.trackingNumber} carrier={shipment.carrier} /></td></tr>)}</tbody>
        </table>
        {shipments.length === 0 && <p className="p-8 text-center text-slate-500">No shipments have been recorded yet.</p>}
      </div>
    </main>
  );
}
