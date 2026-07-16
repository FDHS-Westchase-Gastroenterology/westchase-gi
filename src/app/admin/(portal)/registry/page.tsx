import { permanentRedirect } from "next/navigation";

// Compatibility redirect for bookmarks from the retired software registry.
export default function AdminRegistryPage() {
  permanentRedirect("/admin/settings/software");
}
