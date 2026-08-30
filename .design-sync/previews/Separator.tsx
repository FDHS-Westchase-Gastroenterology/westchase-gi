/* Ported from src/app/design/brand/separator.tsx. Space separates; hairlines
   divide. */

import { Separator } from "westchase-gi";

export function Horizontal() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 text-sm">
      <p className="font-semibold text-ink">Tuesday, 3 requests</p>
      <Separator />
      <p className="text-muted-ink">Space separates; hairlines divide.</p>
    </div>
  );
}

export function Vertical() {
  return (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>Tampa</span>
      <Separator orientation="vertical" />
      <span>Lutz</span>
      <Separator orientation="vertical" />
      <span>Telehealth</span>
    </div>
  );
}
