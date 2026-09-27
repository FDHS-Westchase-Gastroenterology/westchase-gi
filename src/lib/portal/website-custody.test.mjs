import assert from "node:assert/strict";
import test from "node:test";

const {
  MAINTAINER_DISCLOSURE_CLOSED,
  MAINTAINER_DISCLOSURE_OPEN,
  MAINTAINER_DISCLOSURE_SUMMARY,
  PROVIDER_LINK_REL,
  PROVIDER_LINK_TARGET,
  REVIEW_FLYERS_HREF,
  STAFF_SECTION_HEADINGS,
  STAFF_SECTION_ORDER,
  WEBSITE_CAPABILITIES,
  WEBSITE_CHANGE_HREF,
  WEBSITE_MAINTAINER_SERVICES,
  WEBSITE_PROVIDER_LINKS,
  allWebsiteCustodyText,
  websiteAttentionItems,
  websiteCustodyHasForbiddenOwnershipClaim,
  websiteCustodyHasSecretMaterial,
  websiteProviderLink,
} = await import("./website-custody.ts");

test("staff-first section order answers the four staff questions before maintainer details", () => {
  assert.deepEqual(
    [...STAFF_SECTION_ORDER],
    [
      "what-website-does",
      "what-practice-controls",
      "still-needs-attention",
      "how-to-request-change",
    ],
  );
  assert.equal(STAFF_SECTION_HEADINGS["what-website-does"], "What the website does");
  assert.equal(STAFF_SECTION_HEADINGS["what-practice-controls"], "What Westchase GI controls");
  assert.equal(STAFF_SECTION_HEADINGS["still-needs-attention"], "Still needs attention");
  assert.equal(STAFF_SECTION_HEADINGS["how-to-request-change"], "How to request a website change");
  assert.equal(WEBSITE_CHANGE_HREF, "/admin/help#website-changes");
  assert.equal(REVIEW_FLYERS_HREF, "/admin/review-flyers");
  assert.deepEqual(
    [...WEBSITE_CAPABILITIES],
    ["Patient-facing website", "Authenticated staff portal", "Review-flyer printing"],
  );
  assert.match(MAINTAINER_DISCLOSURE_SUMMARY, /^Maintainer details:/);
  assert.match(MAINTAINER_DISCLOSURE_SUMMARY, /providers, repository, deployment, and credentials/);
  assert.match(MAINTAINER_DISCLOSURE_CLOSED, /^Show maintainer details:/);
  assert.match(MAINTAINER_DISCLOSURE_OPEN, /^Hide maintainer details:/);
});

test("supported ownership claims stay narrow and unresolved items stay visible", () => {
  const connected = websiteAttentionItems("connected");
  assert.equal(connected.length, 2);
  assert.match(connected[0].text, /consultant-managed/);
  assert.match(connected[0].text, /Supabase/);
  assert.match(connected[0].text, /Resend/);
  assert.match(connected[0].text, /unfinished/);
  assert.match(connected[1].text, /Auto-renew and WHOIS privacy/);
  assert.match(connected[1].text, /Porkbun/);

  const notConfigured = websiteAttentionItems("not_configured");
  assert.equal(notConfigured.length, 3);
  assert.equal(notConfigured[0].id, connected[0].id);
  assert.equal(notConfigured[1].id, connected[1].id);
  assert.match(notConfigured[2].text, /not configured yet/);
  assert.match(notConfigured[2].text, /public website is unaffected/);

  const unavailable = websiteAttentionItems("unavailable");
  assert.equal(unavailable.length, 3);
  assert.match(unavailable[2].text, /cannot be reached right now/);

  const serviceIds = WEBSITE_MAINTAINER_SERVICES.map((service) => service.id);
  assert.deepEqual(serviceIds, [
    "domain",
    "dns",
    "source-code",
    "repository-access",
    "deployment",
    "database",
    "email-delivery",
    "credentials",
  ]);
});

test("provider links open in a new tab and name that they leave the staff portal", () => {
  assert.equal(PROVIDER_LINK_TARGET, "_blank");
  assert.equal(PROVIDER_LINK_REL, "noopener noreferrer");
  assert.deepEqual(
    WEBSITE_PROVIDER_LINKS.map((link) => ({
      id: link.id,
      href: link.href,
      name: link.name,
    })),
    [
      {
        id: "github",
        href: "https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi",
        name: "Open GitHub (leaves the staff portal)",
      },
      {
        id: "vercel",
        href: "https://vercel.com/login",
        name: "Open Vercel (leaves the staff portal)",
      },
      {
        id: "supabase",
        href: "https://supabase.com/dashboard/sign-in",
        name: "Open Supabase (leaves the staff portal)",
      },
      {
        id: "porkbun",
        href: "https://porkbun.com/account/login",
        name: "Open Porkbun (leaves the staff portal)",
      },
    ],
  );
  for (const link of WEBSITE_PROVIDER_LINKS) {
    assert.match(link.name, /leaves the staff portal/);
    assert.equal(websiteProviderLink(link.id).href, link.href);
  }
});

test("custody copy does not claim finished ownership or render secrets", () => {
  for (const connection of ["not_configured", "unavailable", "connected"]) {
    const text = allWebsiteCustodyText(connection);
    assert.equal(websiteCustodyHasForbiddenOwnershipClaim(text), false, connection);
    assert.equal(websiteCustodyHasSecretMaterial(text), false, connection);
    assert.doesNotMatch(text, /\bghp_/);
    assert.doesNotMatch(text, /PRIVATE KEY/);
    assert.doesNotMatch(text, /305283597/);
    assert.doesNotMatch(text, /1289668601/);
    assert.doesNotMatch(text, /Sign in to/);
  }
});
