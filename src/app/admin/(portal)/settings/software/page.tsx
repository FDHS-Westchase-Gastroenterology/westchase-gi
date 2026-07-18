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
            This is the practice&rsquo;s own software — the public website
            patients visit and the private portal the staff works in. It was
            built for Westchase GI and belongs to Westchase GI, and this page
            shows where everything lives and how the practice stays in
            control.
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
            Westchase GI owns this website, plain and simple. The practice —
            not its developer — holds the keys to every service that keeps it
            running.
          </p>
          <dl className="mt-3 max-w-[62ch] space-y-3 text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            <div>
              <dt className="font-bold text-[var(--color-ink)]">
                Website files — GitHub
              </dt>
              <dd>
                GitHub safeguards the files used to build and update the
                website.
                <a
                  data-testid="canonical-repository"
                  href={`https://github.com/${CANONICAL_REPOSITORY}`}
                  className="mt-1 block w-fit font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
                >
                  Open the website files in GitHub
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--color-ink)]">
                Live website — Vercel
              </dt>
              <dd>
                Vercel keeps the website up and running around the clock for
                patients and staff.
                <a
                  href="https://vercel.com/login"
                  className="mt-1 block w-fit font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
                >
                  Sign in to Vercel
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--color-ink)]">
                Appointment requests and staff access — Supabase
              </dt>
              <dd>
                Supabase holds the appointment requests shown in this portal
                and handles staff sign-in.
                <a
                  href="https://supabase.com/dashboard/sign-in"
                  className="mt-1 block w-fit font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
                >
                  Sign in to Supabase
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--color-ink)]">
                Website address — Porkbun
              </dt>
              <dd>
                Porkbun keeps westchasegi.com registered and renewed, so the
                address always points home.
                <a
                  href="https://porkbun.com/account/login"
                  className="mt-1 block w-fit font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
                >
                  Sign in to Porkbun
                </a>
              </dd>
            </div>
          </dl>
          <p className="mt-3 max-w-[62ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            If the practice ever works with a new developer, it simply grants
            them access to these same services. Nothing needs to be rebuilt,
            and nothing needs to move.
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
