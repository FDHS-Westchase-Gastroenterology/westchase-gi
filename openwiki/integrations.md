---
type: Integration Guide
title: External Integrations and Custody
description: Supabase, application email, Auth SMTP, GitHub App, Vercel, DNS, and the explicit provider and account-custody boundaries.
resource: docs/INTEGRATION-ACTIVATION.md
tags: [integrations, supabase, resend, github-app, vercel]
---

# External integrations and custody

This page records the repository’s source-backed integration model. Dated provider and custody states come from `docs/INTEGRATION-ACTIVATION.md` and `docs/PORTAL-OPS.md`; this source-only wiki run did not independently query external systems.

## Supabase

Supabase provides Postgres, Auth, PostgREST, and privileged Auth Admin operations for the [data and security model](data-and-security.md). Browser configuration is publishable and constrained by the closed Data API/RLS posture. Privileged data and Auth Admin calls use a server-only service-role compatibility credential because the configured opaque secrets did not pass hosted Auth Admin canaries (`src/lib/portal/server.ts`).

Development and Production are separate projects. Local defaults point to Development; Production uses separately named operator/runtime settings. Full Playwright rejects Production and permits only an exact allowlisted Development project or loopback disposable stack.

Repository docs state that Supabase account/organization custody is not yet practice-controlled and that transfer/compliance/recovery controls remain lifecycle activation gates. Do not describe dedicated projects or the queue’s system-of-record role as account ownership.

## Email: two delivery owners

The application owns one provider-neutral, text-only email capability, with Resend isolated as the current adapter in `src/lib/portal/email-provider.ts`.

| Email path | Owner |
|---|---|
| Appointment notification | Application email capability |
| Recipient confirmation | Application email capability |
| Staff setup invitation | Application email capability |
| Password recovery | Supabase Auth hosted SMTP |

Application-owned messages share an eight-second deadline, stable idempotency keys, normalized failures, and privacy-minimized logs. Appointment notices contain no patient fields and record one outcome per recipient. Provider acceptance is not proof of inbox delivery, and email never replaces the queue.

Password recovery is a separate Supabase-hosted SMTP path. Its committed template keeps the bearer token in the URL fragment until deliberate confirmation. Repository docs record the Production Auth sender as still using the sandbox identity and clinic-inbox canaries/Resend account custody as open. Configuration of a domain or sender does not establish account custody.

## GitHub App

The portal’s Website page reads and manages maintainers for the one canonical repository through the clinic-owned `wgi-portal` GitHub App. The server provider in `src/lib/portal/integrations.ts`:

- validates exact account and numeric repository identity;
- signs an App JWT and mints short-lived installation tokens;
- restricts tokens to the canonical repository;
- exposes only invite, cancel invitation, and revoke maintainer commands;
- requires Metadata read and Repository Administration read/write as appropriate;
- keeps credentials server-only and never accepts a personal access token.

Production App credentials are intentionally absent from Preview because preview code must not inherit repository-administration power. Unconfigured and invalid states render as honest “Not configured” or “Connection unavailable” states.

Repository docs record a successful authentication rehearsal and live controls, but the full controlled throwaway invite/cancel/accept/revoke plus Activity-log acceptance remains open. Owner 2FA and narrowing the App installation from all repositories to this repository are separate unverified defense-in-depth follow-ups.

## Vercel and DNS

The clinic-owned Vercel project deploys `main`; the apex `https://westchasegi.com` is canonical, `www` redirects to it, and the Vercel alias remains attached according to repository docs. Porkbun serves DNS.

The portal displays hosting custody as a static application fact. It **does not connect to or manage Vercel** and must not acquire a Vercel token or browser/server provider panel without a commissioned workflow. GitHub homepage metadata is documented as still pointing to a retired deployment URL.

## Public patient services

`src/lib/site.ts` centralizes verified external destinations: patient portal, English/Spanish Hushforms packets, map/directions links, review profiles, Facebook, Healthgrades, and one-way Alpha Omega Wellness link. Only verified-live URLs ship; unresolved Yelp and document destinations stay absent or use honest fallbacks. These links surface through the [product and content domain](domain/product-and-content.md).

## Credential and privilege rules

Use only environment-variable names and trusted provider/hosting stores; never place values in docs, source, issues, logs, browser configuration, or command arguments. Relevant name families are documented in `docs/PORTAL-OPS.md` and `.env.example`.

- No personal access token for portal GitHub access.
- No GitHub App private key in Preview or `NEXT_PUBLIC_*`.
- No Resend runtime credential in Preview unless an explicitly approved workflow changes that boundary.
- No Supabase service role in client code.
- No claim that Supabase or Resend custody is complete without dated practice evidence.

Integration activation and credential rotation are operational changes governed by [operations and governance](operations-and-governance.md), not ordinary UI edits.
