"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

type OAuthProvider = "google" | "apple";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function client() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Staff sign-in is not configured. Ask the site administrator to configure Supabase.");
    return createBrowserClient(url, key);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const supabase = client();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error("Email or password was not accepted.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign-in completed but the staff session could not be verified.");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "ops") { window.location.assign("/admin"); return; }
      const role = user.app_metadata?.role;
      if (role === "ADMIN" || role === "OPERATIONS_STAFF") { window.location.assign("/admin/shipments"); return; }
      window.location.assign("/unauthorized");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally { setBusy(false); }
  }

  async function signInWithProvider(provider: OAuthProvider) {
    setBusy(true); setError("");
    try {
      const supabase = client();
      const redirectTo = new URL("/auth/callback?next=/admin", window.location.origin).toString();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (oauthError) throw new Error(provider === "google"
        ? "Google sign-in is unavailable. The administrator must enable the Google provider in Supabase."
        : "Apple sign-in is unavailable. The administrator must enable the Apple provider in Supabase.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start sign-in.");
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900"><section className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-7 shadow-sm"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX I.S. Global</p><h1 className="mt-2 text-2xl font-bold">Staff sign in</h1><p className="mt-1 text-sm text-slate-600">Operations dashboard access is restricted to staff with trusted server-assigned roles.</p></div><form onSubmit={signIn} className="space-y-4"><label className="block text-sm font-medium">Email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><label className="block text-sm font-medium">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><button disabled={busy} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form><div className="relative py-1"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-sm text-slate-500">Or continue with</span></div></div><div className="grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={() => void signInWithProvider("google")} className="rounded-lg border p-3 font-semibold hover:bg-slate-50 disabled:opacity-50">Continue with Google</button><button type="button" disabled={busy} onClick={() => void signInWithProvider("apple")} className="rounded-lg border p-3 font-semibold hover:bg-slate-50 disabled:opacity-50">Continue with Apple</button></div>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<p className="text-center text-sm text-slate-600">No password yet? <a href="/reset-password" className="font-semibold text-blue-700 underline">Set or reset your password</a></p><p className="text-xs text-slate-500">Google and Apple sign-in must also be enabled in Supabase authentication settings before use.</p></section></main>;
}
