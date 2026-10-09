import Link from "next/link";
import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { StaffView } from "@/app/admin/(portal)/settings/staff/staff-view";
import type { StaffMember } from "@/app/admin/(portal)/settings/staff/staff-view";
import { Plus } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { STAFF_ROLES } from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";
import { fetchLastSignInMap } from "@/lib/portal/staff-identity";

import "@/app/admin/(portal)/settings/settings.css";

const staffRowSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  display_name: z.string(),
  role: z.enum(STAFF_ROLES),
  onboarded_at: z.string().nullable(),
  created_at: z.string(),
}) satisfies z.ZodType<Omit<StaffMember, "lastSignInAt">>;

/* Settings › Staff access (issue #355, Figma St4): who can sign in to the
   portal, with which role, and when they last did. Staff read it; admins
   invite, change roles and deactivate. */
export default async function SettingsStaffPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ invite?: string }>;
}>) {
  const db = serviceClient();
  const [session, staffResult, params] = await Promise.all([
    requireRole("staff"),
    db
      .from("staff_profiles")
      .select("user_id, email, display_name, role, onboarded_at, created_at")
      .eq("active", true)
      .order("display_name", { ascending: true }),
    searchParams,
  ]);
  if (staffResult.error) {
    throw new Error(`Staff read failed: ${staffResult.error.code}`);
  }
  const parsedStaff = z.array(staffRowSchema).safeParse(staffResult.data);
  if (!parsedStaff.success) {
    throw new Error("Staff read failed: invalid");
  }
  const staffRows = parsedStaff.data;
  // Last sign-in is a read of existing Auth state, honest when it fails.
  const { map: lastSignInById, readFailed: signInReadFailed } = await fetchLastSignInMap(
    db,
    staffRows.map((row) => row.user_id),
  );
  /* People who have signed in first, then pending invites, oldest first. */
  const staff = staffRows
    .map((row) => ({ ...row, lastSignInAt: lastSignInById.get(row.user_id) ?? null }))
    .toSorted(
      (a, b) =>
        Number(a.onboarded_at === null) - Number(b.onboarded_at === null) ||
        (a.onboarded_at === null ? a.created_at.localeCompare(b.created_at) : 0),
    );
  const canEdit = session.role === "admin";
  /* Read once on the server, so "Today" and "Yesterday" match what the
     client hydrates with. */
  const now = new Date().toISOString();

  return (
    <>
      <PortalPageHeader
        title="Staff access"
        actions={
          canEdit ? (
            <Link
              href="?invite=1"
              scroll={false}
              className="wgi-settings-command"
              data-tour="staff-invite"
            >
              <Plus aria-hidden="true" className="size-4" />
              Invite
            </Link>
          ) : null
        }
      />
      <StaffView
        staff={staff}
        canEdit={canEdit}
        selfUserId={session.id}
        signInReadFailed={signInReadFailed}
        now={now}
        inviting={params.invite === "1"}
      />
    </>
  );
}
