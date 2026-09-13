import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

/* The staff-portal auth surface on the shadcn Card composition. The
   className overrides keep exact parity with the committed recipe:
   brand radius-lg + shadow-card elevation (never paired with the Card's
   default ring), white paper, and the portal's inherited type scale
   instead of the Card's text-sm. The title stays a real <h1> — it is the
   document heading, which CardTitle's <div> cannot carry. */
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
        <Card className="grid gap-0 rounded-[var(--radius-lg)] bg-white py-0 text-base leading-[1.55] shadow-[var(--shadow-card)] ring-0 sm:grid-cols-[0.85fr_1.4fr]">
          <div className="flex min-h-36 flex-col justify-between bg-[var(--color-navy)] px-7 py-7 text-[var(--color-on-dark)] sm:min-h-full sm:px-8 sm:py-9">
            <div>
              {/* One amber glint sweeps the wordmark on arrival (shadcn
                  shimmer: once, then done). Rare-tier motion; the utility
                  disables itself under prefers-reduced-motion. */}
              <p className="shimmer text-[1.15rem] leading-snug font-[var(--font-display)] shimmer-color-amber shimmer-duration-2400 shimmer-once">
                Westchase Gastroenterology
              </p>
              <p className="mt-2 border-t border-[var(--color-line-dark)] pt-3 text-[0.76rem] font-bold tracking-[0.1em] text-[var(--color-on-dark-muted)] uppercase">
                Staff portal
              </p>
            </div>
            <span className="mt-8 hidden h-1 w-10 rounded-full bg-[var(--color-amber)] sm:block" />
          </div>
          <div className="px-7 pt-7 pb-8 sm:px-9 sm:pt-9 sm:pb-9">
            <CardHeader className="gap-0 px-0">
              <h1 className="portal-auth-title text-[1.55rem] leading-tight text-[var(--color-ink)]">
                {title}
              </h1>
              <CardDescription className="mt-1.5 text-[0.9rem] text-[var(--color-muted-ink)]">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">{children}</CardContent>
          </div>
        </Card>
        {footer !== undefined && footer !== null && footer !== false && footer !== "" ? (
          <div className="mt-5 text-center text-[0.85rem] text-[var(--color-muted-ink)]">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
