# 005 — Confirm the day commit on the trigger

- **Status**: DONE
- **Commit**: 08bd929
- **Severity**: LOW (polish / additive)
- **Category**: Missed opportunity — handoff
- **Estimated scope**: 2 files, ~25 lines

## Problem

When staff press "Use this day" in the appointment-day dialog
(`src/app/admin/(portal)/sheet-line.tsx:461-465`), the dialog shrinks back into
the trigger on the registry exit — good — and then the trigger silently flips
from hairline to navy (`data-chosen`, `portal-workbench.css:2783-2788`) via its
ordinary 150ms color transition. The handoff reads as two unrelated events: a
dialog closed, and separately, some text changed. Nothing says *the choice
landed*.

The booked band is already inside a `.portal-line-reveal` fold
(`sheet-line.tsx:385-411`), so no new reveal is needed — the missing piece is a
brief, restrained "settled" emphasis on the trigger itself.

The design system reserves mint for "a settled or cleared state"
(DESIGN.md, color section) — exactly this moment.

Current trigger CSS:

```css
/* src/app/admin/portal-workbench.css:2762-2788 — current (relevant parts) */
.portal-day-trigger {
  /* ... */
  background: white;
  /* ... */
  transition:
    border-color 150ms cubic-bezier(0.23, 1, 0.32, 1),
    color 150ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.portal-day-trigger[data-chosen] {
  border-color: var(--color-navy);
  color: var(--color-ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

Current commit handler:

```tsx
/* src/app/admin/(portal)/sheet-line.tsx:461-465 — current */
onCommit={(day, time) => {
  setAppointmentDay(day);
  setAppointmentTime(time);
  setDayOpen(false);
}}
```

## Target

When a commit lands, the trigger plays one mint wash that fades back to white —
mint meaning *settled*, per the color register — while its border turns navy on
the existing transition:

```css
/* src/app/admin/portal-workbench.css — add after .portal-day-trigger[data-chosen]
   (~line 2788) — target */
/* The commit landing: one mint wash — mint means settled — that fades back
   to white while the border settles navy. Fired by data-just-chosen, set for
   the length of the animation and then removed, so it never replays on
   re-render. */
.portal-day-trigger[data-just-chosen] {
  animation: portal-day-chosen 480ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes portal-day-chosen {
  from {
    background-color: var(--color-mint);
  }
}
```

Reduced motion needs nothing extra: the blanket reset
(`src/app/globals.css:176-182`) collapses the animation to a single frame; the
trigger's background is mid-fade white-to-mint at worst for 0.001ms — verify in
the feel check that no flash remains. If a flash is visible, add
`animation: none;` for `.portal-day-trigger[data-just-chosen]` to the existing
workbench reduced-motion block (~line 3560).

## Repo conventions to follow

- Exemplar for a timed one-shot emphasis attribute: the telemetry/tone pattern
  in `portal-feedback` and the `data-turn` keyframe in
  `portal-workbench.css:1336-1357` (attribute + `from`-only keyframe + exit
  curve).
- Curve `cubic-bezier(0.23, 1, 0.32, 1)` is the registry's `--pm-exit`; use the
  literal because this rule sits among siblings that also use the literal
  (`portal-workbench.css:2778-2780`).

## Steps

1. In `src/app/admin/(portal)/sheet-line.tsx`, add state next to `dayOpen`
   (~line 202):

   ```tsx
   const [justChosen, setJustChosen] = useState(false);
   ```

2. Add a ref for the timeout next to `keyRef` (~line 204):

   ```tsx
   const chosenTimerRef = useRef<number | null>(null);
   ```

3. In the `AppointmentDayDialog`'s `onCommit` (~line 461-465), fire the
   emphasis:

   ```tsx
   onCommit={(day, time) => {
     setAppointmentDay(day);
     setAppointmentTime(time);
     setDayOpen(false);
     setJustChosen(true);
     if (chosenTimerRef.current !== null) window.clearTimeout(chosenTimerRef.current);
     chosenTimerRef.current = window.setTimeout(() => {
       setJustChosen(false);
       chosenTimerRef.current = null;
     }, 480);
   }}
   ```

4. Clear the timer in `reset()` (~line 229-237) so closing the modal never
   leaves a stray timer:

   ```tsx
   if (chosenTimerRef.current !== null) {
     window.clearTimeout(chosenTimerRef.current);
     chosenTimerRef.current = null;
   }
   setJustChosen(false);
   ```

5. On the trigger button (~line 394-407), add the attribute:

   ```tsx
   data-just-chosen={justChosen || undefined}
   ```

6. Add the target CSS after `.portal-day-trigger[data-chosen]`.

## Boundaries

- Do NOT change the dialog's exit motion, the `[data-chosen]` styles, or the
  trigger's existing transitions.
- Do NOT use amber — amber means attention; this moment is settled, so it is
  mint or nothing.
- Do NOT animate `box-shadow` or `transform` on the trigger.
- If `sheet-line.tsx` does not match the excerpts, STOP and report.

## Verification

- **Mechanical**: `npx oxlint`, `npx oxfmt --check`, `npx react-doctor@latest --verbose`
  (score 100), `npm run build` all clean.
- **Feel check**: open a line modal, select "Booked", open the day dialog,
  choose a day, press "Use this day":
  - The dialog shrinks into the trigger; as it lands, the trigger washes mint
    and fades to white over ~480ms while its border settles navy.
  - Commit a second time: the wash replays.
  - Cancel the dialog instead: no wash.
  - Save and close the line modal immediately after committing: no stray
    animation when the line re-renders, and no console timer warnings.
  - Emulate `prefers-reduced-motion: reduce`: no flash — the border and text
    still settle navy on their 150ms transition.
- **Done when**: closing the picker and confirming the choice read as one
  continuous event, in mint, with no replay and no stray timers.
