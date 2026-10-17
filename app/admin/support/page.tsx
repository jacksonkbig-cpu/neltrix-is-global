import { db } from "@/lib/db";
import { requireStaff } from "@/lib/authz";
import SupportTicketActions from "@/components/admin/SupportTicketActions";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requireStaff();
  const tickets = await db.ticket.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 100,
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });
  return (
    <main className="mx-auto max-w-6xl p-6 text-slate-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX Operations</p><h1 className="mt-1 text-3xl font-bold">Support inbox</h1><p className="mt-2 text-slate-600">Open tickets, customer conversations, and clearly marked staff-only notes.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">{ticket.ticketNumber}</h2><p className="mt-1 font-medium">{ticket.subject}</p>{ticket.customerEmail && <p className="mt-1 text-xs text-slate-500">Contact: {ticket.customerEmail}</p>}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{ticket.priority}</span></div>
          <p className="mt-2 text-xs text-slate-500">{ticket.status.replace("_", " ")} · Updated {ticket.updatedAt.toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
          <div className="mt-4 max-h-60 space-y-2 overflow-y-auto border-t pt-3">{ticket.messages.map((message) => <div key={message.id} className={`rounded-lg p-3 ${message.isInternalNote ? "border border-amber-300 bg-amber-50" : "bg-slate-50"}`}><p className="mb-1 text-xs font-semibold uppercase text-slate-500">{message.isInternalNote ? "INTERNAL NOTE · " : ""}{message.sender} · {message.createdAt.toLocaleString("en-US", { timeZone: "UTC" })} UTC</p><p className="whitespace-pre-wrap text-sm">{message.message}</p></div>)}</div><SupportTicketActions ticketNumber={ticket.ticketNumber} />
        </article>)}
        {tickets.length === 0 && <p className="rounded-xl border bg-white p-8 text-slate-500">No open support tickets.</p>}
      </div>
    </main>
  );
}
