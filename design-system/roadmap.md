# Roadmap — the extraction queue

Each item is recorded drift or a gap and the change that resolves it; its number is a name that
lives until the change lands. Counts are from commit e7734a4, rechecked with 174f10e merged. Each
item opens with a status: **Ready**, land it through the [adoption workflow](adoption.md#workflow)
and the standing gates; **Measure first**, measure the running product before deciding; **Jason
decides**, a brand call, so bring evidence, not a change.

## 1. Card surfaces

**Ready.** `.card` and `.card-lined` in `globals.css` are a recipe written as classes at 14 call
sites in 13 patient-site and review-hub files. They become `variant` values on `ui/card.tsx`, as do
`AuthCard`'s `className` restyle and the box `.portal-panel`, `.portal-help` and
`.portal-flyer-list` share, each looking as it does today; call sites keep only their layout.

## 2. Workbench tokenization

**Ready, one surface at a time.** In `portal-workbench.css`, 233 of 273 spacing declarations are
literal rem, 96 of 105 font sizes skip `--pt-*`, 43 colors are literal and 21 mixes, as are seven
radii and four shadows. Each moves onto a token once its surface is checked; a value no token
matches is never rounded but goes to item 10 (colors, shadows), item 8 (radii) or Jason. The 161
literal `text-[…rem]` sizes in `src/app/admin` route files
([typography.md](typography.md#recorded-drift)) move onto the `--pt-*` steps the same way.

## 3. Choice lists

**Ready.** `outcome-choice-list.tsx` and `workflow-panel.tsx` hand-roll radio rows in 30
`.portal-choice-*` rules with a 180ms reveal. Adopt `RadioGroup` and `ToggleGroup`, which the record
card [imports from `stock/`](components.md#recorded-stock-imports), into `ui/` with one variant per
paint; unifying the three looks is Jason's. Their date inputs (`outcome-choice-list.tsx#L84`,
`call-again-fieldset.tsx#L114`) hand-write the `Input` geometry and join as they look, their invalid
red moving onto `--destructive` ([color.md](color.md#recorded-drift)).

## 4. The task index

**Ready.** The portal's task index is 34 hand-written rules (24 `.portal-sidebar-*`, 10
`.portal-nav-*`) with literal radii, shadows, alphas. `Sidebar` (`stock/sidebar.tsx`) does the job,
and the bridge maps its `--sidebar-*` tokens onto navy. Adopt it into `ui/` unchanged; navigation
stays `nav` with `aria-current` ([standing finding](adoption.md#standing-findings)).

## 5. Empty states, callouts and pagers

**Ready.** Three hand-built families have registry components. `Empty` (`stock/empty.tsx`) takes
`.portal-empty-state`, `.portal-empty`, `.portal-queue-empty` and the request history and notes
empties; `Alert` (`stock/alert.tsx`) takes `.portal-sheet-notice`, `.portal-sheet-alert` and
`.portal-request-form-alert`; `Pagination` (`stock/pagination.tsx`) takes
`.portal-queue-pagination`. Adopt each into `ui/` with its current paint and every `role="alert"`.

## 6. The calendar

**Ready.** `(home)/parts/calendar.tsx` wraps `stock/calendar.tsx` twice, an approved exception:
`HomeRangeCalendar` for the Received editor's range and `HomeDayCalendar` for the record card's
callback or appointment day. Adopt `Calendar` into `ui/`, keeping both uses' behavior and paint.

## 7. The legacy feature blocks

**Ready.** The [legacy feature blocks](styling.md#global-css) in `globals.css` write literal colors,
shadows, offsets and motion. Each becomes recipes, utilities or scoped CSS per
[styling.md](styling.md#styling-model), keeping its look; a value nothing names waits on item 8, 10
or 16. Moving the first-login tour (`PortalTour`) onto `.portal-confirm-dialog` is Jason's call.

## 8. The radius ramp

**Jason decides.** The steps are `--radius-sm` 0.375rem, `--radius` 0.625rem, `--radius-lg`
0.875rem. [Off them](layout.md#shape-and-elevation): `Card`'s 0.75rem `rounded-xl`; `Checkbox`'s
`rounded-[4px]`; the portal's 0.5rem `--btn-radius`; seven workbench literals; the 0.75rem portal
box; `Header`'s and `NoticeBanner`'s `rounded-md`; `ProfileCardViewer`'s 5px; and the 3px focus
outline. Bring them as rendered, not a new ramp; the brand `@theme` is hands-off.

## 9. A native dialog component

**Ready.** The [four portal dialogs](overlays.md#modal-dialogs) wire `<dialog>` by hand and drifted:
two set `data-instant`, one lets Tab escape, first focus is `autoFocus`, a ref or both, one has no
`onCancel`. A component built from `PrintChooser` owns open, close, `data-instant`, Tab, first
focus, Escape and focus return; consumers keep their body, actions and close path. Until then, copy
`PrintChooser`. Whether it serves the patient site's `LanguageChooser` and `ProfileCardViewer`,
which let Tab escape too ([accessibility.md](accessibility.md#focus)), is Jason's.

## 10. Portal surface tints

**Jason decides.** `--portal-canvas`, `--portal-surface`, `--portal-surface-muted` and
`--portal-attention-ink` are OKLCH literals, and the workbench writes an off-palette nav green, a
second alert red, six mint washes and literal shadows ([color.md](color.md#recorded-drift)). Each
moves onto a brand token Jason names. The shadow tokens' claim that a shadow never pairs with a
border, broken by six floating layers, is Jason's ([layout.md](layout.md#shape-and-elevation)).

## 11. Button sm targets

**Measure first.** `Button`'s `sm` is `min-h-9`, 36px: above WCAG 2.2's 24px minimum, below the
[44px target floor](accessibility.md#targets). Of its [six consumers](buttons.md#sizes), the patient
site's `Footer` and `LocationMaps` links render 36px at 1440 and `Header`'s 42px; the portal's two
are unmeasured. Bring all six to Jason: raising `sm` changes approved Home styling, keeping it needs
a recorded exception. Its icons are part of it: the recipe asks 14px but they render 16px
([buttons.md](buttons.md#icons)), so a repair shrinks the `Footer`'s review-link icons.

## 12. Portal type weights and heading family

**Jason decides.** The portal loads Lato 400 to 700 and Trocchi 400 (`src/lib/portal-fonts.ts`) with
synthesis off, so 92 weight requests outside 400–700 in 13 files render at the nearest loaded
weight, mostly 700: `.portal-page-title` and `.portal-auth-title` ask for 900, the Requests title
for the serif at 880, which renders Trocchi 400 ([typography.md](typography.md#recorded-drift)).
Thirteen older rules also track -0.005em to -0.025em, eleven of them among those weights, where the
Home frame tightens only its date, card name and empty heading
([typography.md](typography.md#numerals-and-tracking)). The approved Lato weights stay; bring
rendered comparisons.

## 13. The portal focus color

**Jason decides.** Focus is teal ([color.md](color.md#focus)), and the staff home draws a teal ring,
but the rest of the portal draws an `amber-deep` outline from `.portal-scope` and three workbench
rules, and `call-again-fieldset.tsx` draws `amber`, beside teal recipe rings. Contrast cannot
decide: against 3:1, `amber-deep` measures 3.3–3.7, `teal` 3.4–3.9 and `amber` 1.8–2.0. Bring
screens of both.

## 15. The patient-site shared layer

**Ready.** `src/components/*.tsx` is the flat layer from before the tiers: 16 files. Sort each by
[the tier rules](components.md#component-tiers) into `ui/`, `patterns/` or beside its route. A move
changes imports only; markup, paint and behavior stay.

## 16. Motion literals

**Jason decides.** [motion.md](motion.md#recorded-motion-literals) lists the literals; each moves
onto an existing temperament (`Item`'s hover, the workbench hover tints), takes a name the registry
lacks (the scrim's fade, the written-out cross-fade, `commit`'s beats, the `wgi` fallbacks, the
patient site's durations), or drops its conflict with an instant focus ring (the fields' `ease`,
`commit`'s `box-shadow`). Bare `transition-*` utilities run Tailwind's default curve until the brand
`@theme` maps it. Each approved mapping moves its surfaces in one reviewed change.

## 17. Call-site restyles

**Jason decides.** Beyond `AuthCard`, [38 call sites](styling.md#recorded-call-site-restyles) set a
`ui/` component's look: 24 disabled-button opacities, three white review-hub buttons, and 11
audit-table and field inks and sizes. Of 31 button icons, 27 carry an inert `h-*` or `w-*` instead
of [`data-icon`](buttons.md#icons). Outside the census, 24 native `<button>` elements draw their own
border or radius ([recorded](styling.md#recorded-call-site-restyles)) and each becomes a `Button` or
a `buttonVariants()` link. Bring each as rendered: an option, a knob, or gone.

## 18. Time picker name

**Measure first.** Inside the staff home's trigger-anchored start-time panel, `TimePicker`'s root is
a role-less `div` named with `aria-label`, which ARIA prohibits on the `generic` role. Headless
Chromium's Playwright snapshot drops the name and the CDP tree keeps it, so run VoiceOver on the
staff home's time field before choosing a fix, likely `role="group"`. The request detail's
`type="time"` input (`outcome-choice-list.tsx#L125`) stays until this lands, and a second consumer
moves the picker's model into `src/lib/portal/`.
