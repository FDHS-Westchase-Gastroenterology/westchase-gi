import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { localePath, locales, site, type Locale } from "@/lib/site";
import { blogPosts, formatPosted, getPost } from "@/lib/content/blog";
import { ArticleBody } from "@/components/ArticleBody";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { TextBand } from "@/components/TextBand";
import { ArrowRight } from "@/components/icons";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => blogPosts.map((post) => ({ locale, slug: post.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const post = getPost(slug);
  if (!post) return {};
  return pageMetadata(locale, `/blog/${post.slug}`, post.title[locale], post.teaser[locale]);
}

/** BlogPosting entity so the article carries its publication date in search. */
function PostSchema({ slug }: { slug: string }) {
  const post = getPost(slug);
  if (!post) return null;
  const json = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.en,
    datePublished: post.posted,
    inLanguage: ["en", "es"],
    author: { "@type": "MedicalClinic", name: site.name, url: site.url },
    publisher: { "@type": "MedicalClinic", name: site.name, url: site.url },
    mainEntityOfPage: `${site.url}/en/blog/${post.slug}`,
  };
  return <JsonLd data={json} />;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.blog;
  const post = getPost(slug);
  if (!post) notFound();

  const more = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <PostSchema slug={post.slug} />

      <section className="border-b border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-tight section-sm">
          <Link href={localePath(locale, "/blog")} className="link-line text-[0.95rem]">
            <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t.backToBlog}
          </Link>
          <h1 className="h1 heading-tick mt-6">{post.title[locale]}</h1>
          <p className="mt-4 text-[0.95rem] font-bold text-[var(--color-muted)]">
            {t.postedLabel}: {formatPosted(post.posted, locale)}
          </p>
        </div>
      </section>

      <article className="section-sm">
        <div className="container-tight">
          <ArticleBody sections={post.sections} locale={locale} />
        </div>
      </article>

      {/* Keep reading */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-mint)]">
        <div className="container-x section-sm">
          <Reveal>
            <h2 className="h3 font-[var(--font-display)]">{t.moreHeading}</h2>
          </Reveal>
          <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <li key={p.slug}>
                <Link href={localePath(locale, `/blog/${p.slug}`)} className="group block">
                  <p className="text-[0.88rem] font-bold text-[var(--color-muted)]">
                    {formatPosted(p.posted, locale)}
                  </p>
                  <h3 className="mt-1 font-[var(--font-display)] text-[1.15rem] leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-teal-ink)]">
                    {p.title[locale]}
                  </h3>
                  <span className="link-line mt-2 inline-flex text-[0.92rem]">
                    {t.readPost} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TextBand locale={locale} dict={dict} />
    </>
  );
}
