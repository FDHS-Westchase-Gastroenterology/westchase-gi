export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-mint)] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]">
          <div className="bg-[var(--color-navy)] px-8 py-6 text-[var(--color-on-dark)]">
            <p className="font-[var(--font-display)] text-[1.15rem] leading-snug">
              Westchase Gastroenterology
            </p>
            <p className="mt-1 text-[0.8rem] font-bold uppercase tracking-[0.1em] text-[var(--color-on-dark-muted)]">
              Staff portal
            </p>
          </div>
          <div className="px-8 pb-8 pt-7">
            <h1 className="text-[1.45rem] leading-tight text-[var(--color-ink)]">
              {title}
            </h1>
            <p className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]">
              {description}
            </p>
            {children}
          </div>
        </div>
        {footer ? (
          <div className="mt-5 text-center text-[0.85rem] text-[var(--color-muted)]">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
