export default function PortalLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="portal-loading">
      <span className="sr-only">Loading the staff portal</span>
      <div className="portal-loading-heading" aria-hidden="true">
        <span />
        <i />
      </div>
      <div className="portal-loading-workbench" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
