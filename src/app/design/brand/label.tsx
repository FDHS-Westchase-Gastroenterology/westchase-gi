import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Example, ExampleWrapper } from "./example";

export default function BrandLabelExample() {
  return (
    <ExampleWrapper>
      <Example title="With a control">
        <div className="flex flex-col gap-2">
          <Label htmlFor="brand-label-mrn">Chart number</Label>
          <Input id="brand-label-mrn" placeholder="Optional" />
        </div>
      </Example>
      <Example title="Beside a native checkbox">
        <div className="flex items-center gap-2">
          <input id="brand-label-consent" type="checkbox" />
          <Label htmlFor="brand-label-consent">The patient consented to a text reminder</Label>
        </div>
      </Example>
    </ExampleWrapper>
  );
}
