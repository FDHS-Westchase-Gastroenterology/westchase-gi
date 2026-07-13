import { redirect } from "next/navigation";

// Placeholder route guard: unauthenticated visitors always land on the
// login surface. m2-auth replaces this with a real session check
// enforced in src/proxy.ts; until then /admin holds no content at all.
export default function AdminIndexPage() {
  redirect("/admin/login");
}
