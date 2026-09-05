# AGENTS.md, Westchase GI agent guide

Read this first. It has the hard rules, environment facts, and pointers to the rest.

Invoke the skill that covers the work before starting it. The skills hold repo-specific procedure that the code and these docs do not repeat.

## Rule authority and ramp-up

Read in this order, as the task requires:

1. This file: the domain-specific rules and invariants below are hard requirements. They outrank everything, including vendored skills and general framework advice.
2. Your own session memory, if your harness keeps one. `MEMORY.md` is machine-local and absent from a clean checkout.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md): system design, module interfaces, external systems, and the change-type → files map. Start here in an unfamiliar area.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md): setup, verification, commit/PR/merge discipline, and the path to production.
5. Product truth: `PRODUCT.md` (patient-site brand register and staff-portal product register) plus `DESIGN.md` (design system). UI baseline: `ui-reference/README.md`.

`README.md` is the user-facing overview. Cite it for the documented custody split. Do not treat it as developer documentation.

Project and vendor skills live under `.cursor/skills/`. Vendor guidance is advisory and
subordinate to this file. Re-copy a vendored skill from upstream instead of editing it.

### Documentation style

Write living instructions as the current operating model: name the workflow, its invariants, and
the steps an agent performs. Historical rationale and chronology belong in dated evidence
records; operational docs stay present-tense and self-sufficient.

## Contribution loop

Commits on a worktree are allowed. Use them while you work.

The standing gates are:

- `npx oxlint` reports zero warnings and zero errors under the repository's configured rules. Do not skip rules or narrow the scan to make the gate pass.
- `npx oxfmt --check` reports that every matched file already matches `.oxfmtrc.json`. Do not skip files or narrow the scan to make the gate pass. If it fails, run `npx oxfmt` and check again.
- `npx react-doctor@latest --verbose` reports a score of 100.
- `npm run build` completes a production compile and typecheck with no errors. Oxlint, oxfmt, and React Doctor can all pass while this fails, so they do not replace it. Do not skip it, narrow it, or substitute `tsc --noEmit`. Use the no-credentials environment in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification) when `.env.local` is absent. If the build cannot run, say so; the loop has not passed.
- Visual evidence is in the pull-request conversation for every UI-visible change. A single-state change needs before and after screenshots. A new workflow or a feature with more than one authored step needs a video of that path. A clean lint score with no visual evidence is a failed loop.

An extra check you are asked to run, including a single oxlint rule, is added to this list and does not replace it. Run the extra check first, then the standing gates; if a gate fails, fix it and rerun everything that already passed, because a later fix can reopen an earlier one.

The turn, the pull request, and the worktree merge all wait on every gate being clean.

Local React Doctor scores include untracked build output (`.next/`, `.next-e2e/`) and third-party sourcemaps, so hits under build directories or `node_modules` are noise. The score that counts is a clean checkout of the work you are about to share; do not edit generated files to raise it.

## Product, brand, and content rules

Product identity, copy register, and brand constraints live in `PRODUCT.md` and the modules that already document them (`src/lib/providers.ts` for credentials; `src/lib/site.ts` and `src/lib/documents.ts` for fact provenance and honest document fallbacks; footer one-way partner link in `src/components/Footer.tsx`).

## Frontend development

### Visual QA

The visual baseline is required. Before working on the frontend UI, open `ui-reference/README.md`.

Refresh the affected images against the matching local or Preview origin before committing. After deployment, use the default live-origin capture for public pages.

The atlas includes the seven top-level staff routes. Refresh them only with the Preview Branch seed identity, keep the browser-side redaction, and never include an individual request or Production data.

### Visual evidence

This gate sits beside oxlint, oxfmt, React Doctor, and `npm run build`. An agent that changes a visible UI surface does not finish, open a pull request, or merge a worktree until the pull-request conversation contains visual evidence of that change.

What to post:

- **Still change** — one screen, one state, or a copy/layout/color shift: before and after screenshots of every affected surface at the viewports the change is authored for. Desktop is 1440×900 and mobile is 390×844 when both apply.
- **Workflow or multi-step feature** — a new path, a handoff, or any change whose meaning is the sequence of steps: a video of the authored path. Screenshots may sit beside the video; they do not replace it.

