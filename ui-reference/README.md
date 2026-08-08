# UI reference

This is the checked-in visual baseline for agents changing the Westchase GI frontend. Open the
relevant PNG before changing a public or staff page; use the source and product docs for the
underlying content and behavior.

All images are exact browser-viewport captures at 1×: desktop is 1440×900 and mobile is 390×844.
They are never full-page captures. Most show the top of a page; the numbered Appointments images
follow the page from top to bottom one viewport at a time. The atlas intentionally covers shared
chrome and each distinct public or staff UI pattern rather than every localized content route.

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
| Staff portal — Home | [desktop-portal-home.png](desktop-portal-home.png) · [mobile-portal-home.png](mobile-portal-home.png) |
| Staff portal — Appointments, desktop (top → bottom) | [01](desktop-portal-appointments-viewport-01.png) · [02](desktop-portal-appointments-viewport-02.png) · [03](desktop-portal-appointments-viewport-03.png) · [04](desktop-portal-appointments-viewport-04.png) · [05](desktop-portal-appointments-viewport-05.png) · [06](desktop-portal-appointments-viewport-06.png) · [07](desktop-portal-appointments-viewport-07.png) · [08](desktop-portal-appointments-viewport-08.png) |
| Staff portal — Appointments, mobile (top → bottom) | [01](mobile-portal-appointments-viewport-01.png) · [02](mobile-portal-appointments-viewport-02.png) · [03](mobile-portal-appointments-viewport-03.png) · [04](mobile-portal-appointments-viewport-04.png) · [05](mobile-portal-appointments-viewport-05.png) · [06](mobile-portal-appointments-viewport-06.png) · [07](mobile-portal-appointments-viewport-07.png) · [08](mobile-portal-appointments-viewport-08.png) · [09](mobile-portal-appointments-viewport-09.png) · [10](mobile-portal-appointments-viewport-10.png) · [11](mobile-portal-appointments-viewport-11.png) · [12](mobile-portal-appointments-viewport-12.png) · [13](mobile-portal-appointments-viewport-13.png) · [14](mobile-portal-appointments-viewport-14.png) |
| Staff portal — Print review flyers | [desktop-portal-print-review-flyers.png](desktop-portal-print-review-flyers.png) · [mobile-portal-print-review-flyers.png](mobile-portal-print-review-flyers.png) |
| Staff portal — Settings | [desktop-portal-settings.png](desktop-portal-settings.png) · [mobile-portal-settings.png](mobile-portal-settings.png) |
| Staff portal — Website | [desktop-portal-website.png](desktop-portal-website.png) · [mobile-portal-website.png](mobile-portal-website.png) |
| Staff portal — Activity log | [desktop-portal-activity-log.png](desktop-portal-activity-log.png) · [mobile-portal-activity-log.png](mobile-portal-activity-log.png) |
| Staff portal — Help | [desktop-portal-help.png](desktop-portal-help.png) · [mobile-portal-help.png](mobile-portal-help.png) |

## Refresh

```bash
npm run ui:reference
npm run ui:reference -- http://localhost:3000
UI_REFERENCE_SYNTHETIC_DATA_CONFIRMED=1 npm run ui:reference:portal -- http://localhost:3000
```

The first command captures the canonical live public site. The second captures a running local or
Preview origin before a frontend change is merged. The third captures the staff portal using the seeded
Development identity locally or the Preview review identity on Vercel Preview. Use the matching
local/Preview origin when updating reference images in a UI change; use the live default after
deployment to re-baseline the current public site. It uses the existing Playwright Chromium install;
the portal run signs in but never changes portal records. The configured
`PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF` must match the non-Production Development target. Set the
synthetic-data confirmation only after checking every visible record. Inspect the changed PNGs before
committing them.

Portal images are limited to the seven top-level staff routes and omit individual request details.
They open each route in its real default state and retain Development/Preview text only after every
visible record is explicitly confirmed synthetic, along with the rendered DOM, layout, wrapping,
density, and controls. Appointments uses sequential viewport-sized captures from the top through the
bottom of the scrollable page; none is a full-page screenshot. Never run the portal mode against a
Production origin.
