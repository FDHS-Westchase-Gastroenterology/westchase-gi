/* PageHero is the internal-page opener: mint band, Trocchi display heading
   with the brand tick, optional lead on the reading measure. Text-heavy on
   purpose — this card is where a missing brand webfont would show. */

import { Button, PageHero } from "westchase-gi";

export function Default() {
  return (
    <PageHero
      title="Colonoscopy"
      lead="A screening colonoscopy looks for and removes polyps before they can become cancer. Most patients are in and out in about two hours, and you will not remember the procedure itself."
    />
  );
}

export function TitleOnly() {
  return <PageHero title="Patient forms" />;
}

export function WithAction() {
  return (
    <PageHero
      title="Request an appointment"
      lead="Tell us how to reach you and a member of our team will call to schedule. If this is urgent, please call the office."
    >
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="amber" size="lg">
          Request an appointment
        </Button>
        <Button variant="outline" size="lg">
          Call (813) 855-5555
        </Button>
      </div>
    </PageHero>
  );
}
