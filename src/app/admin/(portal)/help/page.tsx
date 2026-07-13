import { requireRole } from "@/lib/portal/auth";
import { StubSection } from "../stub-page";

export default async function AdminHelpPage() {
  await requireRole("staff");

  return (
    <StubSection
      title="Help"
      lede="How this portal works, in plain language."
      detail="This section will explain the request queue, triage statuses, notes, notification settings, and staff access — written for the front desk, not for engineers."
    />
  );
}
