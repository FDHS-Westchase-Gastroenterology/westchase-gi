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

      <div className="mt-8 space-y-6">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-mint)] p-6 sm:p-8">
          <h2 className={SECTION_HEADING}>Portal tour</h2>
          <p className={SECTION_BODY}>
            Reopen the short introduction to Home, Appointment requests, and
            Settings whenever a refresher would help. This takes you back to
            Home, where you can choose when to start it.
          </p>
          <form action={restartPortalTourAction} className="mt-4">
            <button type="submit" className="btn btn-navy btn-sm min-h-11">
              Show the portal tour again
            </button>
          </form>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
          <h2 className={SECTION_HEADING}>What the appointment request queue is</h2>
          <p className={SECTION_BODY}>
            When a patient fills out the appointment form on the website —
            in any of the five languages — their appointment request is
            saved instantly
            to the practice&apos;s own secure database and appears on the{" "}
            <Link href="/admin/requests" className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
              Appointment requests
            </Link>{" "}
            page. Nothing depends on anyone watching an email inbox: even if
            every notification email went missing, the request would still
            be sitting safely in the queue. That is the whole point of this
            system — the practice can never lose one again. These are
            callback leads, not booked appointments: someone still calls
            the patient to schedule.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
          <h2 className={SECTION_HEADING}>Triaging appointment requests and statuses</h2>
          <p className={SECTION_BODY}>
            Open an appointment request to see everything the patient
            submitted: name,
            phone, email, preferred office and time, and their brief reason
            for the visit. Work it by phone, then move it through the four
            statuses with one click: <strong>New</strong> means nobody has
            handled it yet; <strong>Contacted</strong> means you reached out
            (or tried); <strong>Scheduled</strong> means the appointment is
            booked in the scheduling system; <strong>Closed</strong> means
            the request needs no more work. The status filters on the queue
            page make it easy to see exactly what still needs attention —
            keeping the New list at zero is the daily goal.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
          <h2 className={SECTION_HEADING}>Notes</h2>
          <p className={SECTION_BODY}>
            Every appointment request has a notes section. Write what
            happened —
            &ldquo;left a voicemail at 2:15, will try again tomorrow&rdquo;
            — so a colleague can pick up exactly where you left off. Notes
            are stamped with your name and time automatically. Please keep
            medical details out of notes; clinical conversation belongs on
            the phone and in the medical record, not here.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
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

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
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
            administrator learning or choosing the new password. Every
            access change is recorded in the{" "}
            <Link href="/admin/audit" className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
              activity log
            </Link>{" "}
            (the Activity log link at the bottom of every page), so there
            is always a clear record of who did what.
          </p>
        </div>

        <div
          id="website-changes"
          className="scroll-mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8"
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

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
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

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-8">
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
