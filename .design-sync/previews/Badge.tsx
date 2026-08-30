/* Ported from src/app/design/brand/badge.tsx. `variant` is required and named
   for MEANING, not paint — the color law made executable. */

import { Badge, Check, Phone } from "westchase-gi";

export function VariantsAreMeanings() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="attention">New</Badge>
        <Badge variant="current">Contacted</Badge>
        <Badge variant="settled">Scheduled</Badge>
        <Badge variant="quiet">Closed</Badge>
      </div>
      <p className="text-sm text-muted-ink">
        There is no default stamp: a Badge without a variant does not compile.
      </p>
    </div>
  );
}

export function WithIcon() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="current">
        <Phone data-icon="inline-start" />
        Call again Tuesday
      </Badge>
      <Badge variant="settled">
        <Check data-icon="inline-start" />
        Booked
      </Badge>
    </div>
  );
}

export function LongText() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="quiet">Closed — patient scheduled with another practice</Badge>
    </div>
  );
}
