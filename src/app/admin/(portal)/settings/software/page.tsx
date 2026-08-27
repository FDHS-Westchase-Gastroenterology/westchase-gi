import Link from "next/link";

import {
  cancelMaintainerInvite,
  inviteMaintainer,
  revokeMaintainer,
} from "@/app/admin/(portal)/settings/actions";
import { Check } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { getMaintainerAccessModel } from "@/lib/portal/maintainers";
import {
  MAINTAINER_DISCLOSURE_INTRO,
  MAINTAINER_DISCLOSURE_SUMMARY,
  MAINTAINER_GRANT_ACCESS,
  PROVIDER_LINK_REL,
  PROVIDER_LINK_TARGET,
  REVIEW_FLYERS_HREF,
  STAFF_PRACTICE_CONTROLS,
  STAFF_REQUEST_CHANGE,
  STAFF_SECTION_HEADINGS,
  STAFF_WEBSITE_DOES,
  WEBSITE_CAPABILITIES,
  WEBSITE_CHANGE_HREF,
  WEBSITE_MAINTAINER_SERVICES,
  websiteAttentionItems,
  websiteProviderLink,
} from "@/lib/portal/website-custody";

import { MaintainerAccess } from "./maintainer-access";

const SECTION_LABEL =
  "text-[0.82rem] font-bold tracking-[0.06em] text-[var(--color-muted-ink)] uppercase";
const SECTION_BODY = "mt-3 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]";
const PROVIDER_LINK_CLASS =
  "mt-1 flex min-h-11 w-fit items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2";

function ProviderLink({
  id,
}: Readonly<{
  id: "github" | "vercel" | "supabase" | "porkbun";
}>) {
  const link = websiteProviderLink(id);
  return (
    <a
      data-testid={link.testId}
      href={link.href}
      target={PROVIDER_LINK_TARGET}
      rel={PROVIDER_LINK_REL}
      className={PROVIDER_LINK_CLASS}
    >
      {link.name}
    </a>
  );
}

export default async function AdminSettingsSoftwarePage() {
  const session = await requireRole("staff");
  const model = await getMaintainerAccessModel();
  const attentionItems = websiteAttentionItems(model.state);

  return (
    <section
      data-testid="managed-product"
      aria-labelledby="website-heading"
      className="portal-panel p-6 sm:p-8"
    >
      <div data-testid="website-staff-layer">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2
            id="website-heading"
            className="text-[1.3rem] leading-tight font-black text-[var(--color-ink)]"
          >
            Clinic website
          </h2>
          <Link
            href={WEBSITE_CHANGE_HREF}
            data-testid="request-website-change"
            className="btn btn-navy"
          >
            Request a website change
          </Link>
        </div>

        <section className="mt-6" aria-labelledby="what-website-does-heading">
          <h3 id="what-website-does-heading" className={SECTION_LABEL}>
            {STAFF_SECTION_HEADINGS["what-website-does"]}
          </h3>
          <p className={SECTION_BODY}>{STAFF_WEBSITE_DOES}</p>
          <ul className="mt-3 space-y-2 text-[0.92rem] text-[var(--color-ink)]">
            {WEBSITE_CAPABILITIES.map((capability) => (
              <li key={capability} className="flex gap-2.5">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 flex-none text-[var(--color-teal-ink)]"
                />
                {capability}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="what-practice-controls-heading">
          <h3 id="what-practice-controls-heading" className={SECTION_LABEL}>
            {STAFF_SECTION_HEADINGS["what-practice-controls"]}
          </h3>
          <p className={SECTION_BODY}>{STAFF_PRACTICE_CONTROLS}</p>
        </section>

        <section
          className="mt-6"
          aria-labelledby="still-needs-attention-heading"
          data-testid="website-attention"
        >
          <h3 id="still-needs-attention-heading" className={SECTION_LABEL}>
            {STAFF_SECTION_HEADINGS["still-needs-attention"]}
          </h3>
          <div className="mt-3 rounded-[var(--radius)] border border-[var(--color-line-2)] bg-[var(--color-amber-soft)] p-4">
            <ul className="max-w-[70ch] list-disc space-y-2 pl-5 text-[0.9rem] leading-relaxed text-[var(--color-ink)]">
              {attentionItems.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="how-to-request-change-heading">
          <h3 id="how-to-request-change-heading" className={SECTION_LABEL}>
            {STAFF_SECTION_HEADINGS["how-to-request-change"]}
          </h3>
          <p className={SECTION_BODY}>{STAFF_REQUEST_CHANGE}</p>
          <Link
            href={REVIEW_FLYERS_HREF}
            className="mt-4 flex min-h-11 w-fit items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
          >
            Print review flyers
          </Link>
        </section>
      </div>

      <details
        data-testid="maintainer-details"
        className="website-maintainer-details mt-8 border-t border-[var(--color-line)] pt-6"
      >
        <summary className="min-h-11 cursor-pointer py-2 text-left font-bold text-[var(--color-ink)]">
          {MAINTAINER_DISCLOSURE_SUMMARY}
        </summary>

        <div className="mt-4">
          <p className="max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            {MAINTAINER_DISCLOSURE_INTRO}
          </p>

          <dl className="mt-5 max-w-[70ch] space-y-4 text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            {WEBSITE_MAINTAINER_SERVICES.map((service) => (
              <div key={service.id}>
                <dt className="font-bold text-[var(--color-ink)]">{service.title}</dt>
                <dd>
                  {service.body}
                  {service.linkId !== null ? <ProviderLink id={service.linkId} /> : null}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            {MAINTAINER_GRANT_ACCESS}
          </p>

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
        </div>
      </details>
    </section>
  );
}
