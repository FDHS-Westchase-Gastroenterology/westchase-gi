import { BadgeCheckIcon, PhoneCallIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Example, ExampleWrapper } from "./example";

/* The stamp. `variant` is required and named for meaning, so the color law
   is executable: amber means attention, teal means current, navy is
   settled ink, neutral recedes — and a stamp always carries words. */

export default function BrandBadgeExample() {
  return (
    <ExampleWrapper className="lg:grid-cols-1">
      <Meanings />
      <WithIcon />
      <LongText />
    </ExampleWrapper>
  );
}

function Meanings() {
  return (
    <Example title="Variants are meanings">
      <div className="flex flex-wrap gap-2">
        <Badge variant="attention">New</Badge>
        <Badge variant="current">Contacted</Badge>
        <Badge variant="settled">Scheduled</Badge>
        <Badge variant="quiet">Closed</Badge>
      </div>
      <p className="text-sm text-muted-ink">
        There is no default stamp: <code>&lt;Badge&gt;</code> without a variant does not compile.
        The stock recipe&apos;s six paint-only variants were pruned.
      </p>
    </Example>
  );
}

function WithIcon() {
  return (
    <Example title="Icon" className="max-w-fit">
      <div className="flex flex-wrap gap-2">
        <Badge variant="current">
          <PhoneCallIcon data-icon="inline-start" />
          Call again Tuesday
        </Badge>
        <Badge variant="settled">
          <BadgeCheckIcon data-icon="inline-start" />
          Booked
        </Badge>
      </div>
    </Example>
  );
}

function LongText() {
  return (
    <Example title="Long text — the pill holds one line">
      <div className="flex flex-wrap gap-2">
        <Badge variant="quiet">Closed — patient scheduled with another practice</Badge>
      </div>
    </Example>
  );
}
