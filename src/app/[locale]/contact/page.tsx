import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/lib/site";
import { PageHero } from "@/components/PageHero";
import { LocationCards } from "@/components/LocationCards";
import { HoursTable } from "@/components/HoursTable";
import { AppointmentForm } from "@/components/AppointmentForm";
import { TextBand } from "@/components/TextBand";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/contact", dict.meta.contact.title, dict.meta.contact.description);
}

export default async function ContactPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.contact;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      <section className="section">
        <div className="container-x">
          <h2 className="sr-only">{t.locationsHeading}</h2>
          <LocationCards locale={locale} dict={dict} />
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section grid items-start gap-x-14 gap-y-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="lg:sticky lg:top-32">
            <HoursTable locale={locale} dict={dict} />
          </div>
          <div>
            <h2 className="h2 heading-tick">{t.formHeading}</h2>
            <div className="mt-7">
              <AppointmentForm locale={locale} dict={dict} />
            </div>
          </div>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
