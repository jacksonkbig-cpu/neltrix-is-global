"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryLinkSent, setRecoveryLinkSent] = useState(false);

  function client() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Password setup is not configured. Please contact the site administrator.");
    return createBrowserClient(url, key);
  }

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createBrowserClient> | undefined;
    try {
      supabase = client();
      void supabase.auth.getSession().then(({ data }) => {
        if (active && data.session?.user) {
          setRecoveryLinkSent(true);
          setMessage("Recovery verified. Choose a new password below.");
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (active && (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session?.user))) {
          setRecoveryLinkSent(true);
          setMessage("Recovery verified. Choose a new password below.");
        }
      });
      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch {
      setError("Password setup is temporarily unavailable. Please try again later.");
      return () => { active = false; };
    }
  }, []);

  async function sendRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = client();
      const redirectTo = new URL("/auth/callback?next=/reset-password", window.location.origin).toString();
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (recoveryError) throw new Error("Could not send the password setup email. Please try again or contact the administrator.");
      setRecoveryLinkSent(false);
      setMessage("If this email belongs to an account, a secure password link will be sent. Check your inbox and spam folder.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not request a password setup link.");
    } finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    if (password.length < 12) { setError("Use at least 12 characters for your new password."); setBusy(false); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); setBusy(false); return; }
    try {
      const supabase = client();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("This recovery link is not active. Request a fresh link and open it on this device.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error("The password could not be saved. Request a fresh setup link and try again.");
      await supabase.auth.signOut();
      setMessage("Password saved. Return to staff sign-in and use your new password.");
      setPassword(""); setConfirmPassword(""); setRecoveryLinkSent(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the password.");
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900"><section className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-7 shadow-sm"><a href="/login" className="text-sm font-semibold text-blue-700 underline">← Back to staff login</a><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">NELTRIX I.S. Global</p><h1 className="mt-2 text-2xl font-bold">Set your staff password</h1><p className="mt-1 text-sm text-slate-600">Request a secure link using your invited staff email. After opening the link, this page will let you choose a new password.</p></div>{!recoveryLinkSent ? <form onSubmit={sendRecovery} className="space-y-4"><label className="block text-sm font-medium">Staff email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><button disabled={busy} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Sending link…" : "Email me a password link"}</button></form> : <form onSubmit={savePassword} className="space-y-4"><label className="block text-sm font-medium">New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><label className="block text-sm font-medium">Confirm new password<input type="password" autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label><button disabled={busy} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving password…" : "Save password"}</button></form>}{message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}</section></main>;
}
