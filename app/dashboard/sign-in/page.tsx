"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  return value;
}

export default function CustomerSignInPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safeNextPath(searchParams.get("next"));

  function client() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Customer sign-in is not configured. Please contact NELTRIX support.");
    return createBrowserClient(url, key);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = client();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw new Error("Email or password was not accepted.");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Your sign-in could not be verified. Please try again.");
      window.location.assign(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-extrabold uppercase tracking-wide text-blue-700">NELTRIX I.S. Global</Link>
        <h1 className="mt-4 text-2xl font-bold">Your customer account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to view shipments assigned to your account and check their latest recorded status.</p>
        <div className="mt-6"><GoogleSignInButton redirectTo={next} /></div>
        <div className="relative my-5"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-sm text-slate-500">or use email</span></div></div>
        <form onSubmit={signIn} className="space-y-4">
          <label className="block text-sm font-medium">Email address<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="block text-sm font-medium">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? "Signing in…" : "Sign in securely"}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p className="mt-5 text-center text-sm text-slate-600">Staff member? <Link href="/login" className="font-semibold text-blue-700 underline">Staff login</Link></p>
        <p className="mt-3 text-center text-sm"><Link href="/" className="text-slate-500 underline">Return to NELTRIX home</Link></p>
      </section>
    </main>
  );
}
