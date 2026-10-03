// Loading boundary for the Settings panes. The Settings sidebar sits above
// It in the portal shell, so choosing a pane commits at once while only the
// Pane shows this placeholder. No recurring pulse on a route staff visit often.

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
