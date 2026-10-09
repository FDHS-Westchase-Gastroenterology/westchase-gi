import Link from "next/link";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import {
  cancelMaintainerInvite,
  inviteMaintainer,
  revokeMaintainer,
} from "@/app/admin/(portal)/settings/actions";
import { Check, ChevronRight, Plus } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { getMaintainerAccessModel } from "@/lib/portal/maintainers";
import {
  ATTENTION_HEADING,
  MAINTAINER_ACCESS_ROW,
  MAINTAINER_DISCLOSURE_INTRO,
  MAINTAINER_GRANT_ACCESS,
  PROVIDER_LINK_REL,
  PROVIDER_LINK_TARGET,
  SOFTWARE_INTRO,
  SOFTWARE_ROWS,
  SOFTWARE_RUNS_HEADING,
  WEBSITE_CAPABILITIES,
  WEBSITE_CHANGE_HREF,
  WEBSITE_MAINTAINER_SERVICES,
  websiteAttentionItems,
  websiteProviderLink,
} from "@/lib/portal/website-custody";

import { MaintainerAccess } from "./maintainer-access";

import "@/app/admin/(portal)/settings/settings.css";

function ProviderLink({
  id,
  children,
}: Readonly<{
  id: "github" | "vercel" | "supabase" | "porkbun";
  children: string;
}>) {
  const link = websiteProviderLink(id);
  return (
    <a
      data-testid={link.testId}
      href={link.href}
      target={PROVIDER_LINK_TARGET}
      rel={PROVIDER_LINK_REL}
      aria-label={link.name}
      className="settings-software-link"
    >
      {children}
      <ChevronRight aria-hidden="true" className="size-3.5" />
    </a>
  );
}

/* Settings › Software (issue #355, Figma St7): who runs the clinic's website
   and staff portal, and what is still unfinished. One card names what the
   software runs and who holds each account; maintainer access opens from its
   own row, so most staff never see the provider consoles. */
export default async function AdminSettingsSoftwarePage() {
  const session = await requireRole("staff");
  const model = await getMaintainerAccessModel();
  const attentionItems = websiteAttentionItems(model.state);
  const isAdmin = session.role === "admin";

  return (
    <>
      <PortalPageHeader
        title="Software"
        actions={
          <Link
            href={WEBSITE_CHANGE_HREF}
            data-testid="request-website-change"
            className="wgi-settings-command"
          >
            <Plus aria-hidden="true" className="size-4" />
            Request a website change
          </Link>
        }
      />
      <div className="wgi-settings mt-6 flex flex-col gap-4">
        <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">{SOFTWARE_INTRO}</p>

        <section
          data-testid="managed-product"
          aria-labelledby="software-runs-heading"
          className="settings-software"
        >
          <div className="settings-software-runs">
            <h2 id="software-runs-heading" className="settings-software-heading">
              {SOFTWARE_RUNS_HEADING}
            </h2>
            <ul className="settings-software-capabilities">
              {WEBSITE_CAPABILITIES.map((capability) => (
                <li key={capability}>
                  <Check aria-hidden="true" className="size-4" />
                  {capability}
                </li>
              ))}
            </ul>
          </div>

          <dl className="contents">
            {SOFTWARE_ROWS.map((row) => (
              <div key={row.id} data-row={row.id} className="settings-software-row">
                <dt className="settings-software-label">{row.label}</dt>
                <dd className="settings-software-value">{row.value}</dd>
                <dd className="settings-software-trailing">
                  {row.linkId === null ? (
                    row.note
                  ) : (
                    <ProviderLink id={row.linkId}>Open</ProviderLink>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <details data-testid="maintainer-details" className="settings-software-details">
            <summary className="settings-software-row">
              <span className="settings-software-label">{MAINTAINER_ACCESS_ROW.label}</span>
              <span className="settings-software-value">{MAINTAINER_ACCESS_ROW.value}</span>
              <span aria-hidden="true" className="settings-software-trailing">
                <span className="settings-software-link">
                  <span className="settings-software-when-closed">Manage</span>
                  <span className="settings-software-when-open">Hide</span>
                  <ChevronRight className="settings-software-chevron size-3.5" />
                </span>
              </span>
            </summary>

            <div className="settings-software-maintainers">
              <p>{MAINTAINER_DISCLOSURE_INTRO}</p>
              <dl className="settings-software-services">
                {WEBSITE_MAINTAINER_SERVICES.map((service) => (
                  <div key={service.id}>
                    <dt>{service.title}</dt>
                    <dd>
                      {service.body}
                      {service.linkId === "porkbun" || service.linkId === "supabase" ? (
                        <>
                          {" "}
                          <ProviderLink id={service.linkId}>Open</ProviderLink>
                        </>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>{MAINTAINER_GRANT_ACCESS}</p>
              <div className="settings-software-access">
                <MaintainerAccess
                  model={model}
                  isAdmin={isAdmin}
                  actions={
                    isAdmin
                      ? { inviteMaintainer, cancelMaintainerInvite, revokeMaintainer }
                      : undefined
                  }
                />
              </div>
            </div>
          </details>
        </section>

        <section
          data-testid="website-attention"
          aria-labelledby="still-needs-attention-heading"
          className="settings-attention"
        >
          <h2 id="still-needs-attention-heading" className="settings-attention-heading">
            {ATTENTION_HEADING} · {attentionItems.length}
          </h2>
          <ul>
            {attentionItems.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
