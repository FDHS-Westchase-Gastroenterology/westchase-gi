import { MotionDemo } from "./motion-demo";
import {
  brandHues,
  bridge,
  inks,
  lines,
  motionTokens,
  patientTypeScale,
  portalTypeScale,
  radii,
  shadows,
  spaceScale,
  surfaces,
} from "./tokens";
import type { ColorToken, GeometryToken, TypeStep } from "./tokens";

// Foundations: every token rendered live from the CSS it lives in.

type SectionProps = Readonly<{
  id: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}>;

export function Section({ id, title, lede, children }: SectionProps) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-6 border-t border-line pt-8">
      <header className="flex max-w-2xl flex-col gap-1">
        <h2 className="text-xl font-extrabold text-ink">{title}</h2>
        <p className="text-sm text-muted-ink">{lede}</p>
      </header>
      {children}
    </section>
  );
}

type SwatchRowProps = Readonly<{ heading: string; tokens: readonly ColorToken[] }>;

function SwatchRow({ heading, tokens }: SwatchRowProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-ink uppercase">{heading}</h3>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tokens.map((token) => (
          <li key={token.name} className="flex flex-col gap-2">
            <div className="design-swatch" style={{ background: `var(--color-${token.name})` }} />
            <div className="flex flex-col gap-0.5">
              <code className="text-xs font-semibold text-ink">--color-{token.name}</code>
              <span className="text-xs text-muted-ink">{token.role}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColorSection() {
  return (
    <Section
      id="color"
      title="Color"
      lede="Four practice hues, each holding exactly one role. Navy is ink, teal is current, amber is attention, mint is the only hue that may tint an area. Color never carries state alone."
    >
      <SwatchRow heading="Brand hues" tokens={brandHues} />
      <SwatchRow heading="Surfaces" tokens={surfaces} />
      <SwatchRow heading="Ink" tokens={inks} />
      <SwatchRow heading="Lines" tokens={lines} />
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-muted-ink uppercase">
          The semantic bridge — how shadcn resolves to the brand
        </h3>
        <table className="w-full max-w-3xl text-sm">
          <thead className="text-left text-xs tracking-wide text-muted-ink uppercase">
            <tr>
              <th className="py-2 pr-4 font-semibold">Semantic token</th>
              <th className="py-2 font-semibold">Brand value</th>
            </tr>
          </thead>
          <tbody>
            {bridge.map((row) => (
              <tr key={row.semantic} className="border-t border-line">
                <td className="py-2 pr-4">
                  <code>--{row.semantic}</code>
                </td>
                <td className="py-2 text-muted-ink">{row.brand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

type TypeTableProps = Readonly<{ heading: string; steps: readonly TypeStep[]; specimen: boolean }>;

function TypeTable({ heading, steps, specimen }: TypeTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-ink uppercase">{heading}</h3>
      <ul className="flex flex-col divide-y divide-line">
        {steps.map((step) => (
          <li
            key={step.token}
            className="grid gap-2 py-3 sm:grid-cols-[14rem_1fr] sm:items-baseline"
          >
            <div className="flex flex-col">
              <code className="text-xs font-semibold text-ink">{step.token}</code>
              <span className="text-xs text-muted-ink">{step.value}</span>
              <span className="text-xs text-muted-ink">{step.use}</span>
            </div>
            {specimen ? (
              <span
                className="truncate text-ink"
                style={{ fontSize: step.token.startsWith("--") ? `var(${step.token})` : undefined }}
              >
                A real person answers.
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TypeSection() {
  return (
    <Section
      id="type"
      title="Typography"
      lede="Two registers. The patient site pairs a display serif (Trocchi) with Lato on a fluid scale; the portal is Lato alone on a fixed 1.2-ratio scale with three weights. Five locales swap families through :lang()."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <TypeTable heading="Patient site — fluid steps" steps={patientTypeScale} specimen />
          <p className="font-display text-2xl text-ink">Trocchi carries the patient headings.</p>
        </div>
        <div className="portal-scope rounded-lg p-4">
          <TypeTable
            heading="Staff portal — fixed steps (.portal-scope)"
            steps={portalTypeScale}
            specimen
          />
        </div>
      </div>
    </Section>
  );
}

export function SpaceSection() {
  return (
    <Section
      id="space"
      title="Space"
      lede="The portal's seven-step scale on a 4px base. Values between steps do not exist; a gap that wants one is a hierarchy question. The patient site uses Tailwind's scale plus clamp()ed section rhythm."
    >
      <ul className="flex max-w-xl flex-col gap-2">
        {spaceScale.map((step) => (
          <li key={step.token} className="grid grid-cols-[6rem_1fr] items-center gap-4 text-xs">
            <code className="font-semibold text-ink">{step.token}</code>
            <div className="flex items-center gap-3">
              <div className="design-space-bar" style={{ width: `${step.rem * 4}rem` }} />
              <span className="text-muted-ink">{step.rem}rem</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

type GeometryListProps = Readonly<{
  heading: string;
  tokens: readonly GeometryToken[];
  kind: "radius" | "shadow";
}>;

function GeometryList({ heading, tokens, kind }: GeometryListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-ink uppercase">{heading}</h3>
      <ul className="flex flex-wrap gap-6">
        {tokens.map((token) => (
          <li key={token.token} className="flex flex-col gap-2">
            <div
              className="size-20 bg-white"
              style={
                kind === "radius"
                  ? {
                      borderRadius: `var(${token.token})`,
                      boxShadow: "inset 0 0 0 1.5px var(--color-line-2)",
                    }
                  : { borderRadius: "var(--radius-lg)", boxShadow: `var(${token.token})` }
              }
            />
            <code className="text-xs font-semibold text-ink">{token.utility}</code>
            <span className="max-w-40 text-xs text-muted-ink">{token.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GeometrySection() {
  return (
    <Section
      id="shape"
      title="Shape and elevation"
      lede="Three radii and two shadows. A shadow is never paired with a visible border. The brand @theme owns the radius namespace; the shadcn bridge re-declares none of it."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <GeometryList heading="Radius" tokens={radii} kind="radius" />
        <GeometryList heading="Elevation" tokens={shadows} kind="shadow" />
      </div>
    </Section>
  );
}

export function MotionSection() {
  return (
    <Section
      id="motion"
      title="Motion"
      lede="One registry. Arrival is a spring, departure is a faster ease-out, micro states are 150ms tints. CSS and motion.dev are two engines reading the same registry — pick by fit, and the temperament holds across both."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <ul className="flex flex-col divide-y divide-line">
          {motionTokens.map((token) => (
            <li key={token.token} className="flex flex-col gap-0.5 py-3">
              <code className="text-xs font-semibold text-ink">{token.token}</code>
              <span className="text-xs text-muted-ink">{token.value}</span>
              <span className="text-xs text-muted-ink">{token.use}</span>
            </li>
          ))}
        </ul>
        <MotionDemo />
      </div>
    </Section>
  );
}
