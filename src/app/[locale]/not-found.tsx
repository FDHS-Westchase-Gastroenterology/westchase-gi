"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/site";

export default function NotFound() {
  const pathname = usePathname() || "/en";
  const seg = pathname.split("/")[1] ?? "";
  const locale: Locale = isLocale(seg) ? seg : "en";
  const dict = getDictionary(locale);
  const t = dict.notFound;

  return (
    <section className="section">
      <div className="container-tight text-center">
        <p className="font-[var(--font-display)] text-[5rem] leading-none text-[var(--color-teal)]">404</p>
        <h1 className="h1 mt-4">{t.title}</h1>
        <p className="mt-4 text-[var(--color-body)]">{t.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={localePath(locale, "/")} className="btn btn-navy">
            {t.homeCta}
          </Link>
          <Link href={localePath(locale, "/contact")} className="btn btn-outline">
            {t.contactCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
