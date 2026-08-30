/* Full weekly schedule with the confirmed hours for each office. */
import { HoursTable, previewDict, previewLocale } from "westchase-gi";
export function Default() {
  return <HoursTable locale={previewLocale} dict={previewDict} />;
}
