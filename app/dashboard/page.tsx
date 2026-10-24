import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import DashboardSignOut from "@/components/dashboard/DashboardSignOut";

export const dynamic = "force-dynamic";
export const metadata = { title: "My shipments | NELTRIX I.S. Global" };

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  IN_TRANSIT: "bg-blue-50 text-blue-800",
  DELIVERED: "bg-emerald-50 text-emerald-800",
  EXCEPTION: "bg-red-50 text-red-800",
};

export default async function CustomerDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect("/dashboard/sign-in?next=%2Fdashboard");

  let customer: { id: string; email: string; shipments: Array<{
    id: string; trackingNumber: string; status: string; origin: string; destination: string;
    carrier: string; estimatedDelivery: Date | null; createdAt: Date; updatedAt: Date;
  }> } | null = null;
  let databaseUnavailable = false;

  if (user.email) {
    try {
      // Match the verified Supabase identity to the application's customer record.
      // Never accept a customer/user ID from query parameters or form input.
      customer = await db.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          shipments: {
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
              id: true, trackingNumber: true, status: true, origin: true, destination: true,
              carrier: true, estimatedDelivery: true, createdAt: true, updatedAt: true,
            },
          },
        },
      });
    } catch (error) {
      databaseUnavailable = true;
      console.error("[customer-dashboard] Shipment lookup failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        code: typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined,
      });
    }
  }

  const shipments = customer?.shipments ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-950">NELTRIX <span className="font-medium text-blue-700">I.S. Global</span></Link>
          <nav aria-label="Customer navigation" className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/" className="text-slate-600 hover:text-blue-700">Home</Link>
            <Link href="/#track" className="text-slate-600 hover:text-blue-700">Track shipment</Link>
            <DashboardSignOut />
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Customer account</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">My shipments</h1>
            <p className="mt-2 text-slate-600">Signed in as {user.email ?? "customer"}.</p>
          </div>
          <Link href="/#quote" className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Request a quote</Link>
        </div>

        {databaseUnavailable && (
          <div role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            We could not load shipment history right now. Your sign-in is still active; please try again shortly.
          </div>
        )}

        {!databaseUnavailable && !customer && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Your shipment history will appear here</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Your account is signed in, but no customer profile is linked to this email yet. Contact NELTRIX support and ask them to link your customer account before shipments are assigned.</p>
            <Link href="/#quote" className="mt-4 inline-flex font-semibold text-blue-700 underline">Contact NELTRIX</Link>
          </div>
        )}

        {!databaseUnavailable && customer && shipments.length === 0 && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true">N</div>
            <h2 className="mt-4 text-xl font-semibold">No shipments assigned yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-600">When a shipment is linked to your NELTRIX customer profile, its status and tracking number will appear here.</p>
            <Link href="/#quote" className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Request a shipping quote</Link>
          </div>
        )}

        {shipments.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Shipment history</h2><p className="mt-1 text-sm text-slate-500">{shipments.length} {shipments.length === 1 ? "shipment" : "shipments"} associated with your account</p></div>
            <ul className="divide-y divide-slate-100">
              {shipments.map((shipment) => (
                <li key={shipment.id} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="break-all font-semibold">{shipment.trackingNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{shipment.origin} <span aria-hidden="true">→</span> {shipment.destination}</p>
                    <p className="mt-1 text-sm text-slate-500">{shipment.carrier || "Carrier to be confirmed"} · Updated {shipment.updatedAt.toLocaleDateString()}</p>
                    {shipment.estimatedDelivery && <p className="mt-1 text-sm text-slate-600">Estimated delivery: {shipment.estimatedDelivery.toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[shipment.status] ?? "bg-slate-100 text-slate-700"}`}>{shipment.status.replaceAll("_", " ")}</span>
                    <Link href={`/?tracking=${encodeURIComponent(shipment.trackingNumber)}#track`} className="font-semibold text-blue-700 underline">Track</Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-6 text-xs text-slate-500">Only shipments assigned to your verified customer account are displayed. If a shipment is missing, contact support to verify the account association.</p>
      </section>
    </main>
  );
}
