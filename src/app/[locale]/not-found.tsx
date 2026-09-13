"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import { getDictionary, isLocale } from "@/lib/i18n";
import { localePath } from "@/lib/site";
import type { Locale } from "@/lib/site";

export default function NotFound() {
  const pathname = usePathname() || "/en";
  const seg = pathname.split("/")[1] ?? "";
  const locale: Locale = isLocale(seg) ? seg : "en";
  const dict = getDictionary(locale);
  const t = dict.notFound;

  return (
    <section className="section">
      <div className="container-tight text-center">
        <p className="text-[5rem] leading-none font-[var(--font-display)] text-[var(--color-teal)]">
          404
        </p>
        <h1 className="h1 mt-4">{t.title}</h1>
        <p className="mt-4 text-[var(--color-body)]">{t.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={localePath(locale, "/")} data-slot="button" className={buttonVariants()}>
            {t.homeCta}
          </Link>
          <Link
            href={localePath(locale, "/contact")}
            data-slot="button"
            className={buttonVariants({ variant: "outline" })}
          >
            {t.contactCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
