import Link from "next/link";
import { requireRole } from "@/lib/portal/auth";
import { site } from "@/lib/site";
import { restartPortalTourAction } from "../tour-actions";

// Plain-language operations guide for the front desk (VAL-ADMIN-012:
// authenticated, substantive, >= 400 words, no engineering jargon).

const SECTION_HEADING =
  "text-[1.05rem] font-black text-[var(--color-ink)]";
const SECTION_BODY =
  "mt-2 max-w-[70ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]";

// One protected read renders one linear, static operations guide. Extracting
// prose-only sections into components would add indirection without isolating
// state, data access, or reusable behavior.
// react-doctor-disable-next-line react-doctor/no-giant-component
export default async function AdminHelpPage() {
  await requireRole("staff");

  return (
    <section aria-labelledby="help-heading">
      <h1 id="help-heading" className="portal-title">
        Help
      </h1>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
        How this portal works, in plain language. Five minutes here covers
        everything.
      </p>

      <div className="portal-help mt-8">
        <div className="portal-help-section portal-help-tour">
          <h2 className={SECTION_HEADING}>Portal tour</h2>
          <p className={SECTION_BODY}>
            Reopen the short introduction to Home, Appointments, and
            Settings whenever a refresher would help. This takes you back to
            Home, where you can choose when to start it.
          </p>
          <form action={restartPortalTourAction} className="mt-4">
            <button type="submit" className="btn btn-navy btn-sm min-h-11">
              Show the portal tour again
            </button>
          </form>
        </div>

        <div className="portal-help-section">
          <h2 className={SECTION_HEADING}>What the appointment request queue is</h2>
          <p className={SECTION_BODY}>
            When a patient fills out the appointment form on the website —
            in any of the five languages — their appointment request is
            saved instantly
            to the practice&apos;s own secure database and appears on the{" "}
            <Link href="/admin/requests" className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
              Appointments
            </Link>{" "}
            page. Nothing depends on anyone watching an email inbox: even if
            every notification email went missing, the request would still
            be sitting safely in the queue. That is the whole point of this
            system — the practice can never lose one again. These are
            appointment requests, not booked appointments: someone still calls
            the patient to schedule.
          </p>
        </div>

        <div
          id="appointment-workflow-guide"
          className="portal-help-section scroll-mt-20"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={SECTION_HEADING}>Work an appointment request</h2>
              <p className={SECTION_BODY}>
                A two-minute guide to recording what happened on a call and
                leaving the queue ready for whoever works it next.
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-amber-soft)] px-3 py-1 text-[0.78rem] font-bold text-[var(--portal-attention-ink)]">
              2-minute guide
            </span>
          </div>

          <h3 className="mt-7 text-[1rem] font-black text-[var(--color-ink)]">
            What do the statuses mean?
          </h3>
          <p className="mt-2 max-w-[70ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            You never pick a status directly. You record what happened on the
            call, and the portal moves the request to the right place. Here is
            how to read the words you will see in the queue:
          </p>
          <dl className="mt-3 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            <div className="grid gap-1.5 py-4 sm:grid-cols-[8rem_1fr] sm:gap-5">
              <dt>
                <span className="inline-flex rounded-full bg-[var(--color-mint-2)] px-3 py-1 text-[0.82rem] font-black text-[var(--color-ink)]">
                  Contacted
                </span>
              </dt>
              <dd className="text-[0.94rem] leading-relaxed text-[var(--color-body)]">
                Someone has called the patient at least once — reached them,
                left a voicemail, or got no answer. If another call is needed,
                the request carries a call-again time so the queue brings it
                back at the right moment.
              </dd>
            </div>
            <div className="grid gap-1.5 py-4 sm:grid-cols-[8rem_1fr] sm:gap-5">
              <dt>
                <span className="inline-flex rounded-full bg-[var(--color-amber-soft)] px-3 py-1 text-[0.82rem] font-black text-[var(--color-ink)]">
                  Scheduled
                </span>
              </dt>
              <dd className="text-[0.94rem] leading-relaxed text-[var(--color-body)]">
                An appointment was booked in the practice scheduling system.
                The request stays visible so the team can still find it.
              </dd>
            </div>
            <div className="grid gap-1.5 py-4 sm:grid-cols-[8rem_1fr] sm:gap-5">
              <dt>
                <span className="inline-flex rounded-full bg-[var(--color-navy)] px-3 py-1 text-[0.82rem] font-black text-white">
                  Closed
                </span>
              </dt>
              <dd className="text-[0.94rem] leading-relaxed text-[var(--color-body)]">
                No appointment is coming — the patient won&apos;t schedule, or
                the request was a duplicate or not actionable. Nobody needs to
                work it again unless it is reopened.
              </dd>
            </div>
          </dl>

          <h3 className="mt-8 text-[1rem] font-black text-[var(--color-ink)]">
            Work the queue in four steps
          </h3>
          <ol className="mt-4 space-y-5">
            {[
              [
                "Start at the top",
                "The queue puts new requests and due call-agains first, then older requests without a call-again time.",
              ],
              [
                "Record what happened",
                "Answer the panel's one question. Pick the outcome you just lived — reached the patient, left a voicemail, no answer, appointment booked, or no appointment coming. The portal asks only for the details that outcome needs, like when to call again, and sets the status itself.",
              ],
              [
                "Add a note when the next person needs context",
                "Use appointment request notes to pass along what matters. Keep medical details in the clinical record, not the portal.",
              ],
              [
                "Save and Undo",
                "Choose Save. For 15 minutes afterward, Undo restores the request exactly as it was — status, call-again time, and closed details included.",
              ],
            ].map(([title, body], index) => (
              <li
                key={title}
                className="grid grid-cols-[2rem_1fr] gap-3 border-b border-[var(--color-line)] pb-5 last:border-0 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-mint-2)] text-[0.82rem] font-black text-[var(--color-navy)]"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-black text-[var(--color-ink)]">{title}</p>
                  <p className="mt-1 text-[0.92rem] leading-relaxed text-[var(--color-body)]">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-8 text-[1rem] font-black text-[var(--color-ink)]">
            Appointment request notes stay together
          </h3>
          <p className="mt-2 max-w-[70ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            Every request has one{" "}
            <strong>Appointment request notes</strong> section. Add notes
            there whenever the next staff member needs context. The newest
            note appears first with the staff member&apos;s name and time.
          </p>
          <p className="mt-3 max-w-[70ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            Keep medical details in the clinical record, not the portal.
            Calls and status changes are saved separately and appear under{" "}
            <strong>Request history</strong>, so they never hide or rename
            the notes staff are looking for.
          </p>

          <div className="mt-7 bg-[var(--color-mint)] px-4 py-4 sm:px-5">
            <p className="font-black text-[var(--color-ink)]">
              Need to correct something?
            </p>
            <p className="mt-1 text-[0.92rem] leading-relaxed text-[var(--color-body)]">
              A Scheduled or Closed request can be reopened for more work — it
              returns to Contacted so the next call gets planned. Earlier notes
              remain under Appointment request notes, and earlier saves remain
              under Request history.
            </p>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-[var(--color-body)]">
              Some older closed requests from the previous system show a{" "}
              <strong>Needs review</strong> tag. Open one and record whether an
              appointment was ever booked — that finishes its record.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/admin/requests"
              className="btn btn-amber btn-sm min-h-11"
            >
              Open Appointments
            </Link>
            <Link
              href="/admin"
              className="min-h-11 py-3 text-[0.9rem] font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
            >
              Return to Home
            </Link>
          </div>
        </div>

        <div className="portal-help-section">
          <h2 className={SECTION_HEADING}>Notification emails</h2>
          <p className={SECTION_BODY}>
            The addresses listed under{" "}
            <Link href="/admin/settings" className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
              Settings
            </Link>{" "}
            get a short email whenever a new appointment request arrives.
            The email deliberately contains no patient information — just a
            notice that a request is waiting and a link back here — so
            nothing sensitive ever sits in an inbox.
            Anyone on staff can pause a recipient (going on vacation, for
            example); adding or removing addresses is an administrator task.
            Remember: notifications are a convenience. The queue is the
            system of record.
          </p>
        </div>

        <div className="portal-help-section">
          <h2 className={SECTION_HEADING}>Staff access</h2>
          <p className={SECTION_BODY}>
            Administrators can invite a new staff member from the Settings
            page: enter their email, name, and role, and the portal emails a
            one-time setup link so they can choose their own password. If
            delivery fails, Settings shows the same one-time link for secure
            handoff. Pending invitations can be deactivated just like active
            accounts; the link stops working and the person is removed from
            the default staff list immediately. Active staff who forget a
            password can request a reset from the sign-in page without an
            administrator learning or choosing the new password. If a reset
            email does not arrive, confirm the expected email and active
            status here in Settings, ask the staff member to check Inbox and
            Spam or Junk, confirm the link is less than one hour old, and have
            them resend from the public recovery screen after its cooldown.
            An authorized operator can then check Supabase Auth and SMTP
            delivery evidence. Never ask for the password, one-time link, or
            copied email content. Every access change is recorded in the{" "}
            <Link href="/admin/audit" className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
              activity log
            </Link>{" "}
            (the Activity log link at the bottom of every page), so there
            is always a clear record of who did what.
          </p>
        </div>

        <div
          id="website-changes"
          className="portal-help-section scroll-mt-6"
        >
          <h2 className={SECTION_HEADING}>Getting website changes made</h2>
          <p className={SECTION_BODY}>
            Today, changes to the public website — new hours, a provider
            update, a new document — go through the practice&apos;s website
            maintainer: email the request and it is typically live within a
            day. The{" "}
            <Link href="/admin/settings/software" className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
              Website
            </Link>{" "}
            page under Settings records clinic custody, the canonical
            repository, and the live GitHub connection status.
          </p>
        </div>

        <div className="portal-help-section">
          <h2 className={SECTION_HEADING}>
            How the website systems fit together
          </h2>
          <p className={SECTION_BODY}>
            This is optional background. You do not need to open or manage
            any of these systems to work appointment requests in the portal.
          </p>
          <details className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 open:pb-5">
            <summary className="min-h-11 cursor-pointer py-2 font-bold text-[var(--color-teal-ink)]">
              Show the systems explainer
            </summary>
            <dl className="mt-3 space-y-4 text-[0.95rem] leading-relaxed text-[var(--color-body)]">
              <div>
                <dt className="font-black text-[var(--color-ink)]">GitHub</dt>
                <dd className="mt-1">
                  Keeps the website files and their change history. The
                  website maintainer works there when the practice requests
                  an update.
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--color-ink)]">Vercel</dt>
                <dd className="mt-1">
                  Publishes those approved website files to the internet and
                  keeps the public site available.
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--color-ink)]">Supabase</dt>
                <dd className="mt-1">
                  Holds the secure appointment-request queue and staff sign-in
                  records used by this portal.
                </dd>
              </div>
              <div>
                <dt className="font-black text-[var(--color-ink)]">Porkbun</dt>
                <dd className="mt-1">
                  Keeps the clinic&apos;s website address registered and points
                  that address to the published site.
                </dd>
              </div>
            </dl>
          </details>
        </div>

        <div
          id="something-wrong"
          className="portal-help-section scroll-mt-6"
        >
          <h2 className={SECTION_HEADING}>If something looks wrong</h2>
          <p className={SECTION_BODY}>
            If the portal will not load or an appointment request seems
            missing, call or
            text the office line first — patients always see the
            call-and-text numbers on the website ({site.phone.display} /
            text {site.textLine.display}), so no one is ever stranded even
            during an outage. Then let the website maintainer know what you
            saw. Sign out when you step away from a shared computer.
          </p>
        </div>
      </div>
    </section>
  );
}
