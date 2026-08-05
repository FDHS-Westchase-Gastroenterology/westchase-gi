// The Day Sheet's one workhorse family. Public Sans grew out of the
// USWDS paperwork tradition — the ledger world's native modern face —
// and carries the Vietnamese diacritics the queue's names need.
import { Public_Sans } from "next/font/google";

export const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});
