# 003 — Tokenize the reveal's hardcoded 200ms fade

- **Status**: DONE
- **Commit**: 08bd929
- **Severity**: LOW
- **Category**: Tokens / cohesion
- **Estimated scope**: 2 files, ~6 lines

## Problem

The portal's motion registry (`src/app/globals.css`, `.portal-scope`, ~lines
1280-1308) tokens every authored movement, but one fade escapes it:

```css
/* src/app/admin/portal-workbench.css:1064-1072 — current */
.portal-line-reveal[data-open="true"] {
  grid-template-rows: 1fr;
  visibility: visible;
  opacity: 1;
  transition:
    grid-template-rows var(--pm-spring-duration) var(--pm-spring),
    opacity 200ms var(--pm-exit),
    visibility 0s;
}
```

`200ms` is a one-off. It is not `--pm-exit-duration` (160ms) and not
`--pm-scrim-duration` (220ms), so the next reader cannot tell whether it is a
deliberate third value or drift.

## Target

Name it. Add a registry token and use it:

```css
/* src/app/globals.css — inside the .portal-scope block, next to the other
   --pm-* tokens (~line 1306) — target */
--pm-fade-duration: 200ms;
```

Extend the registry comment block above the tokens with one line:

```
--pm-fade-duration — an opacity-only fade that rides alongside a spring
(the working band's unfold, the scrim's cousin). Longer than the exit,
shorter than the scrim, because the fold is already carrying the motion.
```

```css
/* src/app/admin/portal-workbench.css:1064-1072 — target */
.portal-line-reveal[data-open="true"] {
  grid-template-rows: 1fr;
  visibility: visible;
  opacity: 1;
  transition:
    grid-template-rows var(--pm-spring-duration) var(--pm-spring),
    opacity var(--pm-fade-duration) var(--pm-exit),
    visibility 0s;
}
```

## Repo conventions to follow

- Exemplar: `src/app/globals.css:1259-1308` — the registry comment plus token
  block (`--pm-spring`, `--pm-spring-duration: 440ms`, `--pm-exit`,
  `--pm-exit-duration: 160ms`, `--pm-scrim-duration: 220ms`,
  `--pm-reduced-duration: 120ms`). Tokens are authored on `.portal-scope` so
  they resolve by inheritance into the workbench layer.

## Steps

1. Add `--pm-fade-duration: 200ms;` to the `.portal-scope` token block in
   `src/app/globals.css`, directly after `--pm-reduced-duration: 120ms;`.
2. Add the one-line registry comment (see Target) to the comment block above
   the tokens, after the `--pm-reduced-duration` paragraph.
3. In `src/app/admin/portal-workbench.css:1068`, replace `opacity 200ms` with
   `opacity var(--pm-fade-duration)`.
4. Grep to confirm no other literal `200ms` fade remains in
   `portal-workbench.css`: `grep -n '200ms' src/app/admin/portal-workbench.css`.
   Report any additional hits rather than changing them.

## Boundaries

- Do NOT change the value (it stays 200ms) — this plan names it, it does not
  retune it.
- Do NOT touch `--pm-scrim-duration` usages.
- If line 1068 does not read `opacity 200ms var(--pm-exit)`, STOP and report.

## Verification

- **Mechanical**: `npx oxlint`, `npx oxfmt --check`, `npm run build` clean.
  `grep -n '200ms' src/app/admin/portal-workbench.css` returns no hits inside
  `.portal-line-reveal`.
- **Feel check**: open a line modal, select "No answer": the section unfolds on
  the spring with the fade riding it — visually identical to before (same
  200ms, now named).
- **Done when**: the unfold renders identically and every duration in the
  reveal transition resolves from a `--pm-*` token.
