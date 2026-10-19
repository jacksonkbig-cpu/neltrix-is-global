"use client";

import { useState } from "react";

export default function SupportTicketActions({ ticketNumber }: { ticketNumber: string }) {
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [status, setStatus] = useState("");
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reply.trim() || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: internal ? "admin-note" : "admin-reply", ticketNumber, message: reply.trim() }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Reply failed.");
      setReply("");
      setStatus(internal ? "Internal note saved." : "Reply saved in the support inbox. Customer email was not sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveTicket() {
    setResolving(true);
    setStatus("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin-resolve", ticketNumber }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not resolve ticket.");
      setStatus("Ticket resolved. Refresh the inbox to remove it from open tickets.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not resolve ticket.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="mt-4 border-t pt-3">
      <label className="block text-sm font-semibold">Reply (saved internally; email delivery is not configured)
        <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} maxLength={4000} className="mt-1 w-full rounded-lg border p-2 font-normal" />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} /> Internal note</label>
        <p className="text-xs text-slate-500" role="status">{status}</p>
        <div className="flex gap-2">
          <button type="button" disabled={resolving} onClick={() => void resolveTicket()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{resolving ? "Resolving…" : "Mark resolved"}</button>
          <button type="button" disabled={busy || !reply.trim()} onClick={() => void send()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : internal ? "Save note" : "Save reply"}</button>
        </div>
      </div>
    </div>
  );
}