How to post it:

- Put the evidence in a pull-request conversation comment, not only the PR body and not only the committed `ui-reference/` atlas.
- Capture from a local or Preview origin with fictional identity. Never Production. Never real patient or staff data. Never record the sign-in form; start a workflow video after the session exists.
- Atlas pages may be embedded from `ui-reference/` at the merge-base SHA (before) and the exact head SHA (after), the same way #227 does.
- Request-detail and other patient-data surfaces stay out of `ui-reference/`. Host those captures on a disposable `assets/pr-<number>-ui-evidence` branch and embed them in the comment.
- Name the before SHA and the after SHA. For a stack of UI commits, show how each commit changed the screen, not only the branch tip.
- Check that the images, and the video when required, render in the posted comment.

### shadcn/ui

shadcn/ui is installed and configured through `components.json` (style `base-nova`, Base UI
primitives, Tailwind v4 CSS variables). The design system itself — tokens, tiers, recipes, motion, the
ownership table — is [`DESIGN.md`](DESIGN.md); read its "Where does this belong?" table before
touching any UI.

**Three tiers, one direction.** `src/components/stock/` is the entire registry vendored byte-exact
(the before); `src/components/ui/` is the brand-adapted recipe (the after);
`src/components/patterns/` composes on `ui/`. Product surfaces never import from `stock/`; only
the gallery at `/design` does. `stock/**` is exempt from oxlint, oxfmt, and React Doctor's project
rules as vendored upstream code — the same standing as `.agents/**` — and is regenerated only by
`npm run ds:stock` (`scripts/design-system/sync-stock.mjs`), never hand-edited. The gallery
(`src/app/design/`) is project code and meets the full lint bar.

**The gallery is the first stop.** Before adopting or adapting a component, open
`http://localhost:3000/design/<component>` with `npm run dev` running (a top-level route, not
under `/admin`; also on Vercel Preview; a 404 in Production) and look at
stock, stock-through-the-bridge, and brand. A brand adaptation is not finished until its
example exists in `src/app/design/brand/` and is registered in `src/app/design/brand/index.ts`.

Components resolve every color through **semantic tokens** (`--background`, `--primary`,
`--muted`, …) that are bridged onto the committed brand palette in `src/app/globals.css`. The
bridge is the only place shadcn's tokens exist; the brand `@theme` block above it belongs to the
committed palette and is hands-off for shadcn and agents alike.

**shadcn never overwrites the brand palette.** The brand hues — navy, teal, amber, mint — are a
DESIGN.md anchor. `shadcn init`, `shadcn apply`, and any `add` that runs against a preset inject
neutral OKLCH literals, a `@theme inline` block that re-declares the Tailwind radius scale, and
`@apply` rules that reset `html`/`body` to shadcn's defaults, which would change every brand
radius and repaint the page white. The only place shadcn's neutral literals may exist is the
gallery's `[data-palette="stock"]` scope in `src/app/design/design.css`.

Reconciliation procedure — run after **every** CLI operation that touches CSS (the stock sync
script performs the hash check itself and fails on any change):

1. Commit or stash a clean checkpoint of `src/app/globals.css` **before** running the command.
2. Run the command, then `git diff src/app/globals.css` and reject or rewrite anything that:
   - adds OKLCH color literals to the semantic `:root` / `.dark` blocks — every semantic token
     must reference a brand `--color-*` token. The single permitted literal is `--destructive`
     (destructive actions have no brand hue by design);
   - touches the brand `@theme` block, its comment header, or any brand token value;
   - re-declares `--radius-*` inside the bridge's `@theme inline` block — the brand `@theme`
     owns the radius namespace (`--radius` 0.625rem, sm 0.375rem, lg 0.875rem);
   - injects `@apply` into the base layer (`border-border`, `outline-ring/50`, `font-sans`,
     `bg-background text-foreground`) — the existing base rules already carry brand values;
   - changes the font mappings — `--font-sans`/`--font-heading` resolve to the body sans (Lato).
