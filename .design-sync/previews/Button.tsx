/* Ported from the gallery's own brand demo, src/app/design/brand/button.tsx —
   the three decoupled axes (variant = paint, size = geometry, motion =
   temperament) plus the server-safe anchor path. Copy is the practice's. */

import { ArrowRight, Phone, Printer, buttonVariants, Button } from "westchase-gi";

export function Variants() {
  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Hero step</Button>
      <Button size="icon" aria-label="Print">
        <Printer />
      </Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="amber">
        <Phone data-icon="inline-start" />
        (813) 855-5555
      </Button>
      <Button>
        Continue
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}

export function MotionAxis() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button motion="wgi">wgi — the brand lift</Button>
        <Button motion="commit">commit — the held press</Button>
        <Button motion="shadcn">shadcn — stock feel</Button>
        <Button motion="none">none</Button>
      </div>
      <p className="text-sm text-muted-ink">
        Motion is decoupled from paint: any variant can wear any temperament.
      </p>
    </div>
  );
}

export function AnchorsWearTheRecipe() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="#" className={buttonVariants({ variant: "amber", size: "lg" })}>
        Request an appointment
      </a>
      <a href="#" className={buttonVariants({ variant: "outline" })}>
        Download prep instructions
      </a>
    </div>
  );
}
