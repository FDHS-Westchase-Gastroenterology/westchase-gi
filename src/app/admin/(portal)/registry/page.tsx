import { permanentRedirect } from "next/navigation";

// The software & access registry now lives on its own Settings sub-page.
// The old route stays as a permanent forward so bookmarks and help links
// keep working.
export default function AdminRegistryPage() {
  permanentRedirect("/admin/settings/software");
}
