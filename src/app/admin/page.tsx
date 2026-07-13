import { logoutAction } from "@/app/admin/actions";
import { requireRole } from "@/lib/portal/auth";

export default async function AdminIndexPage() {
  const session = await requireRole("staff");

  return (
    <main className="container-tight py-16 sm:py-24">
      <div className="card p-8 sm:p-10">
        <p className="text-sm font-bold text-[var(--color-teal-ink)]">
          Staff portal
        </p>
        <h1 className="h2 mt-3">Welcome, {session.displayName}</h1>
        <p className="mt-5 text-sm font-bold text-[var(--color-muted)]">
          Signed in as
        </p>
        <p
          data-testid="session-email"
          className="mt-1 break-all text-[var(--color-ink)]"
        >
          {session.email}
        </p>
        <form action={logoutAction} className="mt-8">
          <button type="submit" className="btn btn-navy">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
