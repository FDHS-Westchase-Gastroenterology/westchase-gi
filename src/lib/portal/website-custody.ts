// Staff-facing Website settings copy and provider-link presentation.
// Custody facts come from README.md (domain, source repository, Vercel
// Deployment, consultant-managed Supabase and Resend). Architecture records
// That the portal does not call Vercel or DNS. Porkbun auto-renew and WHOIS
// Confirmation remain the unresolved operational facts already shown on this
// Page. Do not treat a loaded Preview, a passing deploy, or repository access
// As proof of credential custody.

export type WebsiteConnectionState = "not_configured" | "unavailable" | "connected";

export const WEBSITE_CHANGE_HREF = "/admin/help#website-changes";
export const REVIEW_FLYERS_HREF = "/admin/review-flyers";

export const PROVIDER_LINK_TARGET = "_blank";
export const PROVIDER_LINK_REL = "noopener noreferrer";

export const WEBSITE_CAPABILITIES = [
  "Patient-facing website",
  "Authenticated staff portal",
  "Review-flyer printing",
] as const;

export const STAFF_SECTION_ORDER = [
  "what-website-does",
  "what-practice-controls",
  "still-needs-attention",
  "how-to-request-change",
] as const;

export const STAFF_SECTION_HEADINGS = {
  "what-website-does": "What the website does",
  "what-practice-controls": "What Westchase GI controls",
  "still-needs-attention": "Still needs attention",
  "how-to-request-change": "How to request a website change",
} as const satisfies Record<(typeof STAFF_SECTION_ORDER)[number], string>;

export const STAFF_WEBSITE_DOES =
  "Patients use the public site to request an appointment, read procedure prep and education, download current documents, and confirm hours, locations, and providers. Staff use the same software for the authenticated staff portal and for review-flyer printing.";

export const STAFF_PRACTICE_CONTROLS =
  "Westchase GI controls the westchasegi.com domain, the source code in the clinic-owned GitHub repository, and the Vercel deployment that publishes the site. Domain, source code, repository access, deployment, database, email delivery, DNS, provider accounts, and credentials are not the same thing. This page is not proof that the practice holds every service credential.";

export const STAFF_REQUEST_CHANGE =
  "Staff request a website change by emailing the practice's website maintainer. That is a request, not editing the website from this portal, and it is not a reason to sign in to GitHub, Vercel, Supabase, or Porkbun. Most staff never need those accounts. Help explains the current process.";

export const MAINTAINER_DISCLOSURE_SUMMARY =
  "Maintainer details: providers, repository, deployment, and credentials. Most staff never need these accounts.";
export const MAINTAINER_DISCLOSURE_CLOSED =
  "Show maintainer details: providers, repository, deployment, and credentials. Most staff never need these accounts.";
export const MAINTAINER_DISCLOSURE_OPEN =
  "Hide maintainer details: providers, repository, deployment, and credentials. Most staff never need these accounts.";

export const MAINTAINER_DISCLOSURE_INTRO =
  "These destinations are for website maintainers. They open in a new tab and leave the staff portal. Staff should request a website change instead of signing in to a provider console.";

export const MAINTAINER_GRANT_ACCESS =
  "The practice can grant a new maintainer access to GitHub, Vercel, and Porkbun now. After the Supabase project transfer and Resend handoff are documented, it can grant those services too. The application does not need to be rebuilt, and the Supabase transfer requires no data migration.";

export const WEBSITE_PROVIDER_LINKS = [
  {
    id: "github",
    href: "https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi",
    name: "Open GitHub (leaves the staff portal)",
    testId: "canonical-repository",
  },
  {
    id: "vercel",
    href: "https://vercel.com/login",
    name: "Open Vercel (leaves the staff portal)",
    testId: "provider-vercel",
  },
  {
    id: "supabase",
    href: "https://supabase.com/dashboard/sign-in",
    name: "Open Supabase (leaves the staff portal)",
    testId: "provider-supabase",
  },
  {
    id: "porkbun",
    href: "https://porkbun.com/account/login",
    name: "Open Porkbun (leaves the staff portal)",
    testId: "provider-porkbun",
  },
] as const;

