## Context

This is the Westchase Gastroenterology staff portal (Next.js, repo root is this directory). On the
home dashboard at /admin, clicking an appointment request row opens a popover card. The two
attached screenshots show it: one is the full dashboard with the card open over the row list, the
other is the card cropped. Everything renders on the light theme.

Where the relevant code lives:
- src/app/admin/(portal)/(home)/line-list.tsx   the card's markup (.wgi-record-card and children)
- src/app/admin/(portal)/(home)/home.css        the card's styles
- src/app/globals.css                           the brand tokens (@theme block) and the semantic bridge
- DESIGN.md                                     the design system rules, including the color law and
                                                the WCAG 2.1 AA promise that every text/background
                                                pair is verified, not assumed
- The Claude Design project is the canonical design system. DESIGN.md "Adoption" describes how
  this repository follows it.

## My concern

The card looks low-contrast to me, and I think the cause is typography and color rather than
structure. The information hierarchy and layout of the card are correct and I do not want them
changed. What I am unsure about is:

1. The card against the rest of the portal. The card surface, the page background, and the
   highlighted row behind it are all pale cool tints, so the card may not separate from the page
   the way a popover should.
2. Contrast inside the card. The secondary line under the name, the right-aligned hints next to
   each outcome ("call again tomorrow"), the phone chip, and the "Open full record" footer all
   look faint to me relative to the headings.

I have not measured this. Measure the actual tokens and computed pairs before you agree with me,
form your own diagnosis, and act on it. If the numbers say the contrast is fine and the problem is
something else, say so and fix that instead.

## What I want

The deliverable is the changed card in the codebase, with before/after screenshots at the same
crop as the attached one. I am not asking for a report or a plan to approve first. Do not stop to
scope or confirm the approach with me; make the change, show it, and I will tell you what still
looks wrong.

Your measurement should cover every text/background pair in the card, the card-surface-to-page
and card-to-row pairs, and the shadow or border that separates the card from the page: the
resolved colors, the contrast ratio, and whether it meets AA for its size and weight. Use it to
decide whether the low contrast comes from ratio, from weight and size, or from the surfaces being
too close in value, and change what that shows. Only treat a pair as passing if you computed it;
if a value cannot be resolved, say so.

Constraints:
- Work within the design system. New colors go in the @theme block in globals.css and get a role
  name per DESIGN.md; nothing else may declare a literal. Prefer reusing an existing token over
  adding one, and say which tokens you touched.
- Keep the card's content, order, spacing, and component structure as they are. This is a color
  and type-weight pass.
- Whatever you change in the tokens, check the other places those tokens are used so the
  dashboard row list, stamps, and sidebar do not change unintentionally. Name anything that did.
- Make the simplest change that makes the card legible. No refactors, no new components, no
  cleanup outside the pairs you are fixing.

## How to work with me

Post a short update as you go: when the measurements are in and you have a diagnosis, and after
each change lands with what changed. When you are done, lead with what was actually wrong in a
sentence or two, then the before/after screenshots, then the pairs you measured and the tokens you
touched.
