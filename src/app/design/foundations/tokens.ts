/* The token census the Foundations page renders. Values are read live from
   the CSS custom properties (the swatches reference var(--color-…)), so this
   file carries names and roles only; src/app/globals.css stays the source
   of truth for every value. */

export interface ColorToken {
  readonly name: string;
  readonly role: string;
}

export const surfaces: readonly ColorToken[] = [
  { name: "paper", role: "Page background — cool near-white" },
  { name: "mint", role: "Section band; the only hue allowed to tint a large area (settled state)" },
  { name: "mint-2", role: "Deeper mint for wells" },
];

export const brandHues: readonly ColorToken[] = [
  { name: "navy", role: "The identity: printed ink, task index, primary actions" },
  { name: "navy-2", role: "Deepest navy — footer, sidebar" },
  { name: "teal", role: "Current, selected, hovered — the finger tracking a line" },
  { name: "teal-ink", role: "Teal as text on light (≥ 4.5:1); the focus ring" },
  { name: "amber", role: "Attention: a stamp, a tag, a hairline marker; the warm CTA" },
  { name: "amber-soft", role: "Amber tint for notices" },
  { name: "amber-deep", role: "Large-text amber on light" },
];

export const inks: readonly ColorToken[] = [
  { name: "ink", role: "Headings" },
  { name: "body", role: "Body copy" },
  { name: "muted-ink", role: "Secondary text (≥ 4.5:1 on paper and mint)" },
  { name: "on-dark", role: "Text on navy" },
  { name: "on-dark-muted", role: "Secondary text on navy (≥ 4.5:1)" },
];

export const lines: readonly ColorToken[] = [
  { name: "line", role: "Hairlines" },
  { name: "line-2", role: "Field borders" },
  { name: "line-3", role: "Control boundaries (≥ 3:1)" },
  { name: "line-dark", role: "Hairlines on navy" },
];

export interface BridgeRow {
  readonly semantic: string;
  readonly brand: string;
}

export const bridge: readonly BridgeRow[] = [
  { semantic: "background / card / popover", brand: "paper" },
  { semantic: "foreground / card-foreground / popover-foreground", brand: "body" },
  { semantic: "primary", brand: "navy" },
  { semantic: "primary-foreground", brand: "on-dark" },
  { semantic: "secondary / accent", brand: "mint" },
  { semantic: "secondary-foreground / accent-foreground", brand: "ink" },
  { semantic: "muted", brand: "mint-2" },
  { semantic: "muted-foreground", brand: "muted-ink" },
  { semantic: "border", brand: "line" },
  { semantic: "input", brand: "line-3" },
  { semantic: "ring", brand: "teal-ink" },
  { semantic: "destructive", brand: "oklch(0.577 0.245 27.325) — the one non-brand hue" },
  { semantic: "sidebar / sidebar-primary / sidebar-accent", brand: "navy-2 / navy / navy" },
  { semantic: "chart-1 … chart-5", brand: "navy, teal, amber-deep, teal-ink, ink" },
];

export interface TypeStep {
  readonly token: string;
  readonly value: string;
  readonly use: string;
}

export const patientTypeScale: readonly TypeStep[] = [
  { token: "--step-hero", value: "clamp(2.4rem, 1.35rem + 4vw, 4rem)", use: ".display — the hero" },
  { token: "--step-1", value: "clamp(2rem, 1.5rem + 2.2vw, 3rem)", use: ".h1" },
  { token: "--step-2", value: "clamp(1.6rem, 1.3rem + 1.4vw, 2.25rem)", use: ".h2" },
  { token: "--step-3", value: "clamp(1.3rem, 1.12rem + 0.8vw, 1.6rem)", use: ".h3" },
  { token: "--step-lead", value: "clamp(1.1rem, 1.02rem + 0.4vw, 1.28rem)", use: ".lead" },
  {
    token: "body",
    value: "1.0625rem / 1.65",
    use: "Paragraphs — 17px floor for an older audience",
  },
];

export const portalTypeScale: readonly TypeStep[] = [
  { token: "--pt-xl", value: "1.75rem · 800", use: "The sheet's day" },
  { token: "--pt-lg", value: "1.25rem · 800", use: "Group headings" },
  { token: "--pt-base", value: "1.0625rem · 600", use: "The datum on a line — a patient's name" },
  { token: "--pt-sm", value: "0.9375rem · 400", use: "Body floor" },
  { token: "--pt-xs", value: "0.8125rem · 400", use: "Meta and timestamps" },
  { token: "--pt-2xs", value: "0.6875rem · 600 tracked uppercase", use: "Column heads" },
];

export interface SpaceStep {
  readonly token: string;
  readonly rem: number;
}

export const spaceScale: readonly SpaceStep[] = [
  { token: "--ps-1", rem: 0.25 },
  { token: "--ps-2", rem: 0.5 },
  { token: "--ps-3", rem: 0.75 },
  { token: "--ps-4", rem: 1 },
  { token: "--ps-6", rem: 1.5 },
  { token: "--ps-8", rem: 2 },
  { token: "--ps-12", rem: 3 },
];

export interface GeometryToken {
  readonly token: string;
  readonly utility: string;
  readonly value: string;
}

export const radii: readonly GeometryToken[] = [
  { token: "--radius-sm", utility: "rounded-sm", value: "0.375rem — fields" },
  { token: "--radius", utility: "rounded-[var(--radius)]", value: "0.625rem — buttons" },
  { token: "--radius-lg", utility: "rounded-lg", value: "0.875rem — cards" },
];

export const shadows: readonly GeometryToken[] = [
  { token: "--shadow-soft", utility: "shadow-soft", value: "Hovered controls" },
  {
    token: "--shadow-card",
    utility: "shadow-card",
    value: "Lifted cards — never paired with a visible border",
  },
];

export interface MotionToken {
  readonly token: string;
  readonly value: string;
  readonly use: string;
}

export const motionTokens: readonly MotionToken[] = [
  {
    token: "--motion-spring · --motion-spring-duration",
    value: "linear(…) ζ≈0.7 · 440ms",
    use: "Arrival — modals, sheets, anything that moves into view",
  },
  {
    token: "--motion-exit · --motion-exit-duration",
    value: "cubic-bezier(0.23, 1, 0.32, 1) · 160ms",
    use: "Departure — always faster than arrival, back along the entrance path",
  },
  {
    token: "--motion-micro-duration",
    value: "150ms",
    use: "Micro states — hover tints, pressed ink, focus rings",
  },
  {
    token: "--ease-out-quint · --ease-out-quart",
    value: "cubic-bezier(0.22, 1, 0.36, 1) · (0.25, 1, 0.5, 1)",
    use: "Patient-site curves — the button lift, the link underline",
  },
  {
    token: "--pm-reduced-duration",
    value: "120ms",
    use: "Reduced motion — a cross-fade with no travel",
  },
];
