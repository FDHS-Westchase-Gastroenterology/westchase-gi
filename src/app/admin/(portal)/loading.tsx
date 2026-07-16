export default function PortalLoading() {
  return (
    <div aria-busy="true" className="space-y-5">
      <div className="h-16 max-w-xl animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white" />
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white" />
    </div>
  );
}
