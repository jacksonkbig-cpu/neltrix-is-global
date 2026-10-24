"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function DashboardSignOut() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setBusy(false);
      return;
    }
    router.replace("/dashboard/sign-in");
    router.refresh();
  }

  return <button type="button" onClick={() => void signOut()} disabled={busy} className="font-semibold text-slate-600 underline hover:text-blue-700 disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>;
}
