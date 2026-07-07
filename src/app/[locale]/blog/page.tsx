import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, site, type Locale } from "@/lib/site";
import { blogPosts, formatPosted } from "@/lib/content/blog";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight, MessageSquare } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return pageMetadata(locale, "/blog", dict.meta.blog.title, dict.meta.blog.description);
}

export default async function BlogPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.blog;
  const [latest, ...rest] = blogPosts;

  return (
    <>
      <PageHero title={t.title} lead={t.intro} />

      {/* Latest post, featured. */}
      <section className="section-sm">
        <div className="container-x">
          <Reveal>
            <Link
              href={localePath(locale, `/blog/${latest.slug}`)}
              className="card group block p-7 transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-1 sm:p-9"
            >
              <p className="text-[0.92rem] font-bold text-[var(--color-muted)]">
                {t.postedLabel}: {formatPosted(latest.posted, locale)}
              </p>
              <h2 className="h2 mt-2 font-[var(--font-display)] text-[var(--color-ink)]">
                {latest.title[locale]}
              </h2>
              <p className="measure mt-3 text-[var(--color-body)]">{latest.teaser[locale]}</p>
              <span className="link-line mt-5 inline-flex">
                {t.readPost} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* The rest, as a hairline-divided article list. */}
      <section className="section-sm">
        <div className="container-x">
          <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {rest.map((post) => (
              <li key={post.slug}>
                <Link
                  href={localePath(locale, `/blog/${post.slug}`)}
                  className="group grid gap-x-10 gap-y-1.5 py-6 transition-colors sm:grid-cols-[11rem_1fr] sm:py-7"
                >
                  <p className="text-[0.92rem] font-bold text-[var(--color-muted)]">
                    {formatPosted(post.posted, locale)}
                  </p>
                  <div>
                    <h2 className="font-[var(--font-display)] text-[1.35rem] leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-teal-ink)]">
                      {post.title[locale]}
                    </h2>
                    <p className="measure mt-1.5 text-[0.98rem] text-[var(--color-body)]">
                      {post.teaser[locale]}
                    </p>
                    <span className="link-line mt-3 inline-flex text-[0.95rem]">
                      {t.readPost} <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-8 flex flex-wrap items-center gap-2 text-[0.95rem] text-[var(--color-muted)]">
            <MessageSquare className="h-4 w-4 flex-none text-[var(--color-teal-ink)]" />
            {t.archiveNote}{" "}
            <a href={site.textLine.href} className="link-plain">
              {dict.common.textUs}
            </a>
          </p>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
