import { Separator } from "@/components/ui/separator";

import { Example, ExampleWrapper } from "./example";

export default function BrandSeparatorExample() {
  return (
    <ExampleWrapper>
      <Example title="Horizontal — a hairline, --color-line">
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-semibold text-ink">Tuesday, 3 requests</p>
          <Separator />
          <p className="text-muted-ink">Space separates; hairlines divide.</p>
        </div>
      </Example>
      <Example title="Vertical">
        <div className="flex h-5 items-center gap-3 text-sm">
          <span>Tampa</span>
          <Separator orientation="vertical" />
          <span>Lutz</span>
          <Separator orientation="vertical" />
          <span>Telehealth</span>
        </div>
      </Example>
    </ExampleWrapper>
  );
}
