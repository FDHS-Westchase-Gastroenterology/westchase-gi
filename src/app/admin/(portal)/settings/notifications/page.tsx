import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { RecipientsManager } from "@/app/admin/(portal)/settings/recipients-manager";
import type { RecipientRow } from "@/app/admin/(portal)/settings/recipients-manager";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

const recipientRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  label: z.string().nullable(),
  active: z.boolean(),
}) satisfies z.ZodType<RecipientRow>;

// Who hears about new appointment requests. Staff read it; admins change it.
export default async function AdminSettingsNotificationsPage() {
  const [session, recipientsResult] = await Promise.all([
    requireRole("staff"),
    serviceClient()
      .from("notification_recipients")
      .select("id, email, label, active")
      .order("email", { ascending: true }),
  ]);
  if (recipientsResult.error) {
    throw new Error(`Recipient read failed: ${recipientsResult.error.code}`);
  }
  const parsedRecipients = z.array(recipientRowSchema).safeParse(recipientsResult.data);
  if (!parsedRecipients.success) {
    throw new Error("Recipient read failed: invalid");
  }

  return (
    <>
      <PortalPageHeader title="Notifications" />
      <div id="notifications" className="mt-6 scroll-mt-6">
        <RecipientsManager recipients={parsedRecipients.data} isAdmin={session.role === "admin"} />
      </div>
    </>
  );
}
