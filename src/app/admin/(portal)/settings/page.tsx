import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { RecipientsManager, type RecipientRow } from "./recipients-manager";
import { StaffManager, type StaffRow } from "./staff-manager";

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
    <section aria-labelledby="settings-heading" className="space-y-10">
      <div>
        <h1
          id="settings-heading"
          className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
        >
          Settings
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
          Who gets notified about new requests, and who can open this portal.
        </p>
      </div>

      <RecipientsManager
        recipients={(recipientsResult.data ?? []) as RecipientRow[]}
        isAdmin={isAdmin}
      />
      <StaffManager
        staff={(staffResult.data ?? []) as StaffRow[]}
        isAdmin={isAdmin}
        selfUserId={session.id}
      />
    </section>
  );
}
