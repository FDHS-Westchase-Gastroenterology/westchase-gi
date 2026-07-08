import type { Metadata } from "next";
import Image from "next/image";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { site, type Locale } from "@/lib/site";
import {
  physicians,
  nursePractitioners,
  infusionNurse,
  team,
  type Physician,
  type ProfileSection,
} from "@/lib/providers";
import type { Dictionary } from "@/lib/dictionaries/en";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ExternalLink } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/physicians", dict.meta.physicians.title, dict.meta.physicians.description);
}

/** BCP-47 tags for each physician's published "fluent in" line. */
const physicianLanguages: Record<string, string[]> = {
  "john-chang": ["en", "ko"],
  "amir-awad": ["en", "ar"],
  "alfredo-mendoza": ["en", "es"],
};

/** Physician entities for search (the old site had none). Names, credentials,
 * and languages verbatim from the practice's own materials. */
function PhysicianSchema() {
  const json = {
    "@context": "https://schema.org",
    "@graph": physicians.map((doc) => ({
      "@type": "Physician",
      name: `${doc.name}, ${doc.credentials}`,
      image: `${site.url}${doc.headshot.src}`,
      medicalSpecialty: "Gastroenterologic",
      knowsLanguage: physicianLanguages[doc.id],
      worksFor: { "@type": "MedicalClinic", name: site.name, url: site.url },
    })),
  };
  return <JsonLd data={json} />;
}

function Section({ section, locale }: { section: ProfileSection; locale: Locale }) {
  return (
    <section className="mt-9">
      <h3 className="text-[1.12rem] font-extrabold text-[var(--color-ink)]">
        {section.heading[locale]}
      </h3>
      {section.kind === "timeline" ? (
        <ol className="profile-timeline mt-5">
          {section.entries.map((entry) => (
            <li key={entry.title.en}>
              <p className="font-bold leading-snug text-[var(--color-ink)]">{entry.title[locale]}</p>
              <p className="mt-0.5 text-[0.95rem] text-[var(--color-body)]">{entry.detail[locale]}</p>
            </li>
          ))}
        </ol>
      ) : section.kind === "list" ? (
        <>
          {section.lead ? <p className="mt-3 text-[var(--color-body)]">{section.lead[locale]}</p> : null}
          <ul className="list-plain mt-5 gap-x-8 sm:grid-cols-2">
            {section.items.map((item) => (
              <li key={item.en}>{item[locale]}</li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-3 space-y-4 text-[var(--color-body)]">
          {section.text.map((para) => (
            <p key={para.en.slice(0, 40)}>{para[locale]}</p>
          ))}
        </div>
      )}
    </section>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <blockquote className="mt-10 border-t-2 border-[var(--color-amber)] pt-5">
      <p className="max-w-[38rem] font-[var(--font-display)] text-[1.28rem] leading-normal text-[var(--color-navy)]">
        &ldquo;{text}&rdquo;
      </p>
    </blockquote>
  );
}

function PhysicianProfile({
  doc,
  locale,
  t,
  flip,
  mint,
}: {
  doc: Physician;
  locale: Locale;
  t: Dictionary["physicians"];
  flip: boolean;
  mint: boolean;
}) {
  return (
    <section
      id={doc.id}
      className={`scroll-mt-20 ${mint ? "border-y border-[var(--color-line)] bg-[var(--color-mint)]" : ""}`}
    >
      <div
        className={`container-x section grid items-start gap-x-14 gap-y-10 ${
          flip
            ? "lg:grid-cols-[1fr_minmax(0,21rem)]"
            : "lg:grid-cols-[minmax(0,21rem)_1fr]"
        }`}
      >
        {/* Portrait + facts: sticky so the facts stay in view through the bio. */}
        <Reveal className={`lg:sticky lg:top-24 ${flip ? "lg:order-2" : ""}`}>
          <Image
            src={doc.headshot.src}
            alt={doc.alt[locale]}
            width={doc.headshot.width}
            height={doc.headshot.height}
            sizes="(min-width: 1024px) 21rem, (min-width: 640px) 24rem, 100vw"
            className="w-full max-w-sm rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
          />
          <dl className="mt-7 max-w-sm divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            <div className="flex items-baseline gap-4 py-3">
              <dt className="w-32 flex-none text-[0.85rem] font-extrabold tracking-wide text-[var(--color-teal-ink)]">
                {t.boardCertifiedLabel}
              </dt>
              <dd className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
                {doc.boardCertified.map((b) => b[locale]).join(" · ")}
              </dd>
            </div>
            <div className="flex items-baseline gap-4 py-3">
              <dt className="w-32 flex-none text-[0.85rem] font-extrabold tracking-wide text-[var(--color-teal-ink)]">
                {t.languagesLabel}
              </dt>
              <dd className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
                {doc.languagesSpoken[locale]}
              </dd>
            </div>
          </dl>
          <a
            href={doc.card.src}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-teal-ink)]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t.viewCard}
          </a>
        </Reveal>

        <Reveal delay={1} className={flip ? "lg:order-1" : ""}>
          <h2 className="font-[var(--font-display)] text-[clamp(1.7rem,3.2vw,2.2rem)] leading-tight text-[var(--color-ink)]">
            {doc.name}, {doc.credentials}
          </h2>
          <p className="mt-2 font-bold text-[var(--color-teal-ink)]">
            {doc.role[locale]} · {doc.experience[locale]}
          </p>
          <div className="mt-6 space-y-4">
            {doc.intro.map((para, i) => (
              <p key={para.en.slice(0, 40)} className={i === 0 ? "lead text-[var(--color-body)]" : "text-[var(--color-body)]"}>
                {para[locale]}
              </p>
            ))}
          </div>
          {doc.sections.map((section) => (
            <Section key={section.heading.en} section={section} locale={locale} />
          ))}
          {doc.quote ? <Quote text={doc.quote[locale]} /> : null}
        </Reveal>
      </div>
    </section>
  );
}