export const WEBSITE_MAINTAINER_SERVICES = [
  {
    id: "domain",
    title: "Domain",
    body: "Porkbun currently holds the westchasegi.com registration in the clinic's account.",
    linkId: "porkbun",
  },
  {
    id: "dns",
    title: "DNS",
    body: "Porkbun serves DNS for westchasegi.com. Auto-renew and WHOIS privacy still need to be confirmed in the clinic account.",
    linkId: null,
  },
  {
    id: "source-code",
    title: "Source code",
    body: "GitHub holds the files used to build and update the website. The clinic-controlled account owns the repository. The implementation consultant has Write access only, which is revoked when the engagement ends.",
    linkId: "github",
  },
  {
    id: "repository-access",
    title: "Repository access",
    body: "Who can edit and publish is listed below when the GitHub connection is available. Repository access is not the same as owning the repository, and it is not proof of other provider credentials.",
    linkId: null,
  },
  {
    id: "deployment",
    title: "Deployment",
    body: "The clinic-owned Vercel project publishes the site when changes merge. The portal displays that hosting fact and does not call or manage Vercel.",
    linkId: "vercel",
  },
  {
    id: "database",
    title: "Database",
    body: "Supabase holds the appointment requests shown in this portal and handles staff sign-in. That account still runs in consultant-managed custody. Moving it to a practice-controlled account is unfinished.",
    linkId: "supabase",
  },
  {
    id: "email-delivery",
    title: "Email delivery",
    body: "Resend currently sends application email from a consultant-managed account branded for the clinic. The handoff to a practice-controlled account is unfinished.",
    linkId: null,
  },
  {
    id: "credentials",
    title: "Credentials",
    body: "Provider-account credentials are separate from domain, source code, and deployment. A loaded Preview, a passing deployment, or repository access is not proof that the practice holds a given credential.",
    linkId: null,
  },
] as const;

const ALWAYS_ATTENTION = [
  {
    id: "database-email",
    text: "Database (Supabase) and email delivery (Resend) currently run in consultant-managed accounts branded for the clinic. Moving them to practice-controlled accounts is unfinished.",
  },
  {
    id: "porkbun-renewal",
    text: "Auto-renew and WHOIS privacy for westchasegi.com still need to be confirmed in the clinic's Porkbun account.",
  },
] as const;

const CONNECTION_ATTENTION = {
  not_configured:
    "The GitHub connection that lists who can change the website is not configured yet. The public website is unaffected.",
  unavailable:
    "The GitHub connection that lists who can change the website cannot be reached right now, so this page does not show an access list. The public website is unaffected.",
} as const;

export function websiteAttentionItems(connection: WebsiteConnectionState): readonly {
  readonly id: string;
  readonly text: string;
}[] {
  if (connection === "connected") {
    return ALWAYS_ATTENTION;
  }
  return [
    ...ALWAYS_ATTENTION,
    {
      id: "github-connection",
      text: CONNECTION_ATTENTION[connection],
    },
  ];
}

export function websiteProviderLink(
  id: (typeof WEBSITE_PROVIDER_LINKS)[number]["id"],
): (typeof WEBSITE_PROVIDER_LINKS)[number] {
  const match = WEBSITE_PROVIDER_LINKS.find((link) => link.id === id);
  if (match === undefined) {
    throw new Error(`Unknown website provider link: ${id}`);
  }
  return match;
}

const FORBIDDEN_OWNERSHIP_CLAIM = /\b(?:everything|fully owned|fully in control)\b/i;
const FORBIDDEN_COMPLETE_CLAIM =
  /\b(?:ownership is complete|transfer is complete|custody is complete)\b/i;
const SECRET_MATERIAL =
  /ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|sk_live_|sk_test_|BEGIN [A-Z ]*PRIVATE KEY|PORTAL_GITHUB_APP_PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY|Bearer [A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./;

export function allWebsiteCustodyText(connection: WebsiteConnectionState): string {
  return [
    STAFF_WEBSITE_DOES,
    STAFF_PRACTICE_CONTROLS,
    STAFF_REQUEST_CHANGE,
    MAINTAINER_DISCLOSURE_SUMMARY,
    MAINTAINER_DISCLOSURE_CLOSED,
    MAINTAINER_DISCLOSURE_OPEN,
    MAINTAINER_DISCLOSURE_INTRO,
    MAINTAINER_GRANT_ACCESS,
    ...WEBSITE_CAPABILITIES,
    ...Object.values(STAFF_SECTION_HEADINGS),
    ...websiteAttentionItems(connection).map((item) => item.text),
    ...WEBSITE_MAINTAINER_SERVICES.map((service) => `${service.title} ${service.body}`),
    ...WEBSITE_PROVIDER_LINKS.map((link) => `${link.name} ${link.href}`),
  ].join("\n");
}

export function websiteCustodyHasForbiddenOwnershipClaim(text: string): boolean {
  return FORBIDDEN_OWNERSHIP_CLAIM.test(text) || FORBIDDEN_COMPLETE_CLAIM.test(text);
}

export function websiteCustodyHasSecretMaterial(text: string): boolean {
  return SECRET_MATERIAL.test(text);
}
