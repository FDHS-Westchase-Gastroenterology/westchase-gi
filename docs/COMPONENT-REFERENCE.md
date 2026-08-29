# Component Reference

The importer path list for every component in
[`COMPONENT-INVENTORY.md`](COMPONENT-INVENTORY.md). The inventory says what exists,
what it exports, and how many files call it. This file lists those files.

Taken at `fe088fd`. Same definition of a component as the inventory: every `.tsx`
file under `src/` that exports a React component, excluding App Router route files
(`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`). Route files
appear here only as consumers. `button-variants.ts` and `reveal-delay.ts` are
included because the inventory records them with the component system.

Each heading is a component file. The list under it is every `src/` file that
imports that module. When a file exports more than one symbol, the imported names
are listed next to the path. The query matches on the resolved import path, so two
exports from one file share one consumer list. A file that imports a module twice
still appears once.

## Contents

- [Component system](#component-system)
  - [`src/components/ui/`](#srccomponentsui)
  - [`src/components/primitives/`](#srccomponentsprimitives)
- [Patient site](#patient-site)
  - [Reused](#reused)
  - [Single call site](#single-call-site)
- [Review hub](#review-hub)
- [Staff portal](#staff-portal)
  - [Reused](#reused-1)
  - [Request workflow](#request-workflow)
  - [Settings](#settings)
  - [Portal shell and home](#portal-shell-and-home)
  - [Audit](#audit)
  - [Auth and printing](#auth-and-printing)
- [Regenerating this reference](#regenerating-this-reference)

## Component system

The design-system tiers from DESIGN.md. `ui/` is the brand-adapted shadcn
register. `primitives/` is brand-authored composition.

### [`src/components/ui/`](<../src/components/ui/>)

### [`src/components/ui/button.tsx`](<../src/components/ui/button.tsx>)

Exports: `Button`.

Used in 21 files:

- [`src/app/admin/(portal)/audit/recent-work-controls.tsx`](<../src/app/admin/(portal)/audit/recent-work-controls.tsx>)
- [`src/app/admin/(portal)/error.tsx`](<../src/app/admin/(portal)/error.tsx>)
- [`src/app/admin/(portal)/portal-release-briefing.tsx`](<../src/app/admin/(portal)/portal-release-briefing.tsx>)
- [`src/app/admin/(portal)/portal-tour.tsx`](<../src/app/admin/(portal)/portal-tour.tsx>)
- [`src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx`](<../src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx>)
- [`src/app/admin/(portal)/requests/[id]/request-notes.tsx`](<../src/app/admin/(portal)/requests/[id]/request-notes.tsx>)
- [`src/app/admin/(portal)/requests/[id]/workflow-panel.tsx`](<../src/app/admin/(portal)/requests/[id]/workflow-panel.tsx>)
- [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>)
- [`src/app/admin/(portal)/requests/print-chooser.tsx`](<../src/app/admin/(portal)/requests/print-chooser.tsx>)
- [`src/app/admin/(portal)/requests/print/print-controls.tsx`](<../src/app/admin/(portal)/requests/print/print-controls.tsx>)
- [`src/app/admin/(portal)/requests/request-search-form.tsx`](<../src/app/admin/(portal)/requests/request-search-form.tsx>)
- [`src/app/admin/(portal)/settings/recipients-manager.tsx`](<../src/app/admin/(portal)/settings/recipients-manager.tsx>)
- [`src/app/admin/(portal)/settings/software/maintainer-access.tsx`](<../src/app/admin/(portal)/settings/software/maintainer-access.tsx>)
- [`src/app/admin/(portal)/settings/staff-manager.tsx`](<../src/app/admin/(portal)/settings/staff-manager.tsx>)
- [`src/app/admin/(portal)/sheet-line.tsx`](<../src/app/admin/(portal)/sheet-line.tsx>)
- [`src/app/admin/auth/confirm/confirm-form.tsx`](<../src/app/admin/auth/confirm/confirm-form.tsx>)
- [`src/app/admin/forgot-password/reset-request-form.tsx`](<../src/app/admin/forgot-password/reset-request-form.tsx>)
- [`src/app/admin/login/login-form.tsx`](<../src/app/admin/login/login-form.tsx>)
- [`src/app/admin/set-password/password-form.tsx`](<../src/app/admin/set-password/password-form.tsx>)
- [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>)
- [`src/components/PrintButton.tsx`](<../src/components/PrintButton.tsx>)

### [`src/components/ui/button-variants.ts`](<../src/components/ui/button-variants.ts>)

Exports: `buttonVariants`.

Used in 33 files:

- [`src/app/[locale]/appointment/page.tsx`](<../src/app/[locale]/appointment/page.tsx>)
- [`src/app/[locale]/appointment/received/page.tsx`](<../src/app/[locale]/appointment/received/page.tsx>)
- [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>)
- [`src/app/[locale]/not-found.tsx`](<../src/app/[locale]/not-found.tsx>)
- [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>)
- [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>)
- [`src/app/[locale]/patient-education/[slug]/page.tsx`](<../src/app/[locale]/patient-education/[slug]/page.tsx>)
- [`src/app/[locale]/procedure-prep/[slug]/page.tsx`](<../src/app/[locale]/procedure-prep/[slug]/page.tsx>)
- [`src/app/[locale]/procedure-prep/page.tsx`](<../src/app/[locale]/procedure-prep/page.tsx>)
- [`src/app/[locale]/resources/page.tsx`](<../src/app/[locale]/resources/page.tsx>)
- [`src/app/admin/(portal)/audit/recent-work-pagination.tsx`](<../src/app/admin/(portal)/audit/recent-work-pagination.tsx>)
- [`src/app/admin/(portal)/audit/recent-work.tsx`](<../src/app/admin/(portal)/audit/recent-work.tsx>)
- [`src/app/admin/(portal)/error.tsx`](<../src/app/admin/(portal)/error.tsx>)
- [`src/app/admin/(portal)/help/page.tsx`](<../src/app/admin/(portal)/help/page.tsx>)
- [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>)
- [`src/app/admin/(portal)/not-found.tsx`](<../src/app/admin/(portal)/not-found.tsx>)
- [`src/app/admin/(portal)/portal-release-briefing.tsx`](<../src/app/admin/(portal)/portal-release-briefing.tsx>)
- [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>)
- [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>)
- [`src/app/admin/(portal)/requests/page.tsx`](<../src/app/admin/(portal)/requests/page.tsx>)
- [`src/app/admin/(portal)/requests/print-chooser.tsx`](<../src/app/admin/(portal)/requests/print-chooser.tsx>)
- [`src/app/admin/(portal)/requests/print/page.tsx`](<../src/app/admin/(portal)/requests/print/page.tsx>)
- [`src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx`](<../src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx>)
- [`src/app/admin/(portal)/settings/software/page.tsx`](<../src/app/admin/(portal)/settings/software/page.tsx>)
- [`src/app/admin/auth/confirm/confirm-form.tsx`](<../src/app/admin/auth/confirm/confirm-form.tsx>)
- [`src/app/review/ReviewHub.tsx`](<../src/app/review/ReviewHub.tsx>)
- [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>)
- [`src/components/Footer.tsx`](<../src/components/Footer.tsx>)
- [`src/components/Header.tsx`](<../src/components/Header.tsx>)
- [`src/components/LocationCards.tsx`](<../src/components/LocationCards.tsx>)
- [`src/components/LocationMaps.tsx`](<../src/components/LocationMaps.tsx>)
- [`src/components/primitives/TextBand.tsx`](<../src/components/primitives/TextBand.tsx>)
- [`src/components/ui/button.tsx`](<../src/components/ui/button.tsx>)

`button.tsx` is listed because it imports the register. The inventory's
call-site count excludes that wrapper so the number is the surfaces that wear
the register directly.

### [`src/components/ui/field.tsx`](<../src/components/ui/field.tsx>)

Exports: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle`.

Used in 5 files:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>) | `Field`, `FieldDescription`, `FieldError`, `FieldLabel` |
| [`src/app/admin/(portal)/requests/request-search-form.tsx`](<../src/app/admin/(portal)/requests/request-search-form.tsx>) | `Field`, `FieldLabel` |
| [`src/app/admin/(portal)/settings/recipients-manager.tsx`](<../src/app/admin/(portal)/settings/recipients-manager.tsx>) | `Field`, `FieldError`, `FieldLabel` |
| [`src/app/admin/(portal)/settings/staff-manager.tsx`](<../src/app/admin/(portal)/settings/staff-manager.tsx>) | `Field`, `FieldError`, `FieldLabel` |
| [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>) | `Field`, `FieldDescription`, `FieldError`, `FieldLabel` |

### [`src/components/ui/input.tsx`](<../src/components/ui/input.tsx>)

Exports: `Input`.

Used in 5 files:

- [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>)
- [`src/app/admin/(portal)/requests/request-search-form.tsx`](<../src/app/admin/(portal)/requests/request-search-form.tsx>)
- [`src/app/admin/(portal)/settings/recipients-manager.tsx`](<../src/app/admin/(portal)/settings/recipients-manager.tsx>)
- [`src/app/admin/(portal)/settings/staff-manager.tsx`](<../src/app/admin/(portal)/settings/staff-manager.tsx>)
- [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>)

### [`src/components/ui/native-select.tsx`](<../src/components/ui/native-select.tsx>)

Exports: `NativeSelect`.

Used in 3 files:

- [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>)
- [`src/app/admin/(portal)/settings/staff-manager.tsx`](<../src/app/admin/(portal)/settings/staff-manager.tsx>)
- [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>)

### [`src/components/ui/textarea.tsx`](<../src/components/ui/textarea.tsx>)

Exports: `Textarea`.

Used in 2 files:

- [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>)
- [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>)

### [`src/components/ui/badge.tsx`](<../src/components/ui/badge.tsx>)

Exports: `Badge`.

Used in 1 file:

- [`src/app/admin/(portal)/requests/status-badge.tsx`](<../src/app/admin/(portal)/requests/status-badge.tsx>)

### [`src/components/ui/table.tsx`](<../src/components/ui/table.tsx>)

Exports: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`.

Used in 2 files:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/audit/page.tsx`](<../src/app/admin/(portal)/audit/page.tsx>) | `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` |
| [`src/app/admin/(portal)/audit/release-engagement.tsx`](<../src/app/admin/(portal)/audit/release-engagement.tsx>) | `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` |

### [`src/components/ui/label.tsx`](<../src/components/ui/label.tsx>)

Exports: `Label`.

Used in 1 file:

- [`src/components/ui/field.tsx`](<../src/components/ui/field.tsx>)

### [`src/components/ui/separator.tsx`](<../src/components/ui/separator.tsx>)

Exports: `Separator`.

Used in 1 file:

- [`src/components/ui/field.tsx`](<../src/components/ui/field.tsx>)

### [`src/components/primitives/`](<../src/components/primitives/>)

### [`src/components/primitives/TextBand.tsx`](<../src/components/primitives/TextBand.tsx>)

Exports: `TextBand`.

Used in 14 files:

- [`src/app/[locale]/about/page.tsx`](<../src/app/[locale]/about/page.tsx>)
- [`src/app/[locale]/blog/[slug]/page.tsx`](<../src/app/[locale]/blog/[slug]/page.tsx>)
- [`src/app/[locale]/blog/page.tsx`](<../src/app/[locale]/blog/page.tsx>)
- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)
- [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>)
- [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>)
- [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>)
- [`src/app/[locale]/patient-education/[slug]/page.tsx`](<../src/app/[locale]/patient-education/[slug]/page.tsx>)
- [`src/app/[locale]/patient-education/page.tsx`](<../src/app/[locale]/patient-education/page.tsx>)
- [`src/app/[locale]/physicians/page.tsx`](<../src/app/[locale]/physicians/page.tsx>)
- [`src/app/[locale]/procedure-prep/[slug]/page.tsx`](<../src/app/[locale]/procedure-prep/[slug]/page.tsx>)
- [`src/app/[locale]/procedure-prep/page.tsx`](<../src/app/[locale]/procedure-prep/page.tsx>)
- [`src/app/[locale]/resources/page.tsx`](<../src/app/[locale]/resources/page.tsx>)
- [`src/app/[locale]/services/page.tsx`](<../src/app/[locale]/services/page.tsx>)

### [`src/components/primitives/Reveal.tsx`](<../src/components/primitives/Reveal.tsx>)

Exports: `Reveal`.

Used in 12 files:

- [`src/app/[locale]/about/page.tsx`](<../src/app/[locale]/about/page.tsx>)
- [`src/app/[locale]/blog/[slug]/page.tsx`](<../src/app/[locale]/blog/[slug]/page.tsx>)
- [`src/app/[locale]/blog/page.tsx`](<../src/app/[locale]/blog/page.tsx>)
- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)
- [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>)
- [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>)
- [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>)
- [`src/app/[locale]/patient-education/page.tsx`](<../src/app/[locale]/patient-education/page.tsx>)
- [`src/app/[locale]/physicians/page.tsx`](<../src/app/[locale]/physicians/page.tsx>)
- [`src/app/[locale]/procedure-prep/page.tsx`](<../src/app/[locale]/procedure-prep/page.tsx>)
- [`src/app/[locale]/resources/page.tsx`](<../src/app/[locale]/resources/page.tsx>)
- [`src/app/[locale]/services/page.tsx`](<../src/app/[locale]/services/page.tsx>)

### [`src/components/primitives/PageHero.tsx`](<../src/components/primitives/PageHero.tsx>)

Exports: `PageHero`.

Used in 11 files:

- [`src/app/[locale]/about/page.tsx`](<../src/app/[locale]/about/page.tsx>)
- [`src/app/[locale]/appointment/page.tsx`](<../src/app/[locale]/appointment/page.tsx>)
- [`src/app/[locale]/blog/page.tsx`](<../src/app/[locale]/blog/page.tsx>)
- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)
- [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>)
- [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>)
- [`src/app/[locale]/patient-education/page.tsx`](<../src/app/[locale]/patient-education/page.tsx>)
- [`src/app/[locale]/physicians/page.tsx`](<../src/app/[locale]/physicians/page.tsx>)
- [`src/app/[locale]/procedure-prep/page.tsx`](<../src/app/[locale]/procedure-prep/page.tsx>)
- [`src/app/[locale]/resources/page.tsx`](<../src/app/[locale]/resources/page.tsx>)
- [`src/app/[locale]/services/page.tsx`](<../src/app/[locale]/services/page.tsx>)

### [`src/components/primitives/reveal-delay.ts`](<../src/components/primitives/reveal-delay.ts>)

Exports: `RevealDelay`, `revealDelay`.

Used in 4 files:

| File | Imports |
|---|---|
| [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>) | `revealDelay` |
| [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>) | `revealDelay` |
| [`src/app/[locale]/procedure-prep/page.tsx`](<../src/app/[locale]/procedure-prep/page.tsx>) | `RevealDelay`, `revealDelay` |
| [`src/components/primitives/Reveal.tsx`](<../src/components/primitives/Reveal.tsx>) | `RevealDelay` |

## Patient site

Shared patient-site components. Layout singletons live under Single call
site.

### Reused

### [`src/components/icons.tsx`](<../src/components/icons.tsx>)

Exports: `Phone`, `MessageSquare`, `MapPin`, `Clock`, `Check`, `ArrowRight`, `ExternalLink`, `Menu`, `X`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `Globe`, `Facebook`, `Star`, `ClipboardCheck`, `FileText`, `Download`, `Maximize`, `ZoomIn`, `ZoomOut`, `Mail`, `Printer`, `Heart`, `Users`, `Home`, `Settings`, `CircleHelp`, `Activity`, `LogOut`.

Used in 47 files:

| File | Imports |
|---|---|
| [`src/app/[locale]/about/page.tsx`](<../src/app/[locale]/about/page.tsx>) | `ArrowRight` |
| [`src/app/[locale]/appointment/page.tsx`](<../src/app/[locale]/appointment/page.tsx>) | `MessageSquare`, `Phone` |
| [`src/app/[locale]/appointment/received/page.tsx`](<../src/app/[locale]/appointment/received/page.tsx>) | `Check`, `MessageSquare`, `Phone` |
| [`src/app/[locale]/blog/[slug]/page.tsx`](<../src/app/[locale]/blog/[slug]/page.tsx>) | `ArrowRight` |
| [`src/app/[locale]/blog/page.tsx`](<../src/app/[locale]/blog/page.tsx>) | `ArrowRight`, `MessageSquare` |
| [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>) | `ExternalLink`, `FileText` |
| [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>) | `ExternalLink`, `Star` |
| [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>) | `ArrowRight`, `ClipboardCheck`, `ExternalLink`, `Heart`, `MessageSquare`, `Phone` |
| [`src/app/[locale]/patient-education/[slug]/page.tsx`](<../src/app/[locale]/patient-education/[slug]/page.tsx>) | `ArrowRight`, `Download`, `FileText`, `MessageSquare` |
| [`src/app/[locale]/patient-education/page.tsx`](<../src/app/[locale]/patient-education/page.tsx>) | `ArrowRight` |
| [`src/app/[locale]/procedure-prep/[slug]/page.tsx`](<../src/app/[locale]/procedure-prep/[slug]/page.tsx>) | `MessageSquare`, `Phone` |
| [`src/app/[locale]/procedure-prep/page.tsx`](<../src/app/[locale]/procedure-prep/page.tsx>) | `ArrowRight`, `MessageSquare` |
| [`src/app/[locale]/resources/page.tsx`](<../src/app/[locale]/resources/page.tsx>) | `ArrowRight`, `ExternalLink` |
| [`src/app/[locale]/services/page.tsx`](<../src/app/[locale]/services/page.tsx>) | `ArrowRight` |
| [`src/app/admin/(portal)/error.tsx`](<../src/app/admin/(portal)/error.tsx>) | `Activity` |
| [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>) | `ChevronRight` |
| [`src/app/admin/(portal)/layout.tsx`](<../src/app/admin/(portal)/layout.tsx>) | `Activity`, `ExternalLink`, `FileText`, `LogOut`, `Users` |
| [`src/app/admin/(portal)/not-found.tsx`](<../src/app/admin/(portal)/not-found.tsx>) | `CircleHelp` |
| [`src/app/admin/(portal)/portal-calendar.tsx`](<../src/app/admin/(portal)/portal-calendar.tsx>) | `ChevronLeft`, `ChevronRight` |
| [`src/app/admin/(portal)/portal-nav.tsx`](<../src/app/admin/(portal)/portal-nav.tsx>) | `CircleHelp`, `ClipboardCheck`, `Home`, `Settings` |
| [`src/app/admin/(portal)/portal-page-header.tsx`](<../src/app/admin/(portal)/portal-page-header.tsx>) | `ChevronLeft` |
| [`src/app/admin/(portal)/portal-release-briefing.tsx`](<../src/app/admin/(portal)/portal-release-briefing.tsx>) | `ArrowRight`, `ChevronDown`, `X` |
| [`src/app/admin/(portal)/portal-tour.tsx`](<../src/app/admin/(portal)/portal-tour.tsx>) | `X` |
| [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>) | `Clock`, `Mail`, `MapPin`, `MessageSquare`, `Phone` |
| [`src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx`](<../src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx>) | `Check`, `Printer` |
| [`src/app/admin/(portal)/requests/[id]/workflow-panel.tsx`](<../src/app/admin/(portal)/requests/[id]/workflow-panel.tsx>) | `Check` |
| [`src/app/admin/(portal)/requests/page.tsx`](<../src/app/admin/(portal)/requests/page.tsx>) | `ChevronRight` |
| [`src/app/admin/(portal)/requests/print-chooser.tsx`](<../src/app/admin/(portal)/requests/print-chooser.tsx>) | `Printer` |
| [`src/app/admin/(portal)/requests/print/page.tsx`](<../src/app/admin/(portal)/requests/print/page.tsx>) | `ArrowRight`, `Printer` |
| [`src/app/admin/(portal)/requests/print/print-controls.tsx`](<../src/app/admin/(portal)/requests/print/print-controls.tsx>) | `Printer` |
| [`src/app/admin/(portal)/requests/requests-output-actions.tsx`](<../src/app/admin/(portal)/requests/requests-output-actions.tsx>) | `Download` |
| [`src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx`](<../src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx>) | `Check` |
| [`src/app/admin/(portal)/settings/software/page.tsx`](<../src/app/admin/(portal)/settings/software/page.tsx>) | `Check` |
| [`src/app/admin/(portal)/sheet-line.tsx`](<../src/app/admin/(portal)/sheet-line.tsx>) | `Check`, `ChevronRight`, `Phone` |
| [`src/app/review/ReviewHub.tsx`](<../src/app/review/ReviewHub.tsx>) | `ExternalLink`, `Facebook`, `Globe`, `MessageSquare`, `Phone`, `Star` |
| [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>) | `Check`, `MessageSquare`, `Phone` |
| [`src/components/DocumentList.tsx`](<../src/components/DocumentList.tsx>) | `ArrowRight`, `Download`, `FileText`, `MessageSquare` |
| [`src/components/Footer.tsx`](<../src/components/Footer.tsx>) | `ArrowRight`, `ExternalLink`, `Facebook`, `Mail`, `MapPin`, `MessageSquare`, `Phone`, `Printer`, `Star` |
| [`src/components/Header.tsx`](<../src/components/Header.tsx>) | `Check`, `ChevronDown`, `ExternalLink`, `Globe`, `Menu`, `MessageSquare`, `Phone`, `X` |
| [`src/components/LanguageChooser.tsx`](<../src/components/LanguageChooser.tsx>) | `Check`, `Globe`, `X` |
| [`src/components/LocationCards.tsx`](<../src/components/LocationCards.tsx>) | `Clock`, `Mail`, `MapPin`, `MessageSquare`, `Phone`, `Printer` |
| [`src/components/LocationMaps.tsx`](<../src/components/LocationMaps.tsx>) | `MapPin` |
| [`src/components/NoticeBanner.tsx`](<../src/components/NoticeBanner.tsx>) | `X` |
| [`src/components/primitives/TextBand.tsx`](<../src/components/primitives/TextBand.tsx>) | `MessageSquare`, `Phone` |
| [`src/components/PrintButton.tsx`](<../src/components/PrintButton.tsx>) | `Printer` |
| [`src/components/ProfileCardViewer.tsx`](<../src/components/ProfileCardViewer.tsx>) | `Download`, `Maximize`, `X`, `ZoomIn`, `ZoomOut` |
| [`src/components/TestimonialRail.tsx`](<../src/components/TestimonialRail.tsx>) | `ChevronLeft`, `ChevronRight`, `Star` |

### [`src/components/LocationCards.tsx`](<../src/components/LocationCards.tsx>)

Exports: `LocationCards`.

Used in 3 files:

- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)
- [`src/app/[locale]/office-gallery/page.tsx`](<../src/app/[locale]/office-gallery/page.tsx>)
- [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>)

### [`src/components/JsonLd.tsx`](<../src/components/JsonLd.tsx>)

Exports: `JsonLd`.

Used in 3 files:

- [`src/app/[locale]/blog/[slug]/page.tsx`](<../src/app/[locale]/blog/[slug]/page.tsx>)
- [`src/app/[locale]/layout.tsx`](<../src/app/[locale]/layout.tsx>)
- [`src/app/[locale]/physicians/page.tsx`](<../src/app/[locale]/physicians/page.tsx>)

### [`src/components/AppointmentForm.tsx`](<../src/components/AppointmentForm.tsx>)

Exports: `AppointmentForm`.

Used in 2 files:

- [`src/app/[locale]/appointment/page.tsx`](<../src/app/[locale]/appointment/page.tsx>)
- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)

### [`src/components/ArticleBody.tsx`](<../src/components/ArticleBody.tsx>)

Exports: `ArticleBody`.

Used in 2 files:

- [`src/app/[locale]/blog/[slug]/page.tsx`](<../src/app/[locale]/blog/[slug]/page.tsx>)
- [`src/app/[locale]/patient-education/[slug]/page.tsx`](<../src/app/[locale]/patient-education/[slug]/page.tsx>)

### [`src/components/DocumentList.tsx`](<../src/components/DocumentList.tsx>)

Exports: `DocumentList`.

Used in 2 files:

- [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>)
- [`src/app/[locale]/resources/page.tsx`](<../src/app/[locale]/resources/page.tsx>)

### [`src/components/HoursTable.tsx`](<../src/components/HoursTable.tsx>)

Exports: `HoursTable`.

Used in 2 files:

- [`src/app/[locale]/appointment/page.tsx`](<../src/app/[locale]/appointment/page.tsx>)
- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)

### [`src/components/LocationMaps.tsx`](<../src/components/LocationMaps.tsx>)

Exports: `LocationMaps`.

Used in 2 files:

- [`src/app/[locale]/contact/page.tsx`](<../src/app/[locale]/contact/page.tsx>)
- [`src/app/[locale]/new-patients/page.tsx`](<../src/app/[locale]/new-patients/page.tsx>)

### Single call site

### [`src/components/Header.tsx`](<../src/components/Header.tsx>)

Exports: `Header`.

Used in 1 file:

- [`src/app/[locale]/layout.tsx`](<../src/app/[locale]/layout.tsx>)

### [`src/components/Footer.tsx`](<../src/components/Footer.tsx>)

Exports: `Footer`.

Used in 1 file:

- [`src/app/[locale]/layout.tsx`](<../src/app/[locale]/layout.tsx>)

### [`src/components/LanguageChooser.tsx`](<../src/components/LanguageChooser.tsx>)

Exports: `LanguageChooser`.

Used in 1 file:

- [`src/app/[locale]/layout.tsx`](<../src/app/[locale]/layout.tsx>)

### [`src/components/NoticeBanner.tsx`](<../src/components/NoticeBanner.tsx>)

Exports: `NoticeBanner`.

Used in 1 file:

- [`src/app/[locale]/layout.tsx`](<../src/app/[locale]/layout.tsx>)

### [`src/components/ProfileCardViewer.tsx`](<../src/components/ProfileCardViewer.tsx>)

Exports: `ProfileCardViewer`.

Used in 1 file:

- [`src/app/[locale]/physicians/page.tsx`](<../src/app/[locale]/physicians/page.tsx>)

### [`src/components/PrepBody.tsx`](<../src/components/PrepBody.tsx>)

Exports: `PrepBody`.

Used in 1 file:

- [`src/app/[locale]/procedure-prep/[slug]/page.tsx`](<../src/app/[locale]/procedure-prep/[slug]/page.tsx>)

### [`src/components/TestimonialRail.tsx`](<../src/components/TestimonialRail.tsx>)

Exports: `TestimonialRail`.

Used in 1 file:

- [`src/app/[locale]/page.tsx`](<../src/app/[locale]/page.tsx>)

### [`src/components/PrintButton.tsx`](<../src/components/PrintButton.tsx>)

Exports: `PrintButton`.

Used in 1 file:

- [`src/app/[locale]/procedure-prep/[slug]/page.tsx`](<../src/app/[locale]/procedure-prep/[slug]/page.tsx>)

## Review hub

`/review` sits outside both the locale tree and the portal.

### [`src/app/review/ReviewHub.tsx`](<../src/app/review/ReviewHub.tsx>)

Exports: `ReviewHub`.

Used in 1 file:

- [`src/app/review/page.tsx`](<../src/app/review/page.tsx>)

## Staff portal

Portal components, grouped the same way as the inventory.

### Reused

### [`src/app/admin/(portal)/portal-feedback.tsx`](<../src/app/admin/(portal)/portal-feedback.tsx>)

Exports: `PortalFeedbackTone`, `PortalFeedback`, `PortalFeedbackProvider`, `usePortalFeedback`, `PortalFeedbackMessage`.

Used in 13 files:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/add-appointment-dialog.tsx`](<../src/app/admin/(portal)/add-appointment-dialog.tsx>) | `usePortalFeedback` |
| [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>) | `PortalFeedbackMessage`, `PortalFeedbackProvider` |
| [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>) | `PortalFeedbackProvider` |
| [`src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx`](<../src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx>) | `PortalFeedbackMessage`, `usePortalFeedback` |
| [`src/app/admin/(portal)/requests/[id]/request-notes.tsx`](<../src/app/admin/(portal)/requests/[id]/request-notes.tsx>) | `usePortalFeedback` |
| [`src/app/admin/(portal)/requests/[id]/workflow-panel.tsx`](<../src/app/admin/(portal)/requests/[id]/workflow-panel.tsx>) | `usePortalFeedback` |
| [`src/app/admin/(portal)/requests/page.tsx`](<../src/app/admin/(portal)/requests/page.tsx>) | `PortalFeedbackProvider` |
| [`src/app/admin/(portal)/requests/print-chooser.tsx`](<../src/app/admin/(portal)/requests/print-chooser.tsx>) | `usePortalFeedback` |
| [`src/app/admin/(portal)/requests/print/page.tsx`](<../src/app/admin/(portal)/requests/print/page.tsx>) | `PortalFeedbackProvider` |
| [`src/app/admin/(portal)/requests/print/print-controls.tsx`](<../src/app/admin/(portal)/requests/print/print-controls.tsx>) | `PortalFeedbackMessage`, `usePortalFeedback` |
| [`src/app/admin/(portal)/requests/requests-output-actions.tsx`](<../src/app/admin/(portal)/requests/requests-output-actions.tsx>) | `PortalFeedbackMessage`, `usePortalFeedback` |
| [`src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx`](<../src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx>) | `PortalFeedbackMessage`, `PortalFeedbackProvider`, `usePortalFeedback` |
| [`src/app/admin/(portal)/sheet-line.tsx`](<../src/app/admin/(portal)/sheet-line.tsx>) | `usePortalFeedback` |

### [`src/app/admin/(portal)/portal-page-header.tsx`](<../src/app/admin/(portal)/portal-page-header.tsx>)

Exports: `PortalPageHeader`.

Used in 9 files:

- [`src/app/admin/(portal)/audit/page.tsx`](<../src/app/admin/(portal)/audit/page.tsx>)
- [`src/app/admin/(portal)/error.tsx`](<../src/app/admin/(portal)/error.tsx>)
- [`src/app/admin/(portal)/help/page.tsx`](<../src/app/admin/(portal)/help/page.tsx>)
- [`src/app/admin/(portal)/not-found.tsx`](<../src/app/admin/(portal)/not-found.tsx>)
- [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>)
- [`src/app/admin/(portal)/requests/new/page.tsx`](<../src/app/admin/(portal)/requests/new/page.tsx>)
- [`src/app/admin/(portal)/requests/print/page.tsx`](<../src/app/admin/(portal)/requests/print/page.tsx>)
- [`src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx`](<../src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx>)
- [`src/app/admin/(portal)/settings/layout.tsx`](<../src/app/admin/(portal)/settings/layout.tsx>)

### [`src/app/admin/auth-card.tsx`](<../src/app/admin/auth-card.tsx>)

Exports: `AuthCard`.

Used in 4 files:

- [`src/app/admin/auth/confirm/page.tsx`](<../src/app/admin/auth/confirm/page.tsx>)
- [`src/app/admin/forgot-password/page.tsx`](<../src/app/admin/forgot-password/page.tsx>)
- [`src/app/admin/login/page.tsx`](<../src/app/admin/login/page.tsx>)
- [`src/app/admin/set-password/page.tsx`](<../src/app/admin/set-password/page.tsx>)

### [`src/app/admin/(portal)/portal-release-briefing.tsx`](<../src/app/admin/(portal)/portal-release-briefing.tsx>)

Exports: `PortalReleaseProvider`, `PortalReleaseHomeAnnouncement`, `PortalReleaseUtility`.

Used in 2 files:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/layout.tsx`](<../src/app/admin/(portal)/layout.tsx>) | `PortalReleaseProvider`, `PortalReleaseUtility` |
| [`src/app/admin/(portal)/page.tsx`](<../src/app/admin/(portal)/page.tsx>) | `PortalReleaseHomeAnnouncement` |

### [`src/app/admin/(portal)/requests/new/staff-request-form.tsx`](<../src/app/admin/(portal)/requests/new/staff-request-form.tsx>)

Exports: `StaffRequestFormHandle`, `StaffRequestForm`.

Used in 2 files:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/add-appointment-dialog.tsx`](<../src/app/admin/(portal)/add-appointment-dialog.tsx>) | `StaffRequestForm`, `StaffRequestFormHandle` |
| [`src/app/admin/(portal)/requests/new/page.tsx`](<../src/app/admin/(portal)/requests/new/page.tsx>) | `StaffRequestForm` |

### [`src/app/admin/(portal)/requests/print-chooser.tsx`](<../src/app/admin/(portal)/requests/print-chooser.tsx>)

Exports: `PrintChooser`.

Used in 2 files:

- [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>)
- [`src/app/admin/(portal)/requests/requests-output-actions.tsx`](<../src/app/admin/(portal)/requests/requests-output-actions.tsx>)

### [`src/app/admin/(portal)/requests/status-badge.tsx`](<../src/app/admin/(portal)/requests/status-badge.tsx>)

Exports: `StatusBadge`.

Used in 2 files:

- [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>)
- [`src/app/admin/(portal)/requests/page.tsx`](<../src/app/admin/(portal)/requests/page.tsx>)

### [`src/app/admin/(portal)/audit/recent-work-pagination.tsx`](<../src/app/admin/(portal)/audit/recent-work-pagination.tsx>)

Exports: `RecentWorkPagination`.

Used in 2 files:

- [`src/app/admin/(portal)/audit/page.tsx`](<../src/app/admin/(portal)/audit/page.tsx>)
- [`src/app/admin/(portal)/audit/recent-work.tsx`](<../src/app/admin/(portal)/audit/recent-work.tsx>)

### [`src/app/admin/(portal)/audit/recent-work-focus-target.tsx`](<../src/app/admin/(portal)/audit/recent-work-focus-target.tsx>)

Exports: `RecentWorkFocusTarget`.

Used in 2 files:

- [`src/app/admin/(portal)/audit/page.tsx`](<../src/app/admin/(portal)/audit/page.tsx>)
- [`src/app/admin/(portal)/audit/recent-work.tsx`](<../src/app/admin/(portal)/audit/recent-work.tsx>)

### [`src/app/admin/forgot-password/reset-request-form.tsx`](<../src/app/admin/forgot-password/reset-request-form.tsx>)

Exports: `ResetRequestForm`.

Used in 2 files:

- [`src/app/admin/forgot-password/page.tsx`](<../src/app/admin/forgot-password/page.tsx>)
- [`src/app/admin/login/login-form.tsx`](<../src/app/admin/login/login-form.tsx>)

### [`src/app/admin/set-password/password-form.tsx`](<../src/app/admin/set-password/password-form.tsx>)

Exports: `PasswordForm`.

Used in 2 files:

- [`src/app/admin/auth/confirm/confirm-form.tsx`](<../src/app/admin/auth/confirm/confirm-form.tsx>)
- [`src/app/admin/set-password/page.tsx`](<../src/app/admin/set-password/page.tsx>)

### Request workflow

### [`src/app/admin/(portal)/requests/[id]/workflow-panel.tsx`](<../src/app/admin/(portal)/requests/[id]/workflow-panel.tsx>)

Exports: `WorkflowPanel`.

Used in 1 file:

- [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>)

### [`src/app/admin/(portal)/requests/[id]/request-notes.tsx`](<../src/app/admin/(portal)/requests/[id]/request-notes.tsx>)

Exports: `RequestNoteView`, `RequestNotes`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>) | `RequestNoteView`, `RequestNotes` |

### [`src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx`](<../src/app/admin/(portal)/requests/[id]/request-current-feedback.tsx>)

Exports: `StaffRequestCreatedAcknowledgement`, `RequestPrintButton`, `RequestPrintFeedback`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/requests/[id]/page.tsx`](<../src/app/admin/(portal)/requests/[id]/page.tsx>) | `RequestPrintButton`, `RequestPrintFeedback`, `StaffRequestCreatedAcknowledgement` |

### [`src/app/admin/(portal)/requests/request-search-form.tsx`](<../src/app/admin/(portal)/requests/request-search-form.tsx>)

Exports: `RequestSearchForm`.

Used in 1 file:

- [`src/app/admin/(portal)/requests/page.tsx`](<../src/app/admin/(portal)/requests/page.tsx>)

### [`src/app/admin/(portal)/requests/requests-output-actions.tsx`](<../src/app/admin/(portal)/requests/requests-output-actions.tsx>)

Exports: `REQUESTS_OUTPUT_UTILITY_CLASS`, `RequestsOutputActions`, `RequestsOutputFeedback`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/requests/page.tsx`](<../src/app/admin/(portal)/requests/page.tsx>) | `RequestsOutputActions`, `RequestsOutputFeedback` |

### [`src/app/admin/(portal)/requests/print/print-controls.tsx`](<../src/app/admin/(portal)/requests/print/print-controls.tsx>)

Exports: `PrintPacketControls`.

Used in 1 file:

- [`src/app/admin/(portal)/requests/print/page.tsx`](<../src/app/admin/(portal)/requests/print/page.tsx>)

### Settings

### [`src/app/admin/(portal)/settings/recipients-manager.tsx`](<../src/app/admin/(portal)/settings/recipients-manager.tsx>)

Exports: `RecipientRow`, `RecipientsManager`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/settings/page.tsx`](<../src/app/admin/(portal)/settings/page.tsx>) | `RecipientRow`, `RecipientsManager` |

### [`src/app/admin/(portal)/settings/staff-manager.tsx`](<../src/app/admin/(portal)/settings/staff-manager.tsx>)

Exports: `StaffRow`, `StaffManager`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/settings/page.tsx`](<../src/app/admin/(portal)/settings/page.tsx>) | `StaffManager`, `StaffRow` |

### [`src/app/admin/(portal)/settings/software/maintainer-access.tsx`](<../src/app/admin/(portal)/settings/software/maintainer-access.tsx>)

Exports: `Maintainer`, `PendingInvitation`, `MaintainerManagementState`, `MaintainerAccessModel`, `MaintainerActionResult`, `MaintainerActions`, `MaintainerAccess`.

Used in 2 files:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/settings/software/page.tsx`](<../src/app/admin/(portal)/settings/software/page.tsx>) | `MaintainerAccess` |
| [`src/lib/portal/maintainers.ts`](<../src/lib/portal/maintainers.ts>) | `MaintainerAccessModel` |

### [`src/app/admin/(portal)/settings/settings-tabs.tsx`](<../src/app/admin/(portal)/settings/settings-tabs.tsx>)

Exports: `SettingsTabs`.

Used in 1 file:

- [`src/app/admin/(portal)/settings/layout.tsx`](<../src/app/admin/(portal)/settings/layout.tsx>)

### Portal shell and home

### [`src/app/admin/(portal)/sheet-line.tsx`](<../src/app/admin/(portal)/sheet-line.tsx>)

Exports: `SheetLine`, `SheetLineRow`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>) | `SheetLine`, `SheetLineRow` |

### [`src/app/admin/(portal)/portal-calendar.tsx`](<../src/app/admin/(portal)/portal-calendar.tsx>)

Exports: `PortalCalendar`.

Used in 1 file:

- [`src/app/admin/(portal)/sheet-line.tsx`](<../src/app/admin/(portal)/sheet-line.tsx>)

### [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>)

Exports: `SheetLine`, `SheetGroup`, `SheetTailItem`, `HomeWorkbench`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/page.tsx`](<../src/app/admin/(portal)/page.tsx>) | `HomeWorkbench`, `SheetGroup`, `SheetLine`, `SheetTailItem` |

### [`src/app/admin/(portal)/portal-tour.tsx`](<../src/app/admin/(portal)/portal-tour.tsx>)

Exports: `PortalTour`.

Used in 1 file:

- [`src/app/admin/(portal)/page.tsx`](<../src/app/admin/(portal)/page.tsx>)

### [`src/app/admin/(portal)/add-appointment-dialog.tsx`](<../src/app/admin/(portal)/add-appointment-dialog.tsx>)

Exports: `AddAppointmentDialog`.

Used in 1 file:

- [`src/app/admin/(portal)/home-workbench.tsx`](<../src/app/admin/(portal)/home-workbench.tsx>)

### [`src/app/admin/(portal)/portal-modal.tsx`](<../src/app/admin/(portal)/portal-modal.tsx>)

Exports: `PortalModal`.

Used in 1 file:

- [`src/app/admin/(portal)/sheet-line.tsx`](<../src/app/admin/(portal)/sheet-line.tsx>)

### [`src/app/admin/(portal)/portal-nav.tsx`](<../src/app/admin/(portal)/portal-nav.tsx>)

Exports: `PortalNav`.

Used in 1 file:

- [`src/app/admin/(portal)/layout.tsx`](<../src/app/admin/(portal)/layout.tsx>)

### [`src/app/admin/(portal)/portal-tour-return-focus.tsx`](<../src/app/admin/(portal)/portal-tour-return-focus.tsx>)

Exports: `PortalTourReturnState`, `PortalTourReturnFocus`.

Used in 1 file:

| File | Imports |
|---|---|
| [`src/app/admin/(portal)/page.tsx`](<../src/app/admin/(portal)/page.tsx>) | `PortalTourReturnFocus`, `PortalTourReturnState` |

### Audit

### [`src/app/admin/(portal)/audit/release-engagement.tsx`](<../src/app/admin/(portal)/audit/release-engagement.tsx>)

Exports: `ReleaseEngagementSection`.

Used in 1 file:

- [`src/app/admin/(portal)/audit/page.tsx`](<../src/app/admin/(portal)/audit/page.tsx>)

### [`src/app/admin/(portal)/audit/recent-work.tsx`](<../src/app/admin/(portal)/audit/recent-work.tsx>)

Exports: `RecentWorkSection`.

Used in 1 file:

- [`src/app/admin/(portal)/audit/page.tsx`](<../src/app/admin/(portal)/audit/page.tsx>)

### [`src/app/admin/(portal)/audit/recent-work-controls.tsx`](<../src/app/admin/(portal)/audit/recent-work-controls.tsx>)

Exports: `RecentWorkControls`.

Used in 1 file:

- [`src/app/admin/(portal)/audit/recent-work.tsx`](<../src/app/admin/(portal)/audit/recent-work.tsx>)

### [`src/app/admin/(portal)/audit/recent-work-focus-link.tsx`](<../src/app/admin/(portal)/audit/recent-work-focus-link.tsx>)

Exports: `RecentWorkFocusLink`.

Used in 1 file:

- [`src/app/admin/(portal)/audit/recent-work.tsx`](<../src/app/admin/(portal)/audit/recent-work.tsx>)

### Auth and printing

### [`src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx`](<../src/app/admin/(portal)/review-flyers/review-flyer-printer.tsx>)

Exports: `ReviewFlyerPrinter`.

Used in 1 file:

- [`src/app/admin/(portal)/review-flyers/page.tsx`](<../src/app/admin/(portal)/review-flyers/page.tsx>)

### [`src/app/admin/login/login-form.tsx`](<../src/app/admin/login/login-form.tsx>)

Exports: `LoginForm`.

Used in 1 file:

- [`src/app/admin/login/page.tsx`](<../src/app/admin/login/page.tsx>)

### [`src/app/admin/auth/confirm/confirm-form.tsx`](<../src/app/admin/auth/confirm/confirm-form.tsx>)

Exports: `ConfirmAuthForm`.

Used in 1 file:

- [`src/app/admin/auth/confirm/page.tsx`](<../src/app/admin/auth/confirm/page.tsx>)

## Regenerating this reference

From the repository root. Same importer query as the inventory:

```bash
rg -l "/NAME[\"']|\./NAME[\"']" src --glob '*.tsx' --glob '*.ts'
```

For a single module, where `NAME` is the file's basename without the extension:

```bash
rg -l 'components/ui/NAME"' src
rg -l 'primitives/NAME"' src
```

Refresh this file when a component is added, removed, or gains or loses an
importer. Do not edit the path lists by hand if you can rerun the query. Counts
in the inventory stay snapshot numbers; this file should stay current with the
checkout.
