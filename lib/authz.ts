import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type StaffRole = "ADMIN" | "OPERATIONS_STAFF" | "CARRIER";
export type StaffContext = { userId: string; email: string; role: StaffRole };

export async function getStaffContext(allowedRoles: StaffRole[] = ["ADMIN", "OPERATIONS_STAFF"]): Promise<StaffContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot write cookies; middleware handles session refresh.
        }
      },
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Roles must be assigned by trusted server-side admin tooling in app_metadata.
  const role = user.app_metadata?.role;
  if (typeof role !== "string" || !allowedRoles.includes(role as StaffRole)) return null;
  return { userId: user.id, email: user.email ?? "", role: role as StaffRole };
}

export async function requireStaff(allowedRoles: StaffRole[] = ["ADMIN", "OPERATIONS_STAFF"]) {
  const staff = await getStaffContext(allowedRoles);
  if (!staff) redirect("/login?reason=staff-access-required");
  return staff;
}
