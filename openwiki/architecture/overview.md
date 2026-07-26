---
type: Architecture Guide
title: Application Architecture
description: Runtime and module architecture for the multilingual patient site, staff portal, intake API, server-only services, and deployment boundary.
resource: src/app
tags: [architecture, nextjs, app-router, supabase, routing]
---

# Application architecture

## System shape

The repository is a Next.js 16 App Router application running React 19 and Tailwind CSS 4 (`package.json`). It keeps two user experiences in one deploy:

```text
Browser
├── /{locale}/... patient routes
│   ├── mostly Server Components/static parameters
│   └── client islands for navigation, language choice, forms, banners, and viewers
├── /api/requests[/form] intake routes
└── /admin/... English-only staff portal
    └── cookie-bound Supabase Auth
             │
Next.js server ── server-only service client ── Supabase Postgres/Auth
             ├── application email adapter ── Resend
             └── GitHub App provider ── canonical repository only
```

The [product and content model](../domain/product-and-content.md) is rendered through the locale route tree, while the [appointment intake workflow](../workflows/appointment-intake.md) bridges the public site to the portal queue. Privileged database and provider calls stay on the server.

## Route partitions

### Patient site

`src/app/[locale]/` contains the shared five-locale route tree. Its layout:

- statically enumerates `en`, `es`, `vi`, `ko`, and `ar` and rejects invalid locales;
- sets `lang` and Arabic `dir="rtl"`;
- supplies localized metadata, canonical/hreflang output, clinic JSON-LD, global header/footer, language chooser, skip link, and once-per-visitor banner;
- composes mostly server-rendered pages with focused client components.

Blog, education, and procedure-prep detail routes generate every locale/slug pair. The no-JavaScript receipt page is the deliberate dynamic exception because it consumes a one-time receipt token server-side (`src/app/[locale]/appointment/received/page.tsx`).

`src/app/sitemap.ts` and `src/app/robots.ts` expose search surfaces. `next.config.ts` owns permanent redirects from the former site, including legacy patient, blog, and ASGE education URLs. Keep `/` out of that redirect list because configuration redirects run before locale negotiation.

### Intake API

- `POST /api/requests` accepts JSON from the hydrated form.
- `POST /api/requests/form` accepts native form data and returns a `303` to the localized receipt.

Both dispatch to the same contracts and processor in `src/lib/portal/contracts.ts` and `src/lib/portal/intake.ts`. This prevents the JS and no-JS paths from defining different business rules.

### Staff portal

`src/app/admin/` contains public authentication entry routes and the protected `(portal)` route group. The portal includes Home, Requests, Settings, Activity, Help, Website custody/maintainers, and admin-only review flyers. Product navigation is task-first; occasional jobs are linked from Home rather than occupying permanent tabs (`docs/PORTAL-PRODUCT.md`).

The portal and flyer printer are capabilities of this application—not separate products or repositories. Approved flyer binaries remain outside `public/` and are traced into the deployed server bundle by `next.config.ts`.

## Request proxy

`src/proxy.ts` has three narrow responsibilities:

1. Redirect `/` using explicit locale cookie, then `Accept-Language`, then English. The response is `307`, `no-store`, and varies on cookie/language.
2. Remove legacy patient-bearing query parameters from localized appointment/contact URLs before a page or third-party resource loads.
3. Refresh/verify the Supabase session for `/admin/*` and fail closed on protected routes. Only login, forgot-password, confirmation, and callback are public session-establishment paths; protected flyer assets perform their own role check.

The proxy is an optimistic perimeter, not the authorization decision. Portal pages, actions, and routes call `requireRole` close to each operation; see [data and security](../data-and-security.md).

## Server and client boundaries

`src/lib/portal/server.ts` exposes:

- a request-scoped cookie client for verified Auth identity; and
- a fresh service-role client for privileged operations.

`src/lib/portal/auth.ts` resolves current role, active status, and onboarding from `staff_profiles`. No client component receives the service credential, GitHub App private key, or email provider key. Environment names prefixed `NEXT_PUBLIC_` are limited to browser-safe Supabase configuration.

Client components should remain small interactivity islands. The clinical/site records in `src/lib/` and portal operations stay server-rendered or server-only where possible. Before changing framework patterns, follow `AGENTS.md` and inspect the installed Next.js 16 guidance in `node_modules/next/dist/docs/`.

## Deployment and ownership boundary

A merge to `main` is a production release through the clinic-owned Vercel project. The portal reads GitHub through a clinic-owned App but does not call or manage Vercel. Provider/account custody and activation caveats live in [integrations](../integrations.md), while merge and release controls live in [operations and governance](../operations-and-governance.md).

## Change checklist

- New patient route: add it under `[locale]`, use `getDictionary`, `isLocale`, `pageMetadata`, and `localePath`, and decide whether nav, sitemap, or legacy redirects change.
- New localized dynamic content: update the content index so `generateStaticParams` sees it; provide all five languages.
- New portal operation: protect it at the route/action itself, use a server-only provider, write an audit event, and add authorization/E2E coverage.
- Proxy or redirect change: test locale negotiation, query scrubbing, and portal auth seams; never let a root redirect shadow language choice.
- UI change: inspect and refresh the relevant baseline in `docs/ui-reference/` as described in [testing and source map](../testing-and-source-map.md).
