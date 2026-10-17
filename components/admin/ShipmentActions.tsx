"use client";

import { useState } from "react";

type Props = { id: string; status: string; trackingNumber: string; carrier: string };

export default function ShipmentActions({ id, status, trackingNumber, carrier }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [nextStatus, setNextStatus] = useState(status);
  const [nextTracking, setNextTracking] = useState(trackingNumber);
  const [nextCarrier, setNextCarrier] = useState(carrier);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/shipments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus !== status ? nextStatus : undefined,
          trackingNumber: nextTracking.trim() !== trackingNumber ? nextTracking.trim() : undefined,
          carrier: nextCarrier.trim() !== carrier ? nextCarrier.trim() : undefined,
          internalNote: note.trim() || undefined,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Update failed.");
      setMessage("Saved. Refresh the page to view current shipment data.");
      setNote("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-32">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-lg border border-blue-200 px-3 py-1.5 font-semibold text-blue-800 hover:bg-blue-50">{expanded ? "Close" : "Manage"}</button>
      {expanded && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}>
        <section role="dialog" aria-modal="true" aria-label="Manage shipment" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Manage shipment</h2><button type="button" onClick={() => setExpanded(false)} aria-label="Close" className="px-2 text-xl">×</button></div>
          <label className="block text-sm font-medium">Status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className="mt-1 w-full rounded-lg border p-2">{["PENDING", "IN_TRANSIT", "DELIVERED", "EXCEPTION"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-medium">Tracking number<input value={nextTracking} onChange={(event) => setNextTracking(event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border p-2 font-mono" /></label>
          <label className="block text-sm font-medium">Carrier<input value={nextCarrier} onChange={(event) => setNextCarrier(event.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="block text-sm font-medium">Internal note (staff only)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={3000} rows={3} className="mt-1 w-full rounded-lg border p-2" placeholder="Visible to operations staff only" /></label>
          {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setExpanded(false)} className="rounded-lg border px-4 py-2">Cancel</button><button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button></div>
        </section>
      </div>}
    </div>
  );
}
