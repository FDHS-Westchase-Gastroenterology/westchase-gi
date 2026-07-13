import { requireRole } from "@/lib/portal/auth";

// Queue placeholder: m2-requests-ux replaces this page with the live
// request queue. Keeps the session render the auth E2E depends on.

export default async function AdminRequestsPage() {
  const session = await requireRole("staff");

  return (
    <section aria-labelledby="requests-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="requests-heading"
            className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
          >
            Requests
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
            Appointment requests from the website land here the moment a
            patient submits the form.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-8 sm:p-10">
        <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
          The live queue is being provisioned
        </h2>
        <p className="mt-2 max-w-[60ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
          Tonight&apos;s build adds the request list, status triage, and
          staff notes in this space. The intake pipeline is already live and
          recording submissions durably — nothing is lost in the meantime.
        </p>
        <p className="mt-6 text-sm font-bold text-[var(--color-muted)]">
          Signed in as
        </p>
        <p
          data-testid="session-email"
          className="mt-1 break-all text-[var(--color-ink)]"
        >
          {session.email}
        </p>
      </div>
    </section>
  );
}
