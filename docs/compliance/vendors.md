# Vendors and business associate agreements

Every outside company whose service the system uses, what each one receives, and whether a
business associate agreement (BAA) covers it.

A vendor that creates, receives, maintains or transmits PHI for the business associate is a
subcontractor, and the business associate may give it PHI only after a written agreement that
meets 164.504(e)
([45 CFR 160.103](https://www.ecfr.gov/current/title-45/section-160.103) "Business associate",
[164.502(e)(1)(ii)](https://www.ecfr.gov/current/title-45/section-164.502#p-164.502(e)(1)(ii)),
[164.308(b)(2)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(b)(2)),
[164.314(a)](https://www.ecfr.gov/current/title-45/section-164.314#p-164.314(a))). A vendor that
receives no PHI needs no BAA, so for each vendor without one this list states how PHI is kept
away from it.

The security official owns this list.

## Rules

- **PHI goes only to a vendor with a BAA.** Today that is AWS alone, and inside AWS only to the
  services in [aws-hipaa-eligible-services.md](aws-hipaa-eligible-services.md).
- **A vendor without a BAA receives no PHI by design.** The "Data it receives" column is the
  complete description of what it gets. Widening it is a change to this file.
- **Adding a vendor, or changing what a vendor receives,** goes through
  [change management](policies/change-management.md#how-a-change-reaches-production) and updates
  this file and the [risk register](risk-analysis.md#risk-register) in the same pull request.
- **Email never names a patient.** No email template may carry a patient field or a
  request-specific link. An email that ever needs to name a patient, or go to a patient, moves to
  a service covered by a BAA, such as Amazon SES (on AWS's eligible list), first.
- **Every vendor console** is protected by two-step sign-in, with a passkey or security key where
  the vendor offers one ([workstation security](policies/workstation-security.md#workstation-security)).
- **Review.** The security official reviews this list at each
  [periodic evaluation](security-official.md#periodic-evaluation): BAA status, the data each
  vendor receives, who holds each account and whether it still has two-step sign-in.

## Vendors

| Vendor | What it does for the system | Data it receives | PHI allowed | BAA status | Account held by |
| --- | --- | --- | --- | --- | --- |
| Amazon Web Services | Runs the target system in the `wgi` account: hosting, database, staff sign-in, keys, secrets, logs, alerting, DNS and the sign-in email trigger | All production ePHI once step 3 builds the database and step 5 copies the data in | Yes, in HIPAA-eligible services only | **In place.** The AWS BAA is accepted in AWS Artifact for the AWS Organization and covers the management account and every member account. The security official confirms it is active with `aws artifact list-customer-agreements --region us-east-1` at each evaluation ([AWS HIPAA compliance](https://aws.amazon.com/compliance/hipaa-compliance/)) | The business associate's AWS Organization |
| Supabase (until step 6) | Today's database, staff sign-in and per-pull-request preview databases. Its sign-in service sends the staff password-reset email through a custom mail provider set in its dashboard, not in this repository | Every production record today: requests, patients, appointments, notes, history, audit rows and staff accounts | **No.** It holds ePHI today without a BAA ([R-01](risk-analysis.md#risk-register)) | **None.** Supabase requires a signed BAA and its HIPAA add-on before a project holds PHI ([Supabase HIPAA projects](https://supabase.com/docs/guides/platform/hipaa-projects)); neither is in place. Step 5 moves the data to RDS; step 6 stores a final encrypted export in AWS and then deletes the projects | Consultant-managed account |
| Vercel (until step 6) | Hosts the website and portal today: builds, server functions and preview deployments | Every request in transit today, including appointment-request bodies and portal pages | **No.** It processes ePHI today without a BAA ([R-01](risk-analysis.md#risk-register)) | **None.** Vercel offers a BAA to eligible Pro and Enterprise customers, and Pro teams add it as a paid HIPAA add-on ([Vercel compliance](https://vercel.com/docs/security/compliance)); none is signed for this project. Step 5 moves traffic to AWS | Clinic-owned project |
| Vercel, after step 6 | Serves the printed review flyers' old address as a redirect to the website's review page | The visitor's request for the redirect | No | None needed: no app code, no form and no patient data in that project | Clinic-owned project |
| Vercel Web Analytics and Speed Insights | Page-view and performance measurement on the patient website, not the portal (`src/app/[locale]/layout.tsx`) | For each page view: time, URL and route, referrer, filtered query parameters, approximate location, operating system, browser and device type; Speed Insights adds performance measurements and network speed. Vercel records these anonymously and does not tie them to an IP address ([Web Analytics privacy](https://vercel.com/docs/analytics/privacy-policy), [Speed Insights privacy](https://vercel.com/docs/speed-insights/privacy-policy)). No form content | No. Patient-site URLs and query strings carry no patient fields ([R-09](risk-analysis.md#risk-register)) | None, as for Vercel above. Removal is deferred under step 1 ([inventory §12](../migration/inventory.md#12-removal-deferred-billing-and-analytics)) and required before INIT-1 is done | Clinic-owned project |
| Resend | Sends the system's email: the new-request alert and its test variant, the notification-recipient confirmation and the staff invite; from step 3, also Cognito's sign-in email (temporary passwords and password-reset codes) through the custom email sender Lambda | Staff email addresses, fixed message text, the `/admin` link, invite links, temporary passwords and reset codes | **No.** The new-request alert carries fixed text and the `/admin` link only, with no patient name, contact, reason or request link (in place, `src/lib/portal/intake-notification.ts`) | **None.** "Resend is not HIPAA compliant and cannot sign a Business Associate Agreement" ([Resend security](https://resend.com/security/gdpr.md)) | Consultant-managed account. The API key moves into Secrets Manager without being displayed (step 3) |
| GitHub | The repository, issues and pull requests, GitHub Actions (CI and, from step 4, deploys), Dependabot, the protected `aws-production` environment's approval record, and the GitHub App behind the portal's maintainer page | Source code, configuration, fictional test data, CI logs, and the GitHub usernames and invitations the maintainer page manages | **No.** GitHub's Data Protection Agreement does not allow PHI without GitHub's prior, written and specific consent ([GitHub DPA §12.B](https://github.com/customer-terms/github-data-protection-agreement), version October 2025). Runners get no network path or credential that can read production rows, and migrations run inside the VPC (step 4) | **None** | Clinic-owned organization; the implementation consultant has Write access |
| OpenAI (Codex review in CI) | A read-only Codex review of manifest-only Dependabot pull requests, called from GitHub Actions with a repository secret | The dependency manifest change and repository code | No | **None** | Repository Actions secret held in the clinic-owned organization |
| AI coding agent providers (Anthropic for Claude Code, OpenAI for Codex, and any other agent a workforce member uses) | Coding agents that write and test the system on workforce workstations | Source code, terminal output, fictional data from staging and previews, and screenshots of them | **No.** Agents never read production patient data ([access control](policies/access-control.md#ai-coding-agents)) | **None** | Each workforce member's own account |
| Browserbase | Hosted browser for checking a public preview or the public website | Pages of the public website and of previews, which hold fictional data only | No | **None** | Workforce member's account |
| Porkbun | Domain registrar for `westchasegi.com`, and its DNS host until the nameservers move to Route 53 | DNS records | No | None needed | Clinic's account |
| Google Fonts | Font files fetched once when the application is built; the site serves them itself, so visitors' browsers send Google nothing ([Next.js fonts](https://nextjs.org/docs/app/getting-started/fonts)) | Nothing about visitors | No | None needed | No account |

## Not vendors of this system

- **Patient-facing links and map embeds.** The website links to the clinic's patient portal and
  forms (eCW/healow, Hushforms), Google reviews, Facebook and Healthgrades, and embeds Google Maps
  on its location pages (`src/components/LocationMaps.tsx`). The visitor's browser reaches those
  services directly; the business associate sends them nothing, and the map embeds send no
  referrer. The covered entity's own arrangements govern those services.
- **Not installed:** error tracking, product analytics beyond Vercel's, CAPTCHA and payment
  services. The patient website's first-party analytics run on the system's own database and
  move with it.
- **The covered entity's EHR (eCW)** is not connected to this system. The connection planned
  under INIT-2 needs the signed BAA between the covered entity and the business associate, and it
  is reviewed under change management before any data flows.
