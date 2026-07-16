// Loading boundary for the Settings sub-pages. The heading and tab row
// live in layout.tsx above this boundary, so switching tabs commits
// navigation immediately (the underline moves on click) while only the
// content area shows this placeholder until the server payload arrives.
// The global reduced-motion rule freezes animate-pulse, so the skeleton
// is static under prefers-reduced-motion with no extra handling here.

export default function SettingsSectionLoading() {
  return (
    <div aria-busy="true" className="space-y-5">
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white" />
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white" />
    </div>
  );
}
