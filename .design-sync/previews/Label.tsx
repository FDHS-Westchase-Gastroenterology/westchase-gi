/* Ported from src/app/design/brand/label.tsx. */

import { Input, Label } from "westchase-gi";

export function WithAControl() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <Label htmlFor="label-mrn">Chart number</Label>
      <Input id="label-mrn" placeholder="Optional" />
    </div>
  );
}

export function BesideACheckbox() {
  return (
    <div className="flex items-center gap-2">
      <input id="label-consent" type="checkbox" defaultChecked />
      <Label htmlFor="label-consent">The patient consented to a text reminder</Label>
    </div>
  );
}
