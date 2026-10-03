import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { StaffManager } from "@/app/admin/(portal)/settings/staff-manager";
import type { StaffRow } from "@/app/admin/(portal)/settings/staff-manager";
import { requireRole } from "@/lib/portal/auth";
import { STAFF_ROLES } from "@/lib/portal/contracts";
import { serviceClient } from "@/lib/portal/server";
import { fetchLastSignInMap } from "@/lib/portal/staff-identity";

const staffRowSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  display_name: z.string(),
  role: z.enum(STAFF_ROLES),
  active: z.boolean(),
  onboarded_at: z.string().nullable(),
}) satisfies z.ZodType<Omit<StaffRow, "lastSignInAt">>;

// Who can sign in to the portal, and with which role.
export default async function AdminSettingsStaffPage() {
  const db = serviceClient();
  const [session, staffResult] = await Promise.all([
    requireRole("staff"),
    db
      .from("staff_profiles")
      .select("user_id, email, display_name, role, active, onboarded_at")
      .eq("active", true)
      .order("display_name", { ascending: true }),
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
  const staff = staffRows.map((row) => ({
    ...row,
    lastSignInAt: lastSignInById.get(row.user_id) ?? null,
  }));

  return (
    <>
      <PortalPageHeader title="Staff access" />
      <div id="staff" className="mt-6 scroll-mt-6">
        <StaffManager
          staff={staff}
          isAdmin={session.role === "admin"}
          selfUserId={session.id}
          signInReadFailed={signInReadFailed}
        />
      </div>
    </>
  );
}
