/* The staffed text line, given a stage of its own — a full-bleed navy band.
   `dict` is the site's real EN dictionary, re-exported on the bundle as
   previewDict so the card shows the copy the practice actually ships. */

import { TextBand, previewDict, previewLocale } from "westchase-gi";

export function Default() {
  return <TextBand locale={previewLocale} dict={previewDict} />;
}
