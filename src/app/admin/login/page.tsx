import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/portal/auth";
import { LoginForm } from "./login-form";

// Credentialed, quiet, unmistakably the practice: a single navy-anchored
// card on the mint canvas. No patient chrome, no marketing. Signed-in
// staff skip straight to the queue.

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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-mint)] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]">
          <div className="bg-[var(--color-navy)] px-8 py-6 text-[var(--color-on-dark)]">
            <p className="font-[var(--font-display)] text-[1.15rem] leading-snug">
              Westchase Gastroenterology
            </p>
            <p className="mt-1 text-[0.8rem] font-bold uppercase tracking-[0.1em] text-[var(--color-on-dark-muted)]">
              Staff portal
            </p>
          </div>
          <div className="px-8 pb-8 pt-7">
            <h1 className="text-[1.35rem] font-black leading-tight text-[var(--color-ink)]">
              Staff sign in
            </h1>
            <p className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]">
              For practice staff only. Patient tools are on the main site.
            </p>
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
          </div>
        </div>
        <p className="mt-5 text-center text-[0.85rem] text-[var(--color-muted)]">
          Trouble signing in? Ask your portal administrator.
        </p>
      </div>
    </main>
  );
}
