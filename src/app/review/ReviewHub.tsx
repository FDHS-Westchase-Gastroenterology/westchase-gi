"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { site, locales, type Locale } from "@/lib/site";
import { ExternalLink, Facebook, Globe, MessageSquare, Phone, Star } from "@/components/icons";

// The hub speaks every language the practice serves, on one URL, without a
// page reload — the QR is printed once and never has to change. Strings are
// deliberately local to this file: the page must work standalone even before
// (or after) the main site's locale set changes.

type HubLang = "en" | "es" | "vi" | "ko" | "ar";

const LANGS: Array<{ code: HubLang; native: string }> = [
  { code: "en", native: "English" },
  { code: "es", native: "Español" },
  { code: "vi", native: "Tiếng Việt" },
  { code: "ko", native: "한국어" },
  { code: "ar", native: "العربية" },
];

type Strings = {
  heading: string;
  sub: string;
  google: string;
  googleHint: string;
  facebook: string;
  facebookHint: string;
  comingSoon: string;
  moreHeading: string;
  website: string;
  call: string;
  text: string;
  languageLabel: string;
  locations: string;
};

const STRINGS: Record<HubLang, Strings> = {
  en: {
    heading: "How was your visit?",
    sub: "Your review helps neighbors find trusted digestive care. It takes about a minute.",
    google: "Review us on Google",
    googleHint: "Opens the Google review form",
    facebook: "Review us on Facebook",
    facebookHint: "Opens the Reviews tab of our Facebook page",
    comingSoon: "Coming soon",
    moreHeading: "More from our practice",
    website: "Visit our website",
    call: "Call the office",
    text: "Text us",
    languageLabel: "Language",
    locations: "Tampa & Lutz, Florida",
  },
  es: {
    heading: "¿Cómo fue su visita?",
    sub: "Su reseña ayuda a otros pacientes a encontrar atención digestiva de confianza. Toma alrededor de un minuto.",
    google: "Escríbanos una reseña en Google",
    googleHint: "Abre el formulario de reseñas de Google",
    facebook: "Escríbanos una reseña en Facebook",
    facebookHint: "Abre la pestaña de reseñas de nuestra página de Facebook",
    comingSoon: "Próximamente",
    moreHeading: "Más de nuestra práctica",
    website: "Visite nuestro sitio web",
    call: "Llame a la oficina",
    text: "Envíenos un texto",
    languageLabel: "Idioma",
    locations: "Tampa y Lutz, Florida",
  },
  vi: {
    heading: "Buổi khám của quý vị thế nào?",
    sub: "Đánh giá của quý vị giúp mọi người tìm được dịch vụ chăm sóc tiêu hóa đáng tin cậy. Chỉ mất khoảng một phút.",
    google: "Đánh giá chúng tôi trên Google",
    googleHint: "Mở biểu mẫu đánh giá của Google",
    facebook: "Đánh giá chúng tôi trên Facebook",
    facebookHint: "Mở mục đánh giá trên trang Facebook của phòng khám",
    comingSoon: "Sắp ra mắt",
    moreHeading: "Thông tin thêm từ phòng khám",
    website: "Truy cập trang web",
    call: "Gọi văn phòng",
    text: "Nhắn tin văn phòng",
    languageLabel: "Ngôn ngữ",
    locations: "Tampa và Lutz, Florida",
  },
  ko: {
    heading: "진료는 어떠셨나요?",
    sub: "남겨주신 후기는 다른 분들이 믿을 수 있는 소화기 진료를 찾는 데 큰 도움이 됩니다. 1분이면 충분합니다.",
    google: "Google에 후기 남기기",
    googleHint: "Google 후기 작성 화면이 열립니다",
    facebook: "Facebook에 후기 남기기",
    facebookHint: "저희 Facebook 페이지의 후기 탭이 열립니다",
    comingSoon: "준비 중",
    moreHeading: "병원 안내",
    website: "웹사이트 방문",
    call: "전화 문의",
    text: "문자 보내기",
    languageLabel: "언어",
    locations: "플로리다 탬파 · 러츠",
  },
  ar: {
    heading: "كيف كانت زيارتكم؟",
    sub: "تقييمكم يساعد الآخرين في العثور على رعاية موثوقة للجهاز الهضمي، ولا يستغرق سوى دقيقة واحدة.",
    google: "قيِّمونا على Google",
    googleHint: "يفتح نموذج التقييم في Google",
    facebook: "قيِّمونا على Facebook",
    facebookHint: "يفتح تبويب التقييمات في صفحتنا على فيسبوك",
    comingSoon: "قريبًا",
    moreHeading: "المزيد من عيادتنا",
    website: "زوروا موقعنا الإلكتروني",
    call: "اتصلوا بالعيادة",
    text: "راسلونا نصيًا",
    languageLabel: "اللغة",
    locations: "تامبا ولوتز، فلوريدا",
  },
};

