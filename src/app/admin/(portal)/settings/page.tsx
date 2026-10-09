import { redirect } from "next/navigation";

import { requireRole } from "@/lib/portal/auth";

// Settings opens on Providers, who works when, for everyone (issue #352).
export default async function AdminSettingsPage() {
  await requireRole("staff");
  redirect("/admin/settings/providers");
}
