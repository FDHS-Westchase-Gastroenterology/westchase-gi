import type { Metadata } from "next";
import Image from "next/image";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, type Locale } from "@/lib/site";
import { physicians, nursePractitioners, infusionNurse, team } from "@/lib/providers";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/physicians", dict.meta.physicians.title, dict.meta.physicians.description);
}

/** Physician entities for search (the old site had none). Names and
 * credentials verbatim; no invented biography data. */
function PhysicianSchema() {
  const json = {
    "@context": "https://schema.org",
    "@graph": physicians.map((doc) => ({
      "@type": "Physician",
      name: `${doc.name}, ${doc.credentials}`,
      medicalSpecialty: "Gastroenterologic",
      worksFor: { "@type": "MedicalClinic", name: site.name, url: site.url },
    })),
  };
  return <JsonLd data={json} />;
}

export default async function PhysiciansPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.physicians;

  return (
    <>
      <PhysicianSchema />
      <PageHero title={t.title} lead={t.intro} />

      {/* The three physicians: the practice's own cards, byte-exact. Bios
          render the moment the practice supplies them (providers.ts). */}
      <section className="section">
        <div className="container-x">
          <h2 className="h2 heading-tick">{t.physiciansHeading}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {physicians.map((doc, i) => (
              <Reveal key={doc.id} delay={(i % 3) as 0 | 1 | 2}>
                <article className="overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]">
                  <Image
                    src={doc.image.src}
                    alt={doc.alt[locale]}
                    width={doc.image.width}
                    height={doc.image.height}
                    sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                    className="w-full"
                  />
                  <div className="px-6 py-5">
                    <h3 className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">
                      {doc.name}, {doc.credentials}
                    </h3>
                    <p className="mt-1 text-[0.95rem] font-semibold text-[var(--color-teal-ink)]">
                      {doc.role[locale]}
                    </p>
                    {doc.bio ? <p className="mt-3 text-[0.95rem]">{doc.bio[locale]}</p> : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Nurse practitioners + infusion nurse */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section grid items-start gap-6 lg:grid-cols-2">
          <Reveal as="article" className="h-full overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-soft)]">
            <Image
              src={nursePractitioners.image.src}
              alt={nursePractitioners.alt[locale]}
              width={nursePractitioners.image.width}
              height={nursePractitioners.image.height}
              sizes="(min-width: 1024px) 36rem, 100vw"
              className="w-full"
            />
            <div className="px-6 py-5">
              <h2 className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">{t.npsHeading}</h2>
              <p className="mt-1 font-semibold text-[var(--color-teal-ink)]">
                {nursePractitioners.names.join(" · ")}
              </p>
              <p className="mt-1 text-[0.95rem] text-[var(--color-body)]">
                {nursePractitioners.credentials} — {t.npsRole}
              </p>
            </div>
          </Reveal>

          <Reveal as="article" delay={1} className="overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-soft)]">
            <Image
              src={infusionNurse.image.src}
              alt={infusionNurse.alt[locale]}
              width={infusionNurse.image.width}
              height={infusionNurse.image.height}
              sizes="(min-width: 1024px) 36rem, 100vw"
              className="w-full"
            />
            <div className="px-6 py-5">
              <h2 className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">
                {t.infusionHeading}
              </h2>
              <p className="mt-1 font-semibold text-[var(--color-teal-ink)]">{infusionNurse.name}</p>
              <p className="mt-1 text-[0.95rem] text-[var(--color-body)]">
                {infusionNurse.role[locale]} · {infusionNurse.motto}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Office team */}
      <section className="section">
        <div className="container-x grid items-center gap-x-14 gap-y-8 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <h2 className="h2 heading-tick">{t.teamHeading}</h2>
            <p className="measure-sm mt-4">{t.teamBody}</p>
          </Reveal>
          <Reveal variant="fade" delay={1}>
            <Image
              src={team.image.src}
              alt={team.alt[locale]}
              width={team.image.width}
              height={team.image.height}
              sizes="(min-width: 1024px) 36rem, 100vw"
              className="w-full rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
            />
          </Reveal>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
