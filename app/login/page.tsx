"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("Staff sign-in is not configured. Ask the site administrator to configure Supabase.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createBrowserClient(url, key);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error("Email or password was not accepted.");
      window.location.assign("/admin/shipments");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900"><form onSubmit={signIn} className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-7 shadow-sm"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX I.S. Global</p><h1 className="mt-2 text-2xl font-bold">Staff sign in</h1><p className="mt-1 text-sm text-slate-600">Operations dashboard access is restricted to staff with trusted server-assigned roles.</p></div><label className="block text-sm font-medium">Email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><label className="block text-sm font-medium">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form></main>;
}
