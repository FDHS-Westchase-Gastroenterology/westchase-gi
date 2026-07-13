import { requireRole } from "@/lib/portal/auth";
import { StubSection } from "../stub-page";

export default async function AdminAuditPage() {
  await requireRole("staff");

  return (
    <StubSection
      title="Audit log"
      lede="Every staff action, on the record."
      detail="This section will list every change made through the portal — status updates, notes, recipient and access changes — with who did it and when."
    />
  );
}
