"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function OpsLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage("Sign-in failed. Check your staff account details and Supabase configuration.");
        return;
      }
      window.location.assign("/ops");
    } catch {
      setMessage("Staff sign-in is not configured yet. Set up Supabase before using this page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ops-shell">
      <section className="ops-panel">
        <Link href="/" className="ops-back">← NELTRIX I.S. Global</Link>
        <p className="eyebrow dark">STAFF ACCESS</p>
        <h1>Operations sign in</h1>
        <p>Staff accounts must be created by an administrator in Supabase. Public sign-up is intentionally disabled.</p>
        <form className="quote-form" onSubmit={signIn}>
          <label>Email address<input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
          {message && <p role="status" className="notice">{message}</p>}
        </form>
      </section>
    </main>
  );
}
