# Component Inventory

A descriptive census of every component this repository renders: what exists, where it lives, what
it exports, and how many places call it. It is a companion to [`DESIGN.md`](../DESIGN.md), which
owns the design system itself. This file makes no recommendations and proposes no changes.

Counts are a snapshot taken at `f5d062e`. Regenerate them with the commands in
[Regenerating this inventory](#regenerating-this-inventory) rather than editing numbers by hand.

## What counts as a component here

Every `.tsx` file under `src/` that exports a React component, excluding App Router route files
(`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`). Route files are consumers,
not components, so they appear in the "used in" columns but never as rows.

**Call sites** counts the distinct files that import a component. A component with two or more call
sites is filed under Reused; one call site puts it under Single call site. That threshold is
mechanical and carries no judgment — several single-call-site components are layout singletons that
are supposed to be mounted exactly once.

At the snapshot there are **56 component files**: 21 reused and 35 with a single call site.
`src/components/ui/` does not exist.

## Patient site — reused

All paths in this section are relative to `src/components/`.

| File | Exports | Lines | Call sites | Used in |
|---|---|---|---|---|
| `icons.tsx` | 30 named icon components | 297 | 47 | Patient site and staff portal alike |
| `TextBand.tsx` | `TextBand` | 36 | 14 | Most locale pages |
| `Reveal.tsx` | `Reveal` | 75 | 12 | Most locale pages |
| `PageHero.tsx` | `PageHero` | 22 | 11 | Every locale page with a hero |
| `LocationCards.tsx` | `LocationCards` | 85 | 3 | home, office-gallery, contact |
| `JsonLd.tsx` | `JsonLd` | 14 | 3 | locale layout, physicians, blog post |
| `AppointmentForm.tsx` | `AppointmentForm` | 473 | 2 | appointment, contact |
| `ArticleBody.tsx` | `ArticleBody` | 30 | 2 | patient-education post, blog post |
| `DocumentList.tsx` | `DocumentList` | 89 | 2 | resources, new-patients |
| `HoursTable.tsx` | `HoursTable` | 51 | 2 | contact, appointment |
| `LocationMaps.tsx` | `LocationMaps` | 64 | 2 | new-patients, contact |

`icons.tsx` is the most widely imported module in the repository. It exports hand-authored inline
SVGs rather than wrapping an icon package:

`Phone`, `MessageSquare`, `MapPin`, `Clock`, `Check`, `ArrowRight`, `ExternalLink`, `Menu`, `X`,
`ChevronDown`, `ChevronLeft`, `ChevronRight`, `Globe`, `Facebook`, `Star`, `ClipboardCheck`,
`FileText`, `Download`, `Maximize`, `ZoomIn`, `ZoomOut`, `Mail`, `Printer`, `Heart`, `Users`,
`Home`, `Settings`, `CircleHelp`, `Activity`, `LogOut`.

`components.json` names `lucide` as the project icon library. No component imports from it at the
snapshot.

## Patient site — single call site

| File | Exports | Lines | Used in |
|---|---|---|---|
| `Header.tsx` | `Header` | 419 | `src/app/[locale]/layout.tsx` |
| `Footer.tsx` | `Footer` | 266 | `src/app/[locale]/layout.tsx` |
| `LanguageChooser.tsx` | `LanguageChooser` | 159 | `src/app/[locale]/layout.tsx` |
| `NoticeBanner.tsx` | `NoticeBanner` | 78 | `src/app/[locale]/layout.tsx` |
| `ProfileCardViewer.tsx` | `ProfileCardViewer` | 342 | physicians |
| `PrepBody.tsx` | `PrepBody` | 198 | procedure-prep detail |
| `TestimonialRail.tsx` | `TestimonialRail` | 79 | home |
| `PrintButton.tsx` | `PrintButton` | 19 | procedure-prep detail |

The first four are mounted once from the locale layout and wrap the whole patient site. They are
singletons by construction; a second call site would be a defect, not an improvement.

## Review hub

| File | Exports | Lines | Used in |
|---|---|---|---|
| `src/app/review/ReviewHub.tsx` | `ReviewHub` | 261 | `src/app/review/page.tsx` |

`/review` sits outside both the `[locale]` tree and the portal and shares no components with either.

## Staff portal — reused

All paths in this section are relative to `src/app/admin/`.

| File | Exports | Lines | Call sites | Used in |
|---|---|---|---|---|
| `(portal)/portal-feedback.tsx` | `PortalFeedbackProvider`, `usePortalFeedback`, `PortalFeedbackMessage` | 89 | 13 | Portal-wide status messaging |
| `(portal)/portal-page-header.tsx` | `PortalPageHeader` | 45 | 9 | help, audit, settings layout, request detail, new request, print, review-flyers, portal error and not-found |
| `auth-card.tsx` | `AuthCard` | 43 | 4 | login, confirm, set-password, forgot-password |
| `(portal)/portal-release-briefing.tsx` | `PortalReleaseProvider`, `PortalReleaseHomeAnnouncement`, `PortalReleaseUtility` | 581 | 2 | portal layout, portal home |
| `(portal)/requests/new/staff-request-form.tsx` | `StaffRequestForm` | 716 | 2 | add-appointment-dialog, new request |
| `(portal)/requests/print-chooser.tsx` | `PrintChooser` | 261 | 2 | home-workbench, requests-output-actions |
| `(portal)/requests/status-badge.tsx` | `StatusBadge` | 25 | 2 | requests list, request detail |
| `(portal)/audit/recent-work-pagination.tsx` | `RecentWorkPagination` | 85 | 2 | recent-work, audit |
| `(portal)/audit/recent-work-focus-target.tsx` | `RecentWorkFocusTarget` | 37 | 2 | recent-work, audit |
| `forgot-password/reset-request-form.tsx` | `ResetRequestForm` | 219 | 2 | login-form, forgot-password |
| `set-password/password-form.tsx` | `PasswordForm` | 116 | 2 | set-password, confirm-form |

`portal-feedback.tsx` is a context provider rather than a rendered surface. Its thirteen call sites
are the portal features that publish or read status messages, which makes it the closest thing the
portal has to shared infrastructure.

## Staff portal — single call site

Grouped by the feature each component belongs to. Paths are relative to `src/app/admin/(portal)/`.

**Request workflow**

| File | Exports | Lines | Used in |
|---|---|---|---|
| `requests/[id]/workflow-panel.tsx` | `WorkflowPanel` | 1407 | request detail |
| `requests/[id]/request-notes.tsx` | `RequestNotes` | 254 | request detail |
| `requests/[id]/request-current-feedback.tsx` | `StaffRequestCreatedAcknowledgement`, `RequestPrintButton`, `RequestPrintFeedback` | 68 | request detail |
| `requests/request-search-form.tsx` | `RequestSearchForm` | 126 | requests list |
| `requests/requests-output-actions.tsx` | `RequestsOutputActions`, `RequestsOutputFeedback`, `REQUESTS_OUTPUT_UTILITY_CLASS` | 77 | requests list |
| `requests/print/print-controls.tsx` | `PrintPacketControls` | 81 | print packet |

`workflow-panel.tsx` is the largest component file in the repository.

**Settings**

| File | Exports | Lines | Used in |
|---|---|---|---|
| `settings/recipients-manager.tsx` | `RecipientsManager` | 898 | settings |
| `settings/staff-manager.tsx` | `StaffManager` | 607 | settings |
| `settings/software/maintainer-access.tsx` | `MaintainerAccess`, `MaintainerAccessModel` | 424 | settings/software |
| `settings/settings-tabs.tsx` | `SettingsTabs` | 41 | settings layout |

`maintainer-access.tsx` has one UI consumer, but `src/lib/portal/maintainers.ts` also imports its
`MaintainerAccessModel` type — a library module depending on a component file.

**Portal shell and home**

| File | Exports | Lines | Used in |
|---|---|---|---|
| `sheet-line.tsx` | `SheetLineRow` | 890 | home-workbench |
| `portal-calendar.tsx` | `PortalCalendar` | 275 | sheet-line |
| `home-workbench.tsx` | `HomeWorkbench` | 237 | portal home |
| `portal-tour.tsx` | `PortalTour` | 180 | portal home |
| `add-appointment-dialog.tsx` | `AddAppointmentDialog` | 116 | home-workbench |
| `portal-modal.tsx` | `PortalModal` | 104 | sheet-line |
| `portal-nav.tsx` | `PortalNav` | 63 | portal layout |
| `portal-tour-return-focus.tsx` | `PortalTourReturnFocus` | 37 | portal home |

**Audit**

| File | Exports | Lines | Used in |
|---|---|---|---|
| `audit/release-engagement.tsx` | `ReleaseEngagementSection` | 233 | audit |
| `audit/recent-work.tsx` | `RecentWorkSection` | 208 | audit |
| `audit/recent-work-controls.tsx` | `RecentWorkControls` | 128 | recent-work |
| `audit/recent-work-focus-link.tsx` | `RecentWorkFocusLink` | 29 | recent-work |

**Auth and printing**

| File | Exports | Lines | Used in |
|---|---|---|---|
| `review-flyers/review-flyer-printer.tsx` | `ReviewFlyerPrinter` | 290 | review-flyers |
| `../login/login-form.tsx` | `LoginForm` | 114 | login |
| `../auth/confirm/confirm-form.tsx` | `ConfirmAuthForm` | 106 | confirm |

## The CSS component layer

A second component system lives in `src/app/globals.css` (2,612 lines at the snapshot) as roughly
130 authored class names with no React wrapper. Any inventory that counts only `.tsx` files
understates what the design system actually contains, so the families are recorded here.
`DESIGN.md` remains the authority on what each one means.

**Element primitives** — `.btn` with the variants `.btn-navy`, `.btn-amber`, `.btn-outline`,
`.btn-ghost-light`, `.btn-sm`, `.btn-lg`; `.card` and `.card-lined`; the form set `.field-input`,
`.field-label`, `.field-hint`, `.field-error`.

**Typography** — `.display`, `.h1`, `.h2`, `.h3`, `.lead`, `.measure`, `.measure-sm`, `.link-line`,
`.link-plain`, and the list family `.list-check`, `.list-avoid`, `.list-steps`, `.list-plain`.

**Layout** — `.container-x`, `.container-tight`, `.section`, `.section-sm`, `.rail`, `.skip-link`,
`.print-hide`, `.bidi-ltr`, `.fill-blank`.

**Feature-scoped BEM blocks**, each belonging to exactly one surface:

| Prefix | Approximate count | Surface |
|---|---|---|
| `.portal-*` | 18 | Staff portal shell, panels, queue, help |
| `.pc-*` | 16 | Profile card viewer |
| `.language-dialog__*` | 11 | Language chooser |
| `.review-flyer-*` | 13 | Review flyer printer |
| `.release-signal__*`, `.release-summary__*`, `.release-*` | 13 | Release briefing and audit |
| `.request-*` | 10 | Request detail, notes, print |
| `.prep-*`, `.prep-table*` | 7 | Procedure prep pages |
| `.notice-banner`, `.review-rise` | 2 | Notice banner, review hub |

## Regenerating this inventory

From the repository root.

Component files, excluding route files:

```bash
find src -name "*.tsx" \
  ! -name "page.tsx" ! -name "layout.tsx" ! -name "loading.tsx" \
  ! -name "error.tsx" ! -name "not-found.tsx" | sort
```

Call-site count and importer list for a single component, where `NAME` is the file's basename
without the extension:

```bash
rg -l "/NAME[\"']|\./NAME[\"']" src --glob '*.tsx' --glob '*.ts'
```

Exported symbols for a file:

```bash
rg -n "^export (default )?(async )?function |^export const " PATH
```

Authored class names in the stylesheet:

```bash
rg -n '^\s{0,4}\.[a-z][a-zA-Z0-9_-]*(,|\s*\{)' src/app/globals.css -o | sort -u
```

The importer query matches on file path, so it counts the files that import a module rather than
the number of times each export is used. Two components exported from one file share a single
count. Where that distinction matters, the Exports column lists every symbol.
