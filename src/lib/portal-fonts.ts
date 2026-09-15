import { Trocchi } from "next/font/google";
import localFont from "next/font/local";

// Real Medium and SemiBold faces are needed for the selected portal typography.
// The Google Lato loader omits them; patient-site loading stays separate.
const lato = localFont({
  variable: "--font-lato",
  display: "swap",
  src: [
    { path: "../assets/fonts/lato/Lato-Regular.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/lato/Lato-Medium.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/lato/Lato-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/lato/Lato-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const trocchi = Trocchi({
  variable: "--font-trocchi",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const portalFontVariables = [lato.variable, trocchi.variable].join(" ");
