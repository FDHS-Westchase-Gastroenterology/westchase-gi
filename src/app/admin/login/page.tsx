// Placeholder login surface so the /admin guard has an honest target.
// m2-auth wires the real credential form; m2-portal-shell restyles it.
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="card w-full max-w-md p-8 text-center sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-teal-ink)]">
          Westchase Gastroenterology
        </p>
        <h1 className="h3 mt-3 font-[var(--font-display)] text-[var(--color-ink)]">
          Staff sign in
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed">
          The staff portal is being provisioned. Sign-in opens here once
          setup completes — no patient-facing pages link to this area.
        </p>
      </div>
    </main>
  );
}
