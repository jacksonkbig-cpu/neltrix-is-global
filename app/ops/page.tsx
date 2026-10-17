import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type QuoteRequest = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  origin_country: string;
  destination_country: string;
  shipment_type: string;
  details: string | null;
  status: string;
  created_at: string;
};

export default async function OpsPage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return <main className="ops-shell"><section className="ops-panel"><h1>Operations is not configured</h1><p>Configure Supabase environment variables and apply the database migration before staff access is enabled.</p><Link href="/ops/login">Staff sign in</Link></section></main>;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ops/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "ops") {
    return <main className="ops-shell"><section className="ops-panel"><h1>Access not authorized</h1><p>This account is not assigned the operations role. Ask a repository/business administrator to review access.</p><form action="/auth/signout" method="post"><button className="button primary" type="submit">Sign out</button></form></section></main>;
  }

  const { data, error } = await supabase.from("quote_requests").select("id,full_name,email,phone,origin_country,destination_country,shipment_type,details,status,created_at").order("created_at", { ascending: false }).limit(100);
  const quotes = (data ?? []) as QuoteRequest[];

  return <main className="ops-shell ops-wide">
    <header className="ops-header"><div><p className="eyebrow dark">NELTRIX I.S. GLOBAL</p><h1>Quote requests</h1><p>Private staff workspace · latest 100 requests</p></div><form action="/auth/signout" method="post"><button className="button ghost-dark" type="submit">Sign out</button></form></header>
    {error && <p role="alert" className="notice">Could not load requests. Check the database migration and staff role.</p>}
    {!error && quotes.length === 0 && <section className="ops-panel"><h2>No quote requests yet</h2><p>Requests will appear here after Supabase is configured and the public quote endpoint is enabled.</p></section>}
    {quotes.length > 0 && <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Received</th><th>Customer</th><th>Route</th><th>Shipment</th><th>Status</th><th>Details</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td>{new Date(quote.created_at).toLocaleString("en-US")}</td><td><strong>{quote.full_name}</strong><br/><a href={`mailto:${quote.email}`}>{quote.email}</a>{quote.phone && <><br/>{quote.phone}</>}</td><td>{quote.origin_country} → {quote.destination_country}</td><td>{quote.shipment_type}</td><td>{quote.status}</td><td>{quote.details || "—"}</td></tr>)}</tbody></table></div>}
    <p className="ops-footnote">Customer data is sensitive. Access is restricted by Supabase authentication and row-level security.</p>
  </main>;
}
