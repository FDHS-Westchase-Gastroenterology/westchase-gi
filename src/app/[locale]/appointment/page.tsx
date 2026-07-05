import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, type Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { AppointmentForm } from "@/components/AppointmentForm";
import { HoursTable } from "@/components/HoursTable";
import { MessageSquare, Phone } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/appointment",
    dict.meta.appointment.title,
    dict.meta.appointment.description
  );
}

export default async function AppointmentPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.appointment;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      <section className="section">
        <div className="container-x grid items-start gap-x-14 gap-y-10 lg:grid-cols-[1.25fr_1fr]">
          <AppointmentForm locale={locale} dict={dict} />
          <aside className="grid gap-6 lg:sticky lg:top-32">
            <div className="card bg-[var(--color-navy)] p-7 text-[var(--color-on-dark)]">
              <h2 className="h3 font-[var(--font-display)] text-[var(--color-on-dark)]">
                {dict.common.textBand.heading}
              </h2>
              <p className="mt-3 text-[var(--color-on-dark-muted)]">{dict.common.textBand.body}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={site.textLine.href} className="btn btn-amber">
                  <MessageSquare className="h-4 w-4" /> {dict.common.textUs}
                </a>
                <a href={site.phone.href} className="btn btn-ghost-light">
                  <Phone className="h-4 w-4" /> {dict.common.callUs}
                </a>
              </div>
            </div>
            <HoursTable locale={locale} dict={dict} />
          </aside>
        </div>
      </section>
    </>
  );
}
