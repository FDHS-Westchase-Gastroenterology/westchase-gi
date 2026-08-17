export function AuthCard({
  title,
  description,
  children,
  footer,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--portal-canvas)] px-5 py-10">
      <div className="w-full max-w-3xl">
        <div className="grid overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)] sm:grid-cols-[0.85fr_1.4fr]">
          <div className="flex min-h-36 flex-col justify-between bg-[var(--color-navy)] px-7 py-7 text-[var(--color-on-dark)] sm:min-h-full sm:px-8 sm:py-9">
            <div>
              <p className="text-[1.15rem] leading-snug font-[var(--font-display)]">
                Westchase Gastroenterology
              </p>
              <p className="mt-2 border-t border-[var(--color-line-dark)] pt-3 text-[0.76rem] font-bold tracking-[0.1em] text-[var(--color-on-dark-muted)] uppercase">
                Staff portal
              </p>
            </div>
            <span className="mt-8 hidden h-1 w-10 rounded-full bg-[var(--color-amber)] sm:block" />
          </div>
          <div className="px-7 pt-7 pb-8 sm:px-9 sm:pt-9 sm:pb-9">
            <h1 className="portal-auth-title text-[1.55rem] leading-tight text-[var(--color-ink)]">
              {title}
            </h1>
            <p className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]">{description}</p>
            {children}
          </div>
        </div>
        {footer !== undefined && footer !== null && footer !== false && footer !== "" ? (
          <div className="mt-5 text-center text-[0.85rem] text-[var(--color-muted)]">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
