# UI reference

This is the checked-in visual baseline for agents changing the Westchase GI frontend. Open the
relevant PNG before changing a public page; use the source and product docs for the underlying
content and behavior.

All images are current-viewport captures at 1×: desktop is 1440×900 and mobile is 390×844. They
intentionally cover shared chrome and each distinct public UI pattern rather than every localized
content route.

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

## Refresh

```bash
npm run ui:reference
npm run ui:reference -- http://localhost:3000
```

The first command captures the canonical live public site. The second captures a running local or
Preview origin before a frontend change is merged. Use the matching local/Preview origin when
updating reference images in a UI change; use the live default after deployment to re-baseline the
current site. It uses the existing Playwright Chromium install, performs only public GET requests,
and never submits a form. Inspect the changed PNGs before committing them.

Do not use this folder for signed-in portal captures: those can contain operational or patient
data. The normal portal Playwright tests keep their transient evidence in ignored test artifacts.
