import { ArrowLeftCircleIcon, ArrowRightIcon, PhoneIcon, PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

import { Example, ExampleWrapper } from "./example";

/* The Button recipe, worn: three axes (variant, size, motion) and the
   server-safe anchor path. Copy is the practice's own vocabulary. */

export default function BrandButtonExample() {
  return (
    <ExampleWrapper className="lg:grid-cols-1 2xl:grid-cols-1">
      <Variants />
      <Sizes />
      <Icons />
      <Motion />
      <AnchorsWearTheRegister />
    </ExampleWrapper>
  );
}

function Variants() {
  return (
    <Example title="Variants — paint only">
      <div className="flex flex-wrap items-center gap-2">
        <Button>Request an appointment</Button>
        <Button variant="amber">Call the office</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Remove recipient</Button>
        <Button variant="link">Open full record</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-navy p-4">
        <Button variant="amber">Request an appointment</Button>
        <Button variant="ghost-light">Text the office</Button>
      </div>
    </Example>
  );
}

function Sizes() {
  return (
    <Example title="Sizes — every step keeps the 44px target">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Hero step</Button>
        <Button size="icon" aria-label="Print">
          <PrinterIcon />
        </Button>
      </div>
    </Example>
  );
}

function Icons() {
  return (
    <Example title="Icons — data-icon sets the padding">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="amber">
          <PhoneIcon data-icon="inline-start" />
          (813) 555-0100
        </Button>
        <Button variant="outline">
          <ArrowLeftCircleIcon data-icon="inline-start" />
          Back to Appointments
        </Button>
        <Button>
          Continue
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </Example>
  );
}

function Motion() {
  return (
    <Example title="Motion axis — press each one">
      <div className="flex flex-wrap items-center gap-2">
        <Button motion="wgi">wgi — the brand lift</Button>
        <Button motion="commit">commit — the held press</Button>
        <Button motion="commit" data-pending="">
          commit, pending
        </Button>
        <Button motion="shadcn">shadcn — stock feel</Button>
        <Button motion="none">none</Button>
      </div>
      <p className="text-sm text-muted-ink">
        The base string carries no motion. A scope re-tunes the physics through the{" "}
        <code>--btn-*</code> knobs: the portal flattens the lift into a 0.98 press.
      </p>
    </Example>
  );
}

function AnchorsWearTheRegister() {
  return (
    <Example title="Zero-JS anchors wear the recipe through className">
      <div className="flex flex-wrap items-center gap-2">
        <a href="#brand-button" className={buttonVariants({ variant: "amber", size: "lg" })}>
          Request an appointment
        </a>
        <a href="#brand-button" className={buttonVariants({ variant: "outline" })}>
          Download prep instructions
        </a>
      </div>
    </Example>
  );
}
