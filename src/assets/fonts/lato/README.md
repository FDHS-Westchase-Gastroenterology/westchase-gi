# Portal Lato fonts

Lato 2.015 by Łukasz Dziedzic, licensed under the included SIL Open Font License 1.1.

Source: [Google Fonts, pinned revision](https://github.com/google/fonts/tree/5d3b76120a319730fda218cc7410174a462b32cb/ofl/lato).

The Regular (400), Medium (500), SemiBold (600), and Bold (700) files were converted
from the upstream TTF files to WOFF2 with FontTools, retaining Latin and extended Latin,
combining accents, punctuation, currency signs, arrows and common math symbols. Retained
glyphs and their metrics are unchanged; all layout features are retained. Each file's OS/2
weight was checked. These subsets are for the English-language staff portal.

`src/lib/portal-fonts.ts` loads these files for the staff portal. The Next.js Google Lato
loader exposes only 100, 300, 400, 700 and 900, so it cannot supply the real intermediate
weights in the selected Figma treatment. Patient-site fonts use their existing loader.
