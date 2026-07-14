import { redirect } from "next/navigation";

// The software & access registry now lives on the Settings page. The old
// route stays as a permanent forward so bookmarks and help links keep
// working.
export default function AdminRegistryPage() {
  redirect("/admin/settings#software-heading");
}
