import { LoginForm } from "@/app/admin/login/login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <p className="text-sm font-bold text-[var(--color-teal-ink)]">
          Westchase Gastroenterology
        </p>
        <h1 className="h3 mt-3 font-[var(--font-display)] text-[var(--color-ink)]">
          Staff sign in
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--color-muted)]">
          Use your practice-issued account to access the staff portal.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