3. New semantic tokens a component introduces get mapped onto brand tokens in the bridge, with a
   comment naming the brand pair.
4. Rerun the full contribution loop and capture before/after screenshots — palette drift is a
   UI-visible change.

shadcn and the brand share the Tailwind `--color-*` namespace, and the later `@theme` block wins.
The brand's secondary text ink is `--color-muted-ink`, not `--color-muted`, because shadcn's
`--color-muted` is a surface tint. Before adopting a component, list the semantic utilities it
uses (`bg-*`, `text-*`, `border-*`) and check each for a brand-token collision.

Adoption pattern: `npx shadcn@latest add <component>` generates into `src/components/ui/`. Run
`add --dry-run` / `--diff` before overwriting an existing component; local edits are merged, not
clobbered, but verify. Generated files are project-owned the moment they land: bring them up to
the repo's lint bar (top-level type-only imports, the documented disable-comment convention for
framework-typed props) and restyle through the recipe's axes or `className` for layout — not
by editing token values. Add a component only when something renders it; React Doctor fails the
loop on unused generated files and unused dependencies. The registry dependencies the stock tier
carries (`recharts`, `cmdk`, `react-day-picker`, …) are owned by `stock/` until a `ui/`
adaptation adopts one for real (`src/components/stock/README.md`).

Motion: two engines, one registry. CSS reads the `--motion-*` tokens; `motion/react` reads the
presets in `src/lib/motion.ts`, which are the same temperaments. Use whichever fits the job.
Neither engine invents a curve or duration — DESIGN.md "Motion".

`apply --preset` / `init --preset <code>` overwrite preset-driven CSS wholesale. Do not run one
without the reconciliation review above, and never let a preset's palette reach a commit.

## Backend development

### Intake, privacy, and portal security

Never weaken the [trust boundaries](ARCHITECTURE.md#trust-boundaries), [main execution paths](ARCHITECTURE.md#main-execution-paths), [patient-data lifecycle](ARCHITECTURE.md#patient-request-data-lifecycle), or [external interfaces](ARCHITECTURE.md#external-interfaces). The executable sources are `src/lib/portal/intake.ts`, `src/lib/portal/contracts.ts`, and `src/lib/portal/auth.ts`.

### Supabase guidance and dependency contract

Use the project-authored `wgi-supabase-branching` skill first, then the committed `supabase` and
`supabase-postgres-best-practices` vendor skills for database, Auth, and RLS work.

Every PR receives an isolated hosted Supabase Preview Branch and reports two database checks:
`Supabase Preview` deploys configuration, migrations, and fictional SQL seed data;
`supabase-integration` fetches only that branch's credentials, creates the fictional Auth
fixture, verifies schema/RLS/RPCs, and exercises Auth/SSR sessions, permission boundaries,
intake persistence, shared throttling, lifecycle boundaries, and PostgREST relationships.
Together, these checks are the database release gate for the exact PR head.

Automatic branching stays enabled for every PR; "Supabase changes only" and "Deploy to
production" stay disabled. Preview Branches contain no Production rows and may receive
destructive test writes. A PR merge never authorizes or performs a Production migration;
Production promotion and scheduler activation remain separate explicit actions.

## GitHub conventions

### Branch protection

GitHub `main` requires the current-head `quality`, `react-doctor`, `Vercel`, `Supabase Preview`,
and `supabase-integration` statuses, plus resolved conversations. Force pushes and deletions
are blocked. A skipped database check is not a passing signal.

## Release and operational truth

Distinguish code merged, code deployed, and operational. Before you finish, name every pending or unverified external dependency and post-deploy check.

## Verification

Commands, credential split, honesty rules, and the change-type → checks map live in [`CONTRIBUTING.md`](CONTRIBUTING.md#verification). [`ARCHITECTURE.md`](ARCHITECTURE.md#common-starting-points) owns the change-type → files map.

Lint, format, production-build, and visual-evidence gates for pull requests and worktree merges live in [Contribution loop](#contribution-loop).

## Agent skills

Issues live in this repo's GitHub Issues, managed with the `gh` CLI, and use five triage labels
as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
Domain context is the single `CONTEXT.md` at the repo root.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
