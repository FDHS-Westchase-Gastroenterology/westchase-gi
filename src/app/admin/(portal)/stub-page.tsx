// Shared placeholder body for portal sections whose packets land later
// tonight. Every stub still runs the real role check server-side.

export function StubSection({
  title,
  lede,
  detail,
}: {
  title: string;
  lede: string;
  detail: string;
}) {
  return (
    <section aria-labelledby="stub-heading">
      <h1
        id="stub-heading"
        className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
      >
        {title}
      </h1>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
        {lede}
      </p>
      <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-8 sm:p-10">
        <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
          Being provisioned tonight
        </h2>
        <p className="mt-2 max-w-[60ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
          {detail}
        </p>
      </div>
    </section>
  );
}
