import Link from "next/link";

import { startTourAction } from "@/app/admin/(portal)/tour-actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { requireRole } from "@/lib/portal/auth";
import { toursForRole } from "@/lib/portal/contracts";
import type { StaffRole, StaffTour } from "@/lib/portal/contracts";
import { HELP_SHORTCUTS, spokenKeys } from "@/lib/portal/schedule-shortcut-list";
import { TOUR_LABELS, TOUR_SUMMARIES } from "@/lib/portal/tours";
import { WEBSITE_CHANGE_HREF } from "@/lib/portal/website-custody";
import { site } from "@/lib/site";

import { HelpContent } from "./help-content";

/* Help (issue #358, Figma U4): the topics, grouped by task, with three
   cards beside them. The page is open to every signed-in account; the
   Practice settings group and the admin tour are an admin's. The topics
   are the client's, for search and for opening one in place; the cards
   are rendered here, where the role is known. */

function TourCard({ role }: Readonly<{ role: StaffRole }>) {
  const tours = toursForRole(role);
  const both = tours.length > 1;
  return (
    <section className="wgi-help-tour" aria-labelledby="help-tour-heading" data-testid="help-tour">
      <p className="wgi-help-eyebrow">New to the portal</p>
      <h2 id="help-tour-heading" className="wgi-help-tour-title">
        Take the two-minute tour
      </h2>
      <p className="wgi-help-tour-body">
        Four tips for your role, shown where you work. Leave at any point and pick it up here.
      </p>
      <div className="wgi-help-tour-starts">
        {tours.map((tour: StaffTour, place) => (
          <form key={tour} action={startTourAction.bind(null, tour)}>
            <button
              type="submit"
              data-slot="button"
              data-testid={`help-start-${tour}`}
              data-tone={place === 0 ? "primary" : "quiet"}
              aria-describedby={both ? `help-tour-${tour}` : undefined}
              className={buttonVariants({
                variant: place === 0 ? "outline" : "ghost-light",
                size: "sm",
              })}
            >
              {both ? `Start the ${TOUR_LABELS[tour].toLowerCase()}` : "Start the tour"}
            </button>
            {both ? (
              <p id={`help-tour-${tour}`} className="wgi-help-tour-summary">
                {TOUR_SUMMARIES[tour]}
              </p>
            ) : null}
          </form>
        ))}
      </div>
    </section>
  );
}

function SomethingWrongCard() {
  return (
    <section
      id="something-wrong"
      className="wgi-help-card"
      aria-labelledby="website-changes"
      data-testid="help-something-wrong"
    >
      <h2 id="website-changes" className="wgi-help-card-title">
        If something looks wrong
      </h2>
      <p>
        A request missing from Home, a wrong office hour on the website, or an email that stopped
        arriving: tell the website maintainer and include what you expected to see.
      </p>
      <p>
        If the portal will not load, call or text the office line first: {site.phone.display} or
        text {site.textLine.display}.
      </p>
      <Link href={WEBSITE_CHANGE_HREF} className="wgi-help-link" data-testid="help-website-change">
        Request a website change ›
      </Link>
    </section>
  );
}

function KeyboardCard() {
  return (
    <section className="wgi-help-card" aria-labelledby="help-keys-heading">
      <h2 id="help-keys-heading" className="wgi-help-card-title">
        Keyboard
      </h2>
      <dl className="wgi-help-keys">
        {HELP_SHORTCUTS.map((shortcut) => (
          <div key={shortcut.help}>
            <dt>
              <KbdGroup aria-hidden="true">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
              <span className="sr-only">{spokenKeys(shortcut.keys)}</span>
            </dt>
            <dd>{shortcut.help}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function AdminHelpPage() {
  const session = await requireRole("staff");
  return (
    <HelpContent role={session.role}>
      <TourCard role={session.role} />
      <SomethingWrongCard />
      <KeyboardCard />
    </HelpContent>
  );
}
