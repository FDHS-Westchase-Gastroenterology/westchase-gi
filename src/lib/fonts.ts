// Site-wide font loading, one module for every locale's scripts.
//
// EN/ES keep the practice's own pairing (Lato body / Trocchi display).
// The other locales pair on the same serif-display + sans-body axis with
// families that actually cover their scripts (Trocchi/Lato have no
// Vietnamese, Hangul, or Arabic coverage):
//   vi — Aleo (slab serif, vietnamese subset) + Be Vietnam Pro
//   ko — Noto Serif KR + Noto Sans KR (unicode-range sliced by next/font)
//   ar — Noto Naskh Arabic + Noto Sans Arabic
// The CSS side lives in globals.css: `:lang()` blocks remap --font-display /
// --font-body, so components never reference a family directly.

import {
  Aleo,
  Be_Vietnam_Pro,
  Lato,
  Noto_Naskh_Arabic,
  Noto_Sans_Arabic,
  Noto_Sans_KR,
  Noto_Serif_KR,
  Trocchi,
} from "next/font/google";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const trocchi = Trocchi({
  variable: "--font-trocchi",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});

const aleo = Aleo({
  variable: "--font-aleo",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  display: "swap",
  preload: false,
});

// CJK + Arabic families ship as unicode-range slices; browsers fetch only
// the ranges a page uses, so loading them unconditionally is cheap. preload
// stays off to keep the EN/ES critical path unchanged.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-ar",
  subsets: ["arabic"],
  display: "swap",
  preload: false,
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh-ar",
  subsets: ["arabic"],
  display: "swap",
  preload: false,
});

/** Every font variable, applied on <html> so :lang() scopes can remap. */
export const fontVariables = [
  lato.variable,
  trocchi.variable,
  beVietnamPro.variable,
  aleo.variable,
  notoSansKr.variable,
  notoSerifKr.variable,
  notoSansArabic.variable,
  notoNaskhArabic.variable,
].join(" ");
