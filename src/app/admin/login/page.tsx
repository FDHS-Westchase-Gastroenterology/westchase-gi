import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/portal/auth";
import { LoginForm } from "./login-form";

// Credentialed, quiet, unmistakably the practice: a single navy-anchored
// card on the mint canvas. No patient chrome, no marketing. Signed-in
// staff skip straight to the queue.

export default async function AdminLoginPage() {
  const session = await getSessionUser();
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
              For practice staff only. Patient pages never link here.
            </p>
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
