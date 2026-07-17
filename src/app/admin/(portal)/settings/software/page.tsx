import Link from "next/link";
import { requireRole } from "@/lib/portal/auth";
import { CANONICAL_REPOSITORY } from "@/lib/portal/integrations";
import { getMaintainerAccessModel } from "@/lib/portal/maintainers";
import {
  cancelMaintainerInvite,
  inviteMaintainer,
  revokeMaintainer,
} from "../actions";
import { MaintainerAccess } from "./maintainer-access";

const CAPABILITIES = [
  "Patient-facing website",
  "Authenticated staff portal",
  "Review-flyer printing",
] as const;

export default async function AdminSettingsSoftwarePage() {
  const session = await requireRole("staff");
  const model = await getMaintainerAccessModel();

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
            Westchase GI owns this website and controls the accounts behind
            it. The source code is stored in the practice&rsquo;s GitHub account
            at{" "}
            <span
              data-testid="canonical-repository"
              className="font-bold text-[var(--color-ink)] [overflow-wrap:anywhere]"
            >
              {CANONICAL_REPOSITORY}
            </span>
            ; the live website is hosted in its Vercel account; and the
            website&rsquo;s database is hosted in its Supabase organization. The{" "}
            <span className="font-bold text-[var(--color-ink)]">
              westchasegi.com
            </span>{" "}
            domain is registered through the practice&rsquo;s Porkbun account.
            Because the practice controls these accounts, it can change
            developers without rebuilding or moving the website.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--color-line)] pt-6">
        <MaintainerAccess
          model={model}
          isAdmin={session.role === "admin"}
          actions={
            session.role === "admin"
              ? {
                  inviteMaintainer,
                  cancelMaintainerInvite,
                  revokeMaintainer,
                }
              : undefined
          }
        />
      </div>
    </section>
  );
}
