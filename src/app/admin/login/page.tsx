import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/portal/auth";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

// Credentialed, quiet, unmistakably the practice: a single navy-anchored
// card on the mint canvas. No patient chrome, no marketing. Signed-in
// staff skip straight to the portal home.

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string; auth?: string }>;
}) {
  const [query, session] = await Promise.all([
    searchParams,
    getSessionUser(),
  ]);
  if (session) redirect("/admin");

  return (
    <AuthCard
      title="Staff sign in"
      description="For practice staff only. Patient tools are on the main site."
      footer="Trouble signing in? Ask your portal administrator."
    >
      {query.password === "updated" ? (
        <p
          data-testid="password-updated"
          className="mt-5 rounded-[var(--radius)] bg-[var(--color-mint-2)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}
      {query.auth === "invalid" ? (
        <p
          role="alert"
          className="mt-5 rounded-[var(--radius)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          That setup or reset link is no longer valid. Request another
          reset or ask your portal administrator for a new invitation.
        </p>
      ) : null}
      <LoginForm />
    </AuthCard>
  );
}
