# 013 — Stop animating the skip link

- **Status**: DONE
- **Commit**: a303135
- **Severity**: MEDIUM
- **Category**: Purpose & frequency (keyboard actions never animate)
- **Estimated scope**: 1 file (`src/app/globals.css`), ~5 lines

## Problem

The skip link is reachable only by keyboard (`:focus-visible`) and is the
first Tab stop on every marketing page — a keyboard-initiated action, which
never animates. Today it travels 200% of its own height over 300ms before
the user can read where focus landed:

```css
/* src/app/globals.css:453-468 — current */
  .skip-link {
    position: fixed;
    top: 0.75rem;
    inset-inline-start: 0.75rem;
    z-index: 100;
    background: var(--color-navy);
    color: var(--color-on-dark);
    font-weight: 700;
    padding: 0.7rem 1.1rem;
    border-radius: var(--radius-sm);
    transform: translateY(-200%);
    transition: transform 0.3s var(--ease-out-quart);
  }
  .skip-link:focus-visible {
    transform: translateY(0);
  }
```

The repo already reached the right answer once and stopped there — the
portal kills the animation for its own pages:

```css
/* src/app/globals.css:1223-1225 — current */
  .portal-scope .skip-link {
    transition: none;
  }
```

The patient site never inherited the decision.

## Target

No transition on the skip link anywhere; it appears and disappears
instantly, exactly like the portal's version does today. The portal
override becomes redundant and leaves.

```css
/* target — src/app/globals.css:453-468, transition line removed, with a
   one-line comment recording the decision */
  .skip-link {
    position: fixed;
    top: 0.75rem;
    inset-inline-start: 0.75rem;
    z-index: 100;
    background: var(--color-navy);
    color: var(--color-on-dark);
    font-weight: 700;
    padding: 0.7rem 1.1rem;
    border-radius: var(--radius-sm);
    /* Keyboard-initiated and hit on every Tab-through: appears instantly,
       no transition — the reader needs the target, not the journey. */
    transform: translateY(-200%);
  }
  .skip-link:focus-visible {
    transform: translateY(0);
  }
```

## Repo conventions to follow

- The removed portal override (`globals.css:1223-1225`) is itself the
  exemplar — instant was already the chosen temperament for this element.
- The keyboard rule is already applied elsewhere in the repo: the calendar
  month-turn animates for pointer turns only
  (`portal-calendar.tsx` sets `data-turn` on pointer interaction), and
  DESIGN.md "Motion" names keyboard/high-frequency actions as the
  no-animation tier.

## Steps

1. In `src/app/globals.css`, in the `.skip-link` rule (lines 453-465),
   delete the line `transition: transform 0.3s var(--ease-out-quart);` and
   add the two-line comment from Target above the `transform` declaration.
2. Delete the now-redundant `.portal-scope .skip-link { transition: none; }`
   rule (lines 1223-1225).
3. Run `npx oxfmt` on the file if the formatter flags it.

## Boundaries

- Do NOT touch the `.skip-link:focus-visible` rule or any other `.skip-link`
  declaration — the off-screen `translateY(-200%)` hiding mechanism stays.
- Do NOT touch the markup (`src/app/[locale]/layout.tsx:135` and the portal
  layout) — CSS only.
- Do NOT replace the transition with a faster one; the target is none.
- If the code at the cited lines doesn't match (drift since a303135), STOP
  and report instead of improvising.

## Verification

- **Mechanical**: `npx oxlint` (zero warnings/errors), `npx oxfmt --check`
  clean, `npm run build` succeeds.
- **Feel check**:
  - On the marketing home (`/en`), press Tab once: the "skip to content"
    pill is simply **there**, fully in place, the same frame — no slide-in.
    Press Tab again: it is gone instantly.
  - On the portal (`/admin`), Tab once: identical instant behavior
    (unchanged from before — this confirms the removed override was
    redundant).
- **Done when**: no `transition` applies to `.skip-link` in computed styles
  on either register, and focusing it shows no animation frame in the
  DevTools Animations panel.
