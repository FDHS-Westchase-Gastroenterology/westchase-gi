import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  lead?: string;
  children?: ReactNode;
};

/** Internal-page opener: mint band, display heading, optional lead. */
export function PageHero({ title, lead, children }: PageHeroProps) {
  return (
    <section className="border-b border-[var(--color-line)] bg-[var(--color-mint)]">
      <div className="container-x section-sm">
        <h1 className="h1 heading-tick">{title}</h1>
        {lead ? <p className="lead measure mt-4 text-[var(--color-body)]">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
