# Roadmap — the extraction queue

Each item is recorded drift or a gap, and the change that resolves it. Numbers are names, not a
ranking: guides and comments link to them, so a number lives until its change lands. Counts are from
commit e7734a4. Every item opens with one status: **Ready**, land it through the
[adoption workflow](adoption.md#workflow) and the standing gates; **Measure first**, measure the
running product before deciding; **Jason decides**, a brand call, so bring the evidence the item
names, not a change; **In progress**, Jason's current work, not to be started separately.

## 1. Card surfaces

**Ready.** `.card` and `.card-lined` in `globals.css` are a recipe written as classes (white on
`--radius-lg`, with `--shadow-card` or a `line` border) at 14 call sites in 13 patient-site and
review-hub files. They become `variant` values on `ui/card.tsx`, as do `AuthCard`'s `className`
restyle and the box `.portal-panel`, `.portal-help` and `.portal-flyer-list` share, each looking as
it does today; call sites keep only their layout.

## 2. Workbench tokenization

**Ready, one surface at a time.** In `portal-workbench.css`, 233 of 273 spacing declarations are
literal rem and 16 read `--ps-*`; 96 of 105 font sizes skip `--pt-*`; 43 colors are literal and 21
are mixes; seven radii and four shadows are literal. A declaration moves onto a token once its
surface is checked in the product. A value no token matches is never rounded to a step: colors and
shadows go to item 10, radii to item 8, other sizes to Jason.

## 3. Choice lists

**Ready.** `outcome-choice-list.tsx` and `workflow-panel.tsx` hand-roll radio rows in 30
`.portal-choice-*` rules with a 180ms reveal. Adopt `RadioGroup` and `ToggleGroup`, which the record
card imports from `stock/` ([an approved exception](components.md#component-tiers)), into `ui/` with
a variant per paint and move all three onto them. Unifying looks or reveals is Jason's.

## 4. The task index

**Ready.** The portal's task index is 34 hand-written rules, 24 `.portal-sidebar-*` and 10
`.portal-nav-*`, with literal radii, shadows and text alphas. The registry's `Sidebar`
(`stock/sidebar.tsx`) does that job, and the bridge already maps its `--sidebar-*` tokens onto navy.
Adopt it into `ui/` looking and behaving as it does now; navigation stays `nav` with `aria-current`
([a standing finding](adoption.md#standing-findings)).

## 5. Empty states, callouts and pagers

**Ready.** Three hand-built families have registry components. `Empty` (`stock/empty.tsx`) takes
`.portal-empty-state`, `.portal-empty`, `.portal-queue-empty` and the request history and notes
empties; `Alert` (`stock/alert.tsx`) takes `.portal-sheet-notice`, `.portal-sheet-alert` and
`.portal-request-form-alert`; `Pagination` (`stock/pagination.tsx`) takes
`.portal-queue-pagination`. Adopt each into `ui/` with its current paint and every `role="alert"`.

## 6. The calendar

**Ready.** `(home)/parts/calendar.tsx` wraps `stock/calendar.tsx` twice, an approved exception:
`HomeRangeCalendar` for the Received editor's range and `HomeDayCalendar` for the record card's
return day. Adopt `Calendar` into `ui/`, keeping both uses' behavior and paint.

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

**Ready.** Four portal dialogs wire `<dialog>` by hand: `AddAppointmentDialog`, `PrintChooser`,
`RemoveRecipientDialog` and the request form's discard confirmation. They drifted: two set
`data-instant`, all but `AddAppointmentDialog` contain Tab, first focus comes from `autoFocus`, a
ref or both, and the discard confirmation has no `onCancel`. One component built from `PrintChooser`
([overlays.md](overlays.md#modal-dialogs)) owns opening, closing, `data-instant`, Tab, first focus,
Escape through the consumer's close path and focus return; consumers keep their body, actions and
refusals. Until it lands, copy `PrintChooser`.

## 10. Portal surface tints

**Jason decides.** `--portal-canvas`, `--portal-surface`, `--portal-surface-muted` and
`--portal-attention-ink` are OKLCH literals on `.portal-scope` and `.portal-workspace`.
`portal-workbench.css` writes an off-palette nav green, a second alert red, mint washes at six
strengths where Home uses `mint` and `mint-2`, and literal shadows on the sidebar, account menu and
commit shelf ([color.md](color.md#recorded-drift)). Each moves onto a brand token, existing or new;
names and values are Jason's, since the brand `@theme` is hands-off — as is the shadow tokens' claim
that a shadow never pairs with a border, which six portal floating layers contradict.

## 11. Button sm targets

**Measure first.** `Button`'s `sm` is `min-h-9`, 36px: above WCAG 2.2's 24px minimum, below the
[44px target floor](accessibility.md#targets), and "still a comfortable target" in its recipe
comment. Of its [six consumers](buttons.md#sizes), measured on the running patient site, the
`Footer` and `LocationMaps` links render 36px and `Header`'s 42px at 1440 (hidden at 390), against
44px for `default` and 52px for `lg`; the two portal consumers need a signed-in session. Bring all
six to Jason: raising `sm` changes approved Home styling; keeping it needs a recorded exception.

## 12. Portal type weights and heading family

**Jason decides.** The portal loads Lato 400, 500, 600, 700 and Trocchi 400
(`src/lib/portal-fonts.ts`) with synthesis off, so 93 weight requests outside 400–700 across 13
files render at the nearest loaded weight, mostly 700. `.portal-page-title` and `.portal-auth-title`
ask for 900 and get 700; the Requests title asks for the serif at 880 and gets Trocchi 400
([typography.md](typography.md#recorded-drift)). The approved Lato weights stay; family and weights
are brand decisions, so bring rendered comparisons, not a change.

## 13. The portal focus color

**Jason decides.** Focus is teal ([color.md](color.md#focus)), but the portal draws a 3px
`amber-deep` outline from `.portal-scope`, three more workbench rules and four Home controls, and
`call-again-fieldset.tsx` draws `amber`. Recipes inside keep teal rings, so one screen shows both.
Contrast does not decide it: `amber-deep` measures 3.3 to 3.7 and `teal` 3.4 to 3.9, both above 3:1,
while `amber` fails at 1.8 to 2.0. Bring screens that show both colors.

## 14. The staff home temperament and companion surfaces

**In progress** (Jason's full-record-sheet work). It proposes a staff home curve, cubic-bezier(0.32,
0.72, 0, 1), on beats of 140, 240 and 420ms with fast, base and sheet presets, and a record card
that detaches into a companion of the full-record sheet, anchored to its row, its footer toggling
the sheet. No committed stylesheet or preset declares them. Until they land, Home runs on arriving,
leaving and tinting, with its own 120ms popover close, 240ms row-wash exhale and presses
([motion.md](motion.md#recorded-motion-literals)).

## 15. The patient-site shared layer

**Ready.** `src/components/*.tsx` is the flat layer from before the tiers: 16 files. Sort each by
[the tier rules](components.md#component-tiers) into `ui/`, `patterns/` or beside its route. A move
changes imports only; markup, paint and behavior stay.

## 16. Motion literals

**Jason decides.** [motion.md](motion.md#recorded-motion-literals) lists the literals; each needs
one of three decisions. Onto an existing temperament: `Item`'s 100ms hover and the workbench hover
tints, onto tinting. A name the registry lacks: the modal scrim's 220ms fade, the 120ms cross-fade
CSS writes out instead of naming `crossfade`, `commit`'s 90, 110 and 140ms, the `wgi` fallback's
200ms, and the patient site's five reveal and hover durations. A conflict with an instant focus
ring: the fields' 200ms `ease` on `border-color` and `box-shadow`, and `commit`'s `box-shadow`. Bare
`transition-*` utilities run Tailwind's default 150ms curve until the brand `@theme` maps it onto
the registry. Each approved mapping moves its surfaces in one reviewed change.

## 17. Call-site restyles

**Jason decides.** Beyond `AuthCard`, [38 call sites](styling.md#recorded-call-site-restyles) set a
`ui/` component's look: 24 disabled-button opacities, three white review-hub buttons, and 11
audit-table and field inks and sizes. Quieter: of 31 icons inside a button or `buttonVariants` link,
27 size themselves with `h-*`/`w-*` rather than [`data-icon`](buttons.md#icons), in five sizes from
14 to 20px, all inert — the recipe's `[&_svg:not([class*='size-'])]` rule outranks them, so an icon
written 18px renders 16px. Bring each as rendered: it becomes a recipe option, a knob, or goes.