/** Deep-link into the main site only for locales it actually serves. */
function siteHref(lang: HubLang): string {
  return (locales as string[]).includes(lang) ? `/${lang as Locale}` : "/en";
}

// Site-footer entries carry ?lang= so the hub opens in the visitor's language,
// while the printed-QR path (no param) stays fully static. Read via
// useSyncExternalStore: the server snapshot is null, and React reconciles the
// client value at hydration without a mismatch. The URL never changes within
// a page load, so the subscription is a no-op.
const subscribeNever = () => () => {};
function readLangParam(): HubLang | null {
  const param = new URLSearchParams(window.location.search).get("lang");
  return param && param in STRINGS ? (param as HubLang) : null;
}

export function ReviewHub() {
  const urlLang = useSyncExternalStore(subscribeNever, readLangParam, () => null);
  const [picked, setPicked] = useState<HubLang | null>(null);
  const lang = picked ?? urlLang ?? "en";
  const t = STRINGS[lang];

  return (
    <main
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="review-rise mx-auto flex min-h-svh w-full max-w-[27rem] flex-col px-5 pb-10 pt-9"
    >
      {/* Identity: the FDHS lockup, then the practice name in its own type. */}
      <header className="flex flex-col items-center text-center">
        <Image
          src="/images/brand/header-logo-fdhs.webp"
          alt="Florida Digestive Health Specialists"
          width={300}
          height={146}
          priority
          className="h-16 w-auto"
        />
        <p className="mt-3 font-[var(--font-display)] text-[1.35rem] leading-tight text-[var(--color-navy)]">
          Westchase Gastroenterology
        </p>
      </header>

      {/* Language pills. Each pill is typeset in its own script. */}
      <nav aria-label={t.languageLabel} className="mt-6 flex flex-wrap justify-center gap-2">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={lang === l.code}
            onClick={() => setPicked(l.code)}
            className={`rounded-full px-3.5 py-1.5 text-[0.9rem] font-bold transition-colors ${
              lang === l.code
                ? "bg-[var(--color-navy)] text-[var(--color-on-dark)]"
                : "bg-white text-[var(--color-body)] shadow-[inset_0_0_0_1.5px_var(--color-line-2)] hover:bg-[var(--color-mint)]"
            }`}
          >
            {l.native}
          </button>
        ))}
      </nav>

      <h1 className="mt-8 text-center text-[1.9rem] leading-[1.15]">{t.heading}</h1>
      <p className="mx-auto mt-3 max-w-[36ch] text-center text-[1.02rem] text-[var(--color-muted)]">
        {t.sub}
      </p>

      {/* Live, verified review destinations only. Facebook went live
          2026-07-08 (page + public Reviews tab verified). Yelp stays held:
          its listing still carries the practice's former name (held, never
          faked — it joins the moment the practice claims/renames it). */}
      <div className="mt-7 grid gap-3">
        <a
          href={site.links.googleReview}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-amber btn-lg w-full"
          title={t.googleHint}
        >
          <Star className="h-5 w-5" />
          {t.google}
        </a>

        <a
          href={site.links.facebookReviews}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-navy btn-lg w-full"
          title={t.facebookHint}
        >
          <Facebook className="h-5 w-5" />
          {t.facebook}
        </a>

        <div className="card-lined flex items-center justify-between gap-3 px-5 py-3.5 opacity-80">
          <span className="font-bold text-[var(--color-muted)]">Yelp</span>
          <span className="rounded-full bg-[var(--color-mint-2)] px-2.5 py-1 text-[0.78rem] font-bold text-[var(--color-teal-ink)]">
            {t.comingSoon}
          </span>
        </div>
      </div>

      <p className="mt-9 text-center text-[0.82rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {t.moreHeading}
      </p>

      <div className="mt-3 grid gap-3">
        <a href={siteHref(lang)} className="btn btn-outline w-full bg-white">
          <Globe className="h-4.5 w-4.5 text-[var(--color-teal-ink)]" />
          {t.website}
          <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted)]" />
        </a>
        <a href={site.phone.href} className="btn btn-outline w-full bg-white">
          <Phone className="h-4.5 w-4.5 text-[var(--color-teal-ink)]" />
          {t.call}
          <span dir="ltr" className="whitespace-nowrap font-normal text-[var(--color-muted)]">
            {site.phone.display}
          </span>
        </a>
        <a href={site.textLine.href} className="btn btn-outline w-full bg-white">
          <MessageSquare className="h-4.5 w-4.5 text-[var(--color-teal-ink)]" />
          {t.text}
          <span dir="ltr" className="whitespace-nowrap font-normal text-[var(--color-muted)]">
            {site.textLine.display}
          </span>
        </a>
      </div>

      <footer className="mt-auto pt-10 text-center text-[0.85rem] text-[var(--color-muted)]">
        <p className="font-bold text-[var(--color-body)]">{site.name}</p>
        <p className="mt-0.5">{t.locations}</p>
        <p className="mt-0.5">{site.network}</p>
      </footer>
    </main>
  );
}
