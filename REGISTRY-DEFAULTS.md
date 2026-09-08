# Shared component defaults

This branch develops reusable interaction defaults in the Westchase application. Jason reviews
changes through the existing patient site and staff portal. A separate component gallery is not
part of the work. Agree the behavior profile before changing component behavior.

## Branch and comparison baseline

- Working branch: `dev/registry-interaction-defaults`.
- Merge destination: `portal/appointment-workflow-experience`, PR #224. Do not merge to `main`.
- Starting commit: `b9595b9c7911fb1a2001f6d2af176ca333308e73`.
- Fixed before deployment: https://westchase-r1mdz4ru1-jasongitdev-1290s-projects.vercel.app
- Before deployment ID: `dpl_1LAXF2sjK6Ezr6tDYtdcytmFGayP`.
- The child PR records its own Preview deployment and exact commit. Preserve the fixed before
  deployment while the integration branch continues receiving other work.

## Shared Preview database

This task follows Jason's branch-inheritance direction over older per-PR provisioning rules in
the starting commit. The database owner is `portal/appointment-workflow-experience`; its project
reference is `gqzwcvwyhykscuidcmlh`. Reuse that database and its migration baseline. Do not provision
another database for this child branch.

The owner's Supabase Preview setup check succeeded at the starting commit. Its fixed Vercel
Preview returned `ok: true`, `clientKeySafe: true`, and `schemaCompatible: true` from
`/api/preview-environment`, with the project reference and commit above, on 2026-09-08.

Verify the child deployment reports the same database and its own exact commit. Keep credentials
in branch-scoped Vercel settings and ignored local files. Never commit them. Coordinate migrations,
fixture resets, and database-backed test suites across all branches sharing this database.

The starting integration workflow only runs for PRs targeting `main`, resolves credentials by the
head Git branch, and waits for a new provisioning check. It does not implement inherited databases.
Do not dispatch that workflow against this child branch unchanged. Exact-head integration testing
remains a release requirement; setup verification alone does not establish full workflow acceptance.
Production migrations, scheduler activation, and merging PR #224 require separate authorization.

## Component scope

The baseline already includes shadcn source in `src/components/stock/` and application recipes in
`src/components/ui/`. Inventory both and the actual application consumers. Changing stock source
alone does not prove the application uses the new behavior.

Preserve upstream provenance and shadcn's visual starting point in reusable components. Keep
Westchase typography, palette, and product-specific behavior in the application. Shared defaults
cover feedback, entry and exit, interruption, appropriate spring behavior, gestures, and reduced
motion. Every catalog component needs an intentional coverage decision; not every component needs
movement. Do not settle new timing or spring values before Jason reviews the behavior profile.

Keep reusable source independent of Westchase routes, data access, and portal-only helpers. Once
approved and merged into #224, extract the components and required utilities into an independent
repository at `/Users/Jason/design`. Add installation definitions and verify a clean consumer can
change its visual identity while retaining the approved behavior before publishing that registry.

## Iteration workflow

Follow [COMPONENT-ITERATION.md](COMPONENT-ITERATION.md) for stock baselines, component commits,
registry installation, Preview measurements, and human review. Measurement reports live in
`component-evidence/`; link the exact implementation commit in each report.

## Acceptance

- Agree the shared behavior profile and record component coverage.
- Review actual application workflows against the fixed before deployment.
- Verify keyboard use, interrupted interactions, reduced motion, and physical-device gestures.
- Run the full contribution checks and relevant component/workflow tests.
- Post before/after images or workflow videos in the PR conversation as required by AGENTS.md.
- Verify the combined branch after resolving concurrent changes from #224.
- Prove registry installation and independence from Westchase during extraction.

This setup commit changes no component, motion value, application behavior, or database schema.
