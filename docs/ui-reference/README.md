# UI reference

This is the checked-in visual baseline for agents changing the Westchase GI frontend. Open the
relevant PNG before changing a public or staff page; use the source and product docs for the
underlying content and behavior.

All images are current-viewport captures at 1×: desktop is 1440×900 and mobile is 390×844. They
intentionally cover shared chrome and each distinct public or staff UI pattern rather than every
localized content route.

| Surface / state | Reference |
| --- | --- |
| English home | [desktop-en-home.png](desktop-en-home.png) · [mobile-en-home.png](mobile-en-home.png) |
| English home, first visit | [desktop-en-home-first-visit.png](desktop-en-home-first-visit.png) |
| English mobile navigation open | [mobile-en-menu.png](mobile-en-menu.png) |
| Services | [desktop-en-services.png](desktop-en-services.png) |
| Physicians | [desktop-en-physicians.png](desktop-en-physicians.png) |
| Procedure preparation | [mobile-en-procedure-prep.png](mobile-en-procedure-prep.png) |
| Appointment form | [desktop-en-appointment.png](desktop-en-appointment.png) |
| Contact form and locations | [desktop-en-contact.png](desktop-en-contact.png) |
| Arabic / RTL home | [desktop-ar-home.png](desktop-ar-home.png) · [mobile-ar-home.png](mobile-ar-home.png) |
| Review hub | [desktop-review.png](desktop-review.png) |
| Staff-login shell | [desktop-admin-login.png](desktop-admin-login.png) |
| Staff portal — Home | [desktop-portal-home.png](desktop-portal-home.png) · [mobile-portal-home.png](mobile-portal-home.png) |
| Staff portal — Appointment requests | [desktop-portal-requests.png](desktop-portal-requests.png) · [mobile-portal-requests.png](mobile-portal-requests.png) |
| Staff portal — Print review flyers | [desktop-portal-review-flyers.png](desktop-portal-review-flyers.png) · [mobile-portal-review-flyers.png](mobile-portal-review-flyers.png) |
| Staff portal — Settings | [desktop-portal-settings.png](desktop-portal-settings.png) · [mobile-portal-settings.png](mobile-portal-settings.png) |
| Staff portal — Website settings | [desktop-portal-settings-software.png](desktop-portal-settings-software.png) · [mobile-portal-settings-software.png](mobile-portal-settings-software.png) |
| Staff portal — Activity log | [desktop-portal-audit.png](desktop-portal-audit.png) · [mobile-portal-audit.png](mobile-portal-audit.png) |
| Staff portal — Help | [desktop-portal-help.png](desktop-portal-help.png) · [mobile-portal-help.png](mobile-portal-help.png) |

## Refresh

```bash
npm run ui:reference
npm run ui:reference -- http://localhost:3000
npm run ui:reference:portal -- http://localhost:3000
```

The first command captures the canonical live public site. The second captures a running local or
Preview origin before a frontend change is merged. The third captures the staff portal using the seeded
Development identity locally or the Preview review identity on Vercel Preview. Use the matching
local/Preview origin when updating reference images in a UI change; use the live default after
deployment to re-baseline the current public site. It uses the existing Playwright Chromium install;
the portal run signs in but never changes portal records. Inspect the changed PNGs before committing
them.

Portal images are limited to the seven top-level staff routes, omit individual request details, and
redact account and queue data in the browser before capture. Never run the portal mode against a
Production origin.
