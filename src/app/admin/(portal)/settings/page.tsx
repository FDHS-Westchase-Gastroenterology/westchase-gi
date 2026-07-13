import { requireRole } from "@/lib/portal/auth";
import { StubSection } from "../stub-page";

export default async function AdminSettingsPage() {
  await requireRole("staff");

  return (
    <StubSection
      title="Settings"
      lede="Notification recipients and staff access."
      detail="This section will manage which email addresses receive new-request notifications and which staff accounts can open the portal."
    />
  );
}
