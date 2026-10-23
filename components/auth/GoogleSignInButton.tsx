"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type GoogleSignInButtonProps = {
  redirectTo?: string;
};

export default function GoogleSignInButton({ redirectTo = "/dashboard" }: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Google sign-in is not configured.");
      const supabase = createBrowserClient(url, key);
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", redirectTo);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (oauthError) throw new Error("Google sign-in is unavailable. Please try again later.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void signIn()}
        className="w-full rounded-lg border p-3 font-semibold hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
