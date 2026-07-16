import Link from "next/link";
import { requireRole } from "@/lib/portal/auth";
import {
  CANONICAL_REPOSITORY,
  getGitHubRepositoryStatus,
  type GitHubRepositoryStatus,
} from "@/lib/portal/integrations";
import {
  MaintainerAccess,
  type MaintainerAccessModel,
} from "./maintainer-access";

const CAPABILITIES = [
  "Patient-facing website",
  "Authenticated staff portal",
  "Review-flyer printing",
] as const;

// Temporary adapter: shapes today's status-only read into the maintainer
// read model. The maintainers implementation (src/lib/portal/maintainers.ts,
// PR #34) replaces this with the live collaborator/invitation read and the
// real installation-permission check; until it proves administration:write,
// management fails closed to a setup blocker and no mutation control renders.
function toMaintainerAccessModel(
  github: GitHubRepositoryStatus,
): MaintainerAccessModel {
  if (github.state !== "connected") {
    return { state: github.state };
  }
  return {
    state: "connected",
    ownerLogin: github.account,
    management:
      github.installationScope === "Selected repositories"
        ? "permission_upgrade_required"
        : "restrict_installation",
    maintainers: null,
    invitations: null,
  };
}

export default async function AdminSettingsSoftwarePage() {
  const session = await requireRole("staff");
  const github = await getGitHubRepositoryStatus();
  const model = toMaintainerAccessModel(github);

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

        <div>
          <h3 className="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
            Who owns the website
          </h3>
          <p className="mt-3 max-w-[62ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            Westchase GI does. The website, its code, and the accounts it
            runs on belong to the practice — not to a web vendor. The code
            lives in the practice&rsquo;s own account, at{" "}
            <span
              data-testid="canonical-repository"
              className="font-bold text-[var(--color-ink)] [overflow-wrap:anywhere]"
            >
              {CANONICAL_REPOSITORY}
            </span>
            . If the practice ever changes who maintains the site, the
            website stays put and keeps running.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--color-line)] pt-6">
        <MaintainerAccess model={model} isAdmin={session.role === "admin"} />
      </div>
    </section>
  );
}
