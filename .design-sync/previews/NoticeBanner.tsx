/* The "accepting new patients" notice: a dismissible in-flow banner shown
   once per visitor site-wide. Never a full-screen modal. */
import { NoticeBanner, previewLocale } from "westchase-gi";
export function Default() {
  return (
    <NoticeBanner
      locale={previewLocale}
      headline="Accepting new patients"
      body="Most new-patient visits are scheduled within two weeks at both offices."
      cta="Request an appointment"
      ctaHref="/request-an-appointment"
      dismissLabel="Dismiss this notice"
    />
  );
}
