import Link from "next/link";
import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { NotificationsView } from "@/app/admin/(portal)/settings/notifications/notifications-view";
import type { Recipient } from "@/app/admin/(portal)/settings/notifications/notifications-view";
import { Plus } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { portalSenderName } from "@/lib/portal/email-provider";
import { NOTIFICATION_SUBJECT, notificationText } from "@/lib/portal/intake-notification";
import { portalUrl, serviceClient } from "@/lib/portal/server";

import "@/app/admin/(portal)/settings/settings.css";

const recipientRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  label: z.string().nullable(),
  active: z.boolean(),
}) satisfies z.ZodType<Recipient>;

/* Settings › Notifications (issue #355, Figma St6): who gets an email when
   a patient sends a request, and the email itself. Staff read it; admins
   change it. The preview is the server's own text, so it matches what is
   sent; where the portal link isn't configured it shows where the link goes. */
export default async function AdminSettingsNotificationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ add?: string }>;
}>) {
  const [session, recipientsResult, params] = await Promise.all([
    requireRole("staff"),
    serviceClient()
      .from("notification_recipients")
      .select("id, email, label, active")
      .order("created_at", { ascending: true }),
    searchParams,
  ]);
  if (recipientsResult.error) {
    throw new Error(`Recipient read failed: ${recipientsResult.error.code}`);
  }
  const parsedRecipients = z.array(recipientRowSchema).safeParse(recipientsResult.data);
  if (!parsedRecipients.success) {
    throw new Error("Recipient read failed: invalid");
  }
  const canEdit = session.role === "admin";

  return (
    <>
      <PortalPageHeader
        title="Notifications"
        actions={
          canEdit ? (
            <Link href="?add=1" scroll={false} className="wgi-settings-command">
              <Plus aria-hidden="true" className="size-4" />
              Add email
            </Link>
          ) : null
        }
      />
      <NotificationsView
        recipients={parsedRecipients.data}
        canEdit={canEdit}
        adding={params.add === "1"}
        preview={{
          from: portalSenderName(),
          subject: NOTIFICATION_SUBJECT,
          body: notificationText(portalUrl("/admin") ?? "/admin"),
        }}
      />
    </>
  );
}
