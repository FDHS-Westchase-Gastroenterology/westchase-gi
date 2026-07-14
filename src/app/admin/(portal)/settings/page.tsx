import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { RecipientsManager, type RecipientRow } from "./recipients-manager";
import { StaffManager, type StaffRow } from "./staff-manager";

// Default Settings sub-page: the frequent, staff-facing configuration.
// The software custody record lives on the sibling /admin/settings/software.

export default async function AdminSettingsPage() {
  const session = await requireRole("staff");
  const isAdmin = session.role === "admin";

  const db = serviceClient();
  const [recipientsResult, staffResult] = await Promise.all([
    db
      .from("notification_recipients")
      .select("id, email, label, active")
      .order("email", { ascending: true }),
    db
      .from("staff_profiles")
      .select("user_id, email, display_name, role, active")
      .order("display_name", { ascending: true }),
  ]);
  if (recipientsResult.error) {
    throw new Error(`Recipient read failed: ${recipientsResult.error.code}`);
  }
  if (staffResult.error) {
    throw new Error(`Staff read failed: ${staffResult.error.code}`);
  }

  return (
    <div className="space-y-10">
      <p className="max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
        Who gets notified when a request arrives, and who can open this
        portal.
      </p>

      <RecipientsManager
        recipients={(recipientsResult.data ?? []) as RecipientRow[]}
        isAdmin={isAdmin}
      />
      <StaffManager
        staff={(staffResult.data ?? []) as StaffRow[]}
        isAdmin={isAdmin}
        selfUserId={session.id}
      />
    </div>
  );
}