export default async function PhysiciansPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.physicians;
  const nps = nursePractitioners;
  const inf = infusionNurse;

  return (
    <>
      <PhysicianSchema />
      <PageHero title={t.title} lead={t.intro} />

      {/* The three physicians: full profiles as real, localized type. The
          practice's published card graphics stay linked, byte-exact. */}
      {physicians.map((doc, i) => (
        <PhysicianProfile
          key={doc.id}
          doc={doc}
          locale={locale}
          t={t}
          flip={i % 2 === 1}
          mint={i % 2 === 1}
        />
      ))}

      {/* Nurse practitioners: the brochure's content as text, per provider. */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section">
          <Reveal>
            <h2 className="h2 heading-tick">{t.npsHeading}</h2>
            <p className="lead measure mt-4 text-[var(--color-body)]">{t.npsLead}</p>
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {nps.individuals.map((np, i) => (
              <Reveal
                key={np.id}
                delay={(i % 2) as 0 | 1}
                as="article"
                className="h-full rounded-[var(--radius-lg)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8"
              >
                <div className="flex flex-wrap items-start gap-6">
                  <Image
                    src={np.headshot.src}
                    alt={np.alt[locale]}
                    width={np.headshot.width}
                    height={np.headshot.height}
                    sizes="10rem"
                    className="w-32 flex-none rounded-[var(--radius-md)] shadow-[var(--shadow-soft)] sm:w-36"
                  />
                  <div className="min-w-[12rem] flex-1">
                    <h3 className="font-[var(--font-display)] text-[1.35rem] leading-tight text-[var(--color-ink)]">
                      {np.name}
                    </h3>
                    <p className="mt-1 text-[0.92rem] font-bold text-[var(--color-teal-ink)]">
                      {np.credentials} · {np.role[locale]}
                    </p>
                    <ul className="list-plain mt-4 gap-2 text-[0.95rem]">
                      {np.focus.map((f) => (
                        <li key={f.en}>{f[locale]}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-[0.95rem] font-semibold text-[var(--color-navy)]">
                  {np.tagline[locale]}
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <h3 className="text-[1.12rem] font-extrabold text-[var(--color-ink)]">
              {nps.sharedFocus.heading[locale]}
            </h3>
            <ul className="list-plain mt-5 max-w-3xl gap-x-8 sm:grid-cols-2">
              {nps.sharedFocus.items.map((item) => (
                <li key={item.en}>{item[locale]}</li>
              ))}
            </ul>
            <a
              href={nps.card.src}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-teal-ink)]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {t.viewCard}
            </a>
          </Reveal>
        </div>
      </section>

      {/* Infusion services: Juliet's card content as text + the biologics table. */}
      <section id="infusion">
        <div className="container-x section grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,21rem)_1fr]">
          <Reveal className="lg:sticky lg:top-24">
            <Image
              src={inf.headshot.src}
              alt={inf.alt[locale]}
              width={inf.headshot.width}
              height={inf.headshot.height}
              sizes="(min-width: 1024px) 21rem, (min-width: 640px) 24rem, 100vw"
              className="w-full max-w-sm rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
            />
            <dl className="mt-7 max-w-sm divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              <div className="flex items-baseline gap-4 py-3">
                <dt className="w-32 flex-none text-[0.85rem] font-extrabold tracking-wide text-[var(--color-teal-ink)]">
                  {t.languagesLabel}
                </dt>
                <dd className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
                  {inf.languagesSpoken[locale]}
                </dd>
              </div>
            </dl>
            <a
              href={inf.card.src}
              target="_blank"
              rel="noopener"
              className="mt-4 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-teal-ink)]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {t.viewCard}
            </a>
          </Reveal>

          <Reveal delay={1}>
            <p className="font-bold text-[var(--color-teal-ink)]">{t.infusionHeading}</p>
            <h2 className="mt-1 font-[var(--font-display)] text-[clamp(1.7rem,3.2vw,2.2rem)] leading-tight text-[var(--color-ink)]">
              {inf.name}, {inf.credentials}
            </h2>
            <p className="mt-2 font-bold text-[var(--color-teal-ink)]">
              {inf.role[locale]} · {inf.motto[locale]}
            </p>
            <div className="mt-6 space-y-4">
              {inf.intro.map((para) => (
                <p key={para.en.slice(0, 40)} className="lead text-[var(--color-body)]">
                  {para[locale]}
                </p>
              ))}
            </div>

            <section className="mt-9">
              <h3 className="text-[1.12rem] font-extrabold text-[var(--color-ink)]">
                {inf.specialty.heading[locale]}
              </h3>
              <ul className="list-plain mt-5 gap-x-8 sm:grid-cols-2">
                {inf.specialty.items.map((item) => (
                  <li key={item.en}>{item[locale]}</li>
                ))}
              </ul>
            </section>

            <section className="mt-9">
              <h3 className="text-[1.12rem] font-extrabold text-[var(--color-ink)]">
                {inf.approach.heading[locale]}
              </h3>
              <ul className="list-plain mt-5 gap-x-8 sm:grid-cols-2">
                {inf.approach.items.map((item) => (
                  <li key={item.en}>{item[locale]}</li>
                ))}
              </ul>
            </section>

            <section className="mt-9">
              <h3 className="text-[1.12rem] font-extrabold text-[var(--color-ink)]">
                {inf.biologics.heading[locale]}
              </h3>
              <div className="prep-table-wrap mt-5">
                <table className="prep-table">
                  <thead>
                    <tr>
                      <th scope="col">{t.biologicsMedication}</th>
                      <th scope="col">{t.biologicsGeneric}</th>
                      <th scope="col">{t.biologicsFor}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inf.biologics.items.map((med) => (
                      <tr key={med.brand}>
                        <td>{med.brand}</td>
                        <td>{med.generic}</td>
                        <td>{med.indication[locale]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[0.92rem] text-[var(--color-muted)]">
                {inf.biologics.note[locale]}
              </p>
            </section>

            <Quote text={inf.quote[locale]} />
          </Reveal>
        </div>
      </section>

      {/* Office team */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section grid items-center gap-x-14 gap-y-8 lg:grid-cols-[1fr_1.1fr]">
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
