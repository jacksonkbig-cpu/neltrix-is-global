import { db } from "@/lib/db";
import { requireStaff } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireStaff(["ADMIN"]);
  const [events, notes] = await Promise.all([
    db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 200 }),
    db.shipmentNote.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { shipment: { select: { trackingNumber: true } } } }),
  ]);
  return <main className="mx-auto max-w-7xl space-y-8 p-6 text-slate-900">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Restricted · Administrators only</p><h1 className="mt-1 text-3xl font-bold">Audit trail</h1><p className="mt-2 text-slate-600">Latest 200 audit events and 100 internal shipment notes. Do not share this view with customers.</p></div>
    <section className="overflow-x-auto rounded-xl border bg-white"><h2 className="border-b p-4 font-bold">Audit events</h2><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Time (UTC)</th><th className="p-3">Action</th><th className="p-3">IP address</th><th className="p-3">User agent</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-t"><td className="p-3">{event.timestamp.toLocaleString("en-US", { timeZone: "UTC" })}</td><td className="p-3">{event.action}</td><td className="p-3">{event.ipAddress ?? "—"}</td><td className="max-w-xs truncate p-3">{event.userAgent ?? "—"}</td></tr>)}</tbody></table>{events.length === 0 && <p className="p-5 text-sm text-slate-500">No events recorded.</p>}</section>
    <section className="overflow-x-auto rounded-xl border bg-white"><h2 className="border-b p-4 font-bold">Internal shipment notes</h2><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Time (UTC)</th><th className="p-3">Tracking number</th><th className="p-3">Note</th></tr></thead><tbody>{notes.map((note) => <tr key={note.id} className="border-t"><td className="p-3">{note.createdAt.toLocaleString("en-US", { timeZone: "UTC" })}</td><td className="p-3 font-mono">{note.shipment.trackingNumber}</td><td className="whitespace-pre-wrap p-3">{note.note}</td></tr>)}</tbody></table>{notes.length === 0 && <p className="p-5 text-sm text-slate-500">No internal notes recorded.</p>}</section>
  </main>;
}
