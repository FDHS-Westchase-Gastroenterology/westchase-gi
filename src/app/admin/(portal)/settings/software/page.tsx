import Link from "next/link";
import { requireRole } from "@/lib/portal/auth";
import {
  CANONICAL_REPOSITORY,
  getGitHubRepositoryStatus,
} from "@/lib/portal/integrations";

const CAPABILITIES = [
  "Patient-facing website",
  "Authenticated staff portal",
  "Review-flyer printing",
] as const;

export default async function AdminSettingsSoftwarePage() {
  const session = await requireRole("staff");
  const github = await getGitHubRepositoryStatus();
  const repository =
    github.state === "connected" ? github.repository : CANONICAL_REPOSITORY;
  const statusLabel =
    github.state === "connected"
      ? "Connected"
      : github.state === "not_configured"
        ? "Not configured"
        : "Connection unavailable";

  return (
    <section
      data-testid="managed-product"
      aria-labelledby="website-heading"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-[var(--color-teal-ink)]">
            Clinic website
          </p>
          <h2
            id="website-heading"
            className="mt-1 text-[1.3rem] font-black leading-tight text-[var(--color-ink)]"
          >
            Westchase GI
          </h2>
          <p className="mt-2 max-w-[62ch] text-[0.92rem] leading-relaxed text-[var(--color-body)]">
            This is the practice&rsquo;s own software — the website patients
            see and the staff tools behind it. It belongs to Westchase GI,
            and this page is where the practice controls it.
          </p>
        </div>
        {session.role === "admin" && (
          <Link href="/admin/review-flyers" className="btn btn-navy">
            Print review flyers
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 border-t border-[var(--color-line)] pt-6 md:grid-cols-2">
        <div>
          <h3 className="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
            Included capabilities
          </h3>
          <ul className="mt-3 space-y-2 text-[0.92rem] text-[var(--color-ink)]">
            {CAPABILITIES.map((capability) => (
              <li key={capability} className="flex gap-2.5">
                <span aria-hidden="true" className="text-[var(--color-teal-ink)]">
                  ✓
                </span>
                {capability}
              </li>
            ))}
          </ul>
        </div>

        <div data-testid="integration-github">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              GitHub repository
            </h3>
            <span
              data-testid="integration-status"
              className="rounded-full bg-[var(--color-line)] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[var(--color-muted)]"
            >
              {statusLabel}
            </span>
          </div>
          <dl className="mt-3 space-y-3 text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            <div>
              <dt className="font-bold text-[var(--color-ink)]">
                Canonical repository
              </dt>
              <dd data-testid="canonical-repository" className="break-words">
                {repository}
              </dd>
            </div>
            {github.state === "connected" && (
              <>
                <div>
                  <dt className="font-bold text-[var(--color-ink)]">
                    Connected account
                  </dt>
                  <dd>{github.account}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[var(--color-ink)]">
                    Installation scope
                  </dt>
                  <dd>{github.installationScope}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--color-line)] pt-6">
        <h3 className="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
          Who owns the website
        </h3>
        <p className="mt-2 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
          Westchase GI does. The website and the accounts it runs on belong
          to the practice — not to a web vendor. If the practice ever
          changes who maintains the site, the website stays put and keeps
          running.
        </p>
      </div>
    </section>
  );
}
