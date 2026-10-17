"use client";

import { useState } from "react";

export default function SupportTicketActions({ ticketNumber }: { ticketNumber: string }) {
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [status, setStatus] = useState("");
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
      setStatus(internal ? "Internal note saved." : "Reply saved. Refresh to see the conversation.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reply failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-4 border-t pt-3"><label className="block text-sm font-semibold">Reply to customer<textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} maxLength={4000} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><div className="mt-2 flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} /> Internal note</label><p className="text-xs text-slate-500" role="status">{status}</p><button type="button" disabled={busy || !reply.trim()} onClick={() => void send()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send reply"}</button></div></div>;
}
