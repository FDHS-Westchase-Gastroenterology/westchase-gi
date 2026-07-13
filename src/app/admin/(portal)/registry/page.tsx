import { requireRole } from "@/lib/portal/auth";
import { StubSection } from "../stub-page";

export default async function AdminRegistryPage() {
  await requireRole("staff");

  return (
    <StubSection
      title="Software & access registry"
      lede="Your software, and who can touch it."
      detail="This section will list the practice's software assets — website, tools, this portal — with who maintains each and who holds access, so custody survives staff turnover."
    />
  );
}
