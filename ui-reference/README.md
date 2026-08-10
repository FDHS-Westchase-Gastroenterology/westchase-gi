# UI reference

This is the checked-in visual baseline for agents changing the Westchase GI frontend. Open the
relevant PNG before changing a public or staff page; use the source and product docs for the
underlying content and behavior.

Every PNG is one unstitched browser viewport at 1×: desktop is 1440×900 and mobile is 390×844.
No reference is a full-page screenshot or a page shrunk to fit one image. An unsuffixed staff image
is the top viewport; its named companions are ordinary viewports captured after scrolling to the
listed section. Together they cover shared chrome and each distinct public or staff UI pattern
rather than repeating equivalent rows or every localized content route.

| Surface / state | Reference |
| --- | --- |
| English home | [desktop-en-home.png](desktop-en-home.png) · [mobile-en-home.png](mobile-en-home.png) |
| English home, first visit | [desktop-en-home-first-visit.png](desktop-en-home-first-visit.png) |
| Home, locale-mismatch chooser | [desktop-en-home-locale-hint.png](desktop-en-home-locale-hint.png) |
| English mobile navigation open | [mobile-en-menu.png](mobile-en-menu.png) |
| Services | [desktop-en-services.png](desktop-en-services.png) |
| Physicians | [desktop-en-physicians.png](desktop-en-physicians.png) |
| Procedure preparation | [mobile-en-procedure-prep.png](mobile-en-procedure-prep.png) |
| Appointment form | [desktop-en-appointment.png](desktop-en-appointment.png) |
| Contact form and locations | [desktop-en-contact.png](desktop-en-contact.png) |
| Arabic / RTL home | [desktop-ar-home.png](desktop-ar-home.png) · [mobile-ar-home.png](mobile-ar-home.png) |
| Review hub | [desktop-review.png](desktop-review.png) |
| Staff-login shell | [desktop-admin-login.png](desktop-admin-login.png) |
| Staff portal — Home | Desktop: [top](desktop-portal-home.png) · Mobile: [top](mobile-portal-home.png), [Desk tools](mobile-portal-home-desk-tools.png) |
| Staff portal — Appointments, unfiltered fictional queue | Desktop: [top](desktop-portal-requests.png), [queue end](desktop-portal-requests-queue-end.png) · Mobile: [top](mobile-portal-requests.png), [queue end](mobile-portal-requests-queue-end.png) |
| Staff portal — Print review flyers | Desktop: [top](desktop-portal-review-flyers.png), [list end](desktop-portal-review-flyers-flyer-list-end.png) · Mobile: [top](mobile-portal-review-flyers.png), [list middle](mobile-portal-review-flyers-flyer-list-middle.png), [list end](mobile-portal-review-flyers-flyer-list-end.png) |
| Staff portal — Settings | Desktop: [top](desktop-portal-settings.png), [Staff access](desktop-portal-settings-staff.png) · Mobile: [top](mobile-portal-settings.png), [Staff access](mobile-portal-settings-staff.png) |
| Staff portal — Website settings | Desktop: [top](desktop-portal-settings-software.png), [maintainers](desktop-portal-settings-software-maintainers.png) · Mobile: [top](mobile-portal-settings-software.png), [ownership](mobile-portal-settings-software-ownership.png), [maintainers](mobile-portal-settings-software-maintainers.png) |
| Staff portal — Activity log | Desktop: [top](desktop-portal-audit.png), [technical record](desktop-portal-audit-technical-record.png), [page bottom](desktop-portal-audit-bottom.png) · Mobile: [top](mobile-portal-audit.png), [Recent work](mobile-portal-audit-recent-work.png), [technical record](mobile-portal-audit-technical-record.png), [page bottom](mobile-portal-audit-bottom.png) |
| Staff portal — Help | Desktop: [top](desktop-portal-help.png), [workflow statuses](desktop-portal-help-workflow-statuses.png), [workflow notes](desktop-portal-help-workflow-notes.png), [page bottom](desktop-portal-help-bottom.png) · Mobile: [top](mobile-portal-help.png), [paper handoff](mobile-portal-help-paper-handoff.png), [workflow steps](mobile-portal-help-workflow-steps.png), [workflow notes](mobile-portal-help-workflow-notes.png), [staff operations](mobile-portal-help-staff-operations.png), [website changes](mobile-portal-help-website-changes.png), [page bottom](mobile-portal-help-bottom.png) |

## Refresh

```bash
npm run ui:reference
npm run ui:reference -- http://localhost:3000
npm run ui:reference:portal -- http://localhost:3000
```

The first command captures the canonical live public site. The second captures a running local or
Preview origin before a frontend change is merged. The third captures the staff portal using the
fictional seeded identity locally or the fictional review identity on Vercel Preview. Use the matching
local/Preview origin when updating reference images in a UI change; use the live default after
deployment to re-baseline the current public site. It uses the existing Playwright Chromium install;
the portal run signs in but never changes portal records. It explicitly takes one viewport at a time,
checks the saved dimensions, and prunes obsolete scrolled staff images only after a successful run.
Inspect every changed PNG before committing it.

Portal images are limited to seven selected staff surfaces, omit individual request details, and
redact account and queue data in the browser before capture. Repeated blurred Activity-log rows are
represented by their opening, technical-record, and bottom states rather than one image per row.
Never run the portal mode against a Production origin.
