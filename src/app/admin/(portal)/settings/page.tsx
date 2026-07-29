import { requireRole } from "@/lib/portal/auth";
import { fetchLastSignInMap } from "@/lib/portal/staff-identity";
import { serviceClient } from "@/lib/portal/server";
import { RecipientsManager, type RecipientRow } from "./recipients-manager";
import { StaffManager, type StaffRow } from "./staff-manager";

// Default Settings sub-page: the frequent, staff-facing configuration.
// The website custody record lives on the sibling /admin/settings/software.

export default async function AdminSettingsPage() {
  const db = serviceClient();
  const [session, recipientsResult, staffResult] = await Promise.all([
    requireRole("staff"),
    db
      .from("notification_recipients")
      .select("id, email, label, active")
      .order("email", { ascending: true }),
    db
      .from("staff_profiles")
      .select("user_id, email, display_name, role, active, onboarded_at")
      .eq("active", true)
      .order("display_name", { ascending: true }),
  ]);
  const isAdmin = session.role === "admin";

  if (recipientsResult.error) {
    throw new Error(`Recipient read failed: ${recipientsResult.error.code}`);
  }
  if (staffResult.error) {
    throw new Error(`Staff read failed: ${staffResult.error.code}`);
  }

  // Last sign-in is the highest-value adoption signal available without any
  // new tracking: a read of existing Auth state, honest when it fails.
  const staffRows = (staffResult.data ?? []) as StaffRow[];
  const { map: lastSignInById, readFailed: signInReadFailed } =
    await fetchLastSignInMap(
      db,
      staffRows.map((row) => row.user_id),
    );
  const staff = staffRows.map((row) => ({
    ...row,
    lastSignInAt: lastSignInById.get(row.user_id) ?? null,
  }));

  return (
    <div className="space-y-10">
      <p className="max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
        Who gets notified when an appointment request arrives, and who can
        open this portal.
      </p>

      {/* Anchor wrappers give the home-page task rows stable deep links. */}
      <div id="notifications" className="scroll-mt-6">
        <RecipientsManager
          recipients={(recipientsResult.data ?? []) as RecipientRow[]}
          isAdmin={isAdmin}
        />
      </div>
      <div id="staff" className="scroll-mt-6">
        <StaffManager
          staff={staff}
          isAdmin={isAdmin}
          selfUserId={session.id}
          signInReadFailed={signInReadFailed}
        />
      </div>
    </div>
  );
}
