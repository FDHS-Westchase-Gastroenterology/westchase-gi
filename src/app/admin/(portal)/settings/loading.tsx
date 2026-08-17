// Loading boundary for the Settings sub-pages. The heading and tab row
// Live in layout.tsx above this boundary, so switching tabs commits
// Navigation immediately (the underline moves on click) while only the
// Content area shows this placeholder until the server payload arrives.
// The placeholder preserves the workbench's hierarchy without adding a
// Recurring pulse to an operational route staff may visit often.

export default function SettingsSectionLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="portal-loading">
      <span className="sr-only">Loading settings</span>
      <div className="portal-loading-workbench" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="portal-loading-workbench" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}
