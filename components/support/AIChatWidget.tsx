"use client";

import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello! I can help with shipping questions or connect you with our support team." },
  ]);
  const [draft, setDraft] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function sendMessage() {
    const content = draft.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", messages: next.slice(-12), ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}) }),
      });
      if (!response.ok) throw new Error("Chat is temporarily unavailable.");
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";
        setMessages((current) => [...current, { role: "assistant", content: "" }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
              answer += chunk.choices?.[0]?.delta?.content ?? "";
              setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: answer } : message));
            } catch { /* Ignore malformed partial SSE frames. */ }
          }
        }
      } else {
        const data = await response.json() as { message?: string };
        setMessages((current) => [...current, { role: "assistant", content: data.message ?? "I could not answer that just now." }]);
      }
    } catch {
      setError("The assistant is unavailable. Please try again or request human support.");
    } finally {
      setBusy(false);
    }
  }

  async function requestHumanSupport() {
    const message = [...messages].reverse().find((item) => item.role === "user")?.content;
    if (!message || busy) {
      setError("Send a message first so our team knows how to help.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "handoff", message, messages: messages.slice(-20) }),
      });
      const data = await response.json() as { ticket?: { ticketNumber?: string }; error?: string };
      if (!response.ok || !data.ticket?.ticketNumber) throw new Error(data.error ?? "Could not create support ticket.");
      setTicket(data.ticket.ticketNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create support ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {open && (
        <section className="mb-3 flex h-[min(70vh,34rem)] w-[min(92vw,23rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="NELTRIX support chat">
          <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div><p className="font-semibold">NELTRIX Support</p><p className="text-xs text-slate-300">Shipping assistant</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat" className="rounded px-2 py-1 hover:bg-slate-700">×</button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-blue-700 text-white" : "bg-slate-100 text-slate-900"}`}>
                {message.content || (busy ? "…" : "")}
              </div>
            ))}
            {ticket && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900">Support ticket created: <strong>{ticket}</strong></p>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          </div>
          <form className="border-t border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
            <label htmlFor="neltrix-chat-tracking" className="mb-1 block text-xs font-medium text-slate-600">Optional tracking number</label><input id="neltrix-chat-tracking" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={64} className="mb-2 w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-blue-600" placeholder="Enter tracking number for status lookup" /><label htmlFor="neltrix-chat-message" className="sr-only">Your message</label>
            <textarea id="neltrix-chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={2} className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-blue-600" placeholder="How can we help?" />
            <div className="mt-2 flex gap-2">
              <button type="submit" disabled={busy || !draft.trim()} className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Working…" : "Send"}</button>
              <button type="button" disabled={busy || !!ticket} onClick={() => void requestHumanSupport()} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50">Request human support</button>
            </div>
          </form>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-2xl text-white shadow-xl hover:bg-blue-800" aria-label={open ? "Close support chat" : "Open support chat"}>✦</button>
    </div>
  );
}
