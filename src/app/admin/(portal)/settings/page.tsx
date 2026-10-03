import { redirect } from "next/navigation";

import { requireRole } from "@/lib/portal/auth";

// Settings opens on Providers for admins and on Staff access for staff (issue #352).
export default async function AdminSettingsPage() {
  const session = await requireRole("staff");
  redirect(session.role === "admin" ? "/admin/settings/providers" : "/admin/settings/staff");
}
