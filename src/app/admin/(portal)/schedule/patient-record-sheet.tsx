"use client";

import { cn } from "cn";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import {
  LatestNoteBlock,
  PatientMessage,
} from "@/app/admin/(portal)/(home)/full-record-sheet-body";
import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { LineStatusBadge } from "@/app/admin/(portal)/(home)/parts/badge";
import { phoneParts } from "@/app/admin/(portal)/(home)/record-contact";
import {
  RecordSheetFrame,
  SheetContactRow,
  SheetTitleRow,
} from "@/app/admin/(portal)/(home)/record-sheet-frame";
import { useRecordRead } from "@/app/admin/(portal)/(home)/use-record-read";
import { recordSections } from "@/app/admin/(portal)/requests/record-sections";
import { Calendar, ChevronRight } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PatientVisit } from "@/lib/portal/patients/contracts";

import { PatientRecordFoot } from "./patient-booking-card";
import {
  birthLabel,
  cameToUs,
  dateLabel,
  isToday,
  patientStanding,
  sinceLabel,
  visitDate,
  visitGroups,
  visitWhen,
  visitWith,
  visitWord,
} from "./patient-record-model";
import type { VisitGroups } from "./patient-record-model";
import { readSchedulePatient } from "./week-actions";
import type {
  ScheduleClinicalList,
  SchedulePatientOutcome,
  SchedulePatientRecord,
} from "./week-actions";
import { dayHref } from "./week-calendar";
import { BADGE_PAINT } from "./week-card-model";
import type { RecordHint } from "./week-card-parts";

/* The Schedule's patient record (issue #356; Figma Ypf9ohpRcGWF5C9T9bSvWW,
   section 13, P2): Home's right sheet, undimmed and non-modal, so the
   schedule stays live behind it. The header is the name and the close,
   where the patient stands (today's visit with its badge, the next one,
   or the request they came in with), the phone chip beside the email, and
   the tabs: Request, Visits, Clinical, Documents and Details, Visits first
   when there are any. The tabs sit in the header, above its rule, and only
   the body under it scrolls.

   Visits come in two groups, upcoming soonest first and earlier latest
   first; each is a link that moves the schedule to its day with the record
   still open, today's tinted and offering its place on the schedule. The
   Request tab is the latest request linked to the patient, as Home's sheet
   reads it: the message, the latest note, and how they came to the
   practice with a link to its history. Clinical and Documents list the
   patient's records read-only.

   The name and phone come from what opened the record (the search row or
   the appointment card) until the read lands, so the header is never
   empty. Motion is the sheet's own (home.css `.wgi-sheet`): it slides in
   from the right, its content settles, and the keyboard opens it at once.
   The tabs answer at once. */

type PatientRead = Readonly<{ id: string; outcome: SchedulePatientOutcome }>;

interface PatientReadState {
  readonly outcome: SchedulePatientOutcome | null;
  readonly retry: () => void;
  /** Read again after a change on the record, keeping what is on screen. */
  readonly refresh: () => void;
  /** Bumped by every completed read, so the Request tab reads its request again. */
  readonly reads: number;
}

function usePatientRead(
  shownId: string | null,
  onVisits: (ids: ReadonlySet<string>) => void,
): PatientReadState {
  const [read, setRead] = useState<PatientRead | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reads, setReads] = useState(0);

  useEffect(() => {
    if (shownId === null) return undefined;
    let live = true;
    startTransition(async () => {
      try {
        // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the read is in flight
        const outcome = await readSchedulePatient(shownId);
        if (!live) return;
        setRead({ id: shownId, outcome });
        setReads((count) => count + 1);
        /* The grid outlines the appointments of the record on screen. */
        onVisits(new Set(outcome.ok ? outcome.record.visits.map((visit) => visit.id) : []));
      } catch {
        if (!live) return;
        setRead({ id: shownId, outcome: { ok: false, code: "unavailable" } });
        onVisits(new Set());
      }
    });
    return () => {
      live = false;
    };
  }, [shownId, attempt, onVisits]);

  return {
    outcome: read?.id === shownId ? read.outcome : null,
    retry() {
      setRead(null);
      setAttempt((count) => count + 1);
    },
    refresh() {
      setAttempt((count) => count + 1);
    },
    reads,
  };
}

export function PatientRecordSheet({
  patientId,
  hint,
  instant,
  onOpenChange,
  onClosed,
  onVisits,
  returnFocus,
}: Readonly<{
  /** The patient the address names; null closes the sheet. */
  patientId: string | null;
  /** What opened the record knew the name and phone already. */
  hint: RecordHint | null;
  instant: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  /** The appointments of the patient on screen, which the grid outlines. */
  onVisits: (ids: ReadonlySet<string>) => void;
  returnFocus: () => HTMLElement | null;
}>) {
  /* The id stays while the sheet leaves, so its exit plays on the record it
     showed. */
  const [shownId, setShownId] = useState(patientId);
  if (patientId !== null && patientId !== shownId) setShownId(patientId);
  const { outcome, retry, refresh, reads } = usePatientRead(shownId, onVisits);

  const named = hint?.id === shownId ? hint : null;

  return (
    <RecordSheetFrame
      open={patientId !== null}
      contentKey={shownId}
      instant={instant}
      onOpenChange={onOpenChange}
      onExited={() => {
        setShownId(null);
        onVisits(new Set());
        onClosed();
      }}
      finalFocus={returnFocus}
    >
      {outcome?.ok === true ? (
        <PatientRecordContent record={outcome.record} reads={reads} onChanged={refresh} />
      ) : (
        <PatientRecordWaiting named={named} outcome={outcome} onRetry={retry} />
      )}
    </RecordSheetFrame>
  );
}

/* Before the read lands, or when it failed: what opened the record says
   who it is, and the body says why there is nothing more yet. */
function PatientRecordWaiting({
  named,
  outcome,
  onRetry,
}: Readonly<{
  named: RecordHint | null;
  outcome: SchedulePatientOutcome | null;
  onRetry: () => void;
}>) {
  const phone = phoneParts(named?.phone ?? null);
  return (
    <>
      <header className="wgi-sheet-head">
        <SheetTitleRow name={named?.name ?? "Patient record"} />
        <SheetContactRow
          tel={phone.tel}
          phoneDisplay={phone.phoneDisplay}
          email={undefined}
          loading={outcome === null}
        />
      </header>
      <div className="wgi-sheet-body">
        {outcome === null ? (
          <div className="wgi-sheet-skeleton" role="status">
            <span className="sr-only">Loading the patient record</span>
            <i data-stands-for="section-title" />
            <i data-stands-for="detail-row" />
            <i data-stands-for="detail-row" />
            <i data-stands-for="section-title" />
            <i data-stands-for="detail-row" />
          </div>
        ) : outcome.ok ? null : outcome.code === "not_found" ? (
          <div className="wgi-sheet-state" role="status">
            <p className="wgi-sheet-state-title">This patient is no longer in the portal.</p>
            <p className="wgi-sheet-state-note">
              The record may have been archived since the link was made.
            </p>
          </div>
        ) : (
          <div className="wgi-sheet-state" role="alert">
            <p className="wgi-sheet-state-title">The patient record could not be loaded.</p>
            <p className="wgi-sheet-state-note">Try again in a moment.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

const TABS = ["request", "visits", "clinical", "documents", "details"] as const;
type RecordTab = (typeof TABS)[number];

function PatientRecordContent({
  record,
  reads,
  onChanged,
}: Readonly<{
  record: SchedulePatientRecord;
  reads: number;
  onChanged: () => void;
}>) {
  const { patient, visits, requestLine } = record;
  const groups = useMemo(() => visitGroups(visits), [visits]);
  const [tab, setTab] = useState<RecordTab>(visits.length > 0 ? "visits" : "request");
  const phone = phoneParts(patient.phone);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = TABS.find((name) => name === value);
        if (next !== undefined) setTab(next);
      }}
      className="min-h-0 flex-1 gap-0"
    >
      <header className="wgi-sheet-head wgi-sheet-head-tabbed">
        <SheetTitleRow name={patient.name} />
        <Standing groups={groups} line={requestLine} />
        <SheetContactRow tel={phone.tel} phoneDisplay={phone.phoneDisplay} email={patient.email} />
        <TabsList className="wgi-sheet-tabs" aria-label="Patient record">
          <TabsTrigger value="request">Request</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
      </header>
      <div className="wgi-sheet-body">
        <TabsContent value="request" className="flex flex-col gap-7">
          {requestLine === null ? (
            <p className="wgi-sheet-empty">No request on file for this patient.</p>
          ) : (
            <RequestTab key={reads} line={requestLine} />
          )}
        </TabsContent>
        <TabsContent value="visits">
          <VisitsTab groups={groups} patientId={patient.id} />
        </TabsContent>
        <TabsContent value="clinical">
          <ClinicalTab list={record.notes} noun="clinical notes" />
        </TabsContent>
        <TabsContent value="documents">
          <ClinicalTab list={record.documents} noun="documents" />
        </TabsContent>
        <TabsContent value="details">
          <dl className="wgi-sheet-dl wgi-sheet-dl-flush">
            <dt>Date of birth</dt>
            <dd data-ui-redact="patient-contact">{birthLabel(patient.dateOfBirth)}</dd>
            <dt>Phone</dt>
            <dd data-ui-redact="patient-contact">
              {phone.tel === null ? "Not recorded" : phone.phoneDisplay}
            </dd>
            <dt>Email</dt>
            <dd data-ui-redact="patient-contact">{patient.email ?? "Not recorded"}</dd>
            <dt>In the portal since</dt>
            <dd>{sinceLabel(patient.createdAt)}</dd>
          </dl>
        </TabsContent>
      </div>
      <PatientRecordFoot record={record} onChanged={onChanged} />
    </Tabs>
  );
}

/* Where the patient stands, under the name: today's or the next visit
   with its badge, else the request they came in with as Home's queue
   line, else when they were last seen. */
function Standing({
  groups,
  line,
}: Readonly<{ groups: VisitGroups; line: Readonly<HomeLine> | null }>) {
  const standing = patientStanding(groups, line !== null);
  if (standing.kind === "visit") {
    const { badge } = standing;
    return (
      <p className="wgi-record-queue wgi-sheet-queue">
        <Badge
          variant={badge.variant}
          className={cn("wgi-badge wgi-record-badge", BADGE_PAINT[badge.variant])}
        >
          {badge.label}
        </Badge>
        <span>{standing.text}</span>
      </p>
    );
  }
  if (standing.kind === "request" && line !== null) {
    return (
      <p className="wgi-record-queue wgi-sheet-queue">
        <LineStatusBadge status={line.status} className="wgi-record-badge" />
        <span data-overdue={line.stamp === null ? undefined : true}>{line.timing}</span>
      </p>
    );
  }
  return (
    <p className="wgi-sheet-pref">{standing.kind === "quiet" ? standing.text : "No visits yet"}</p>
  );
}

function RequestTab({ line }: Readonly<{ line: Readonly<HomeLine> }>) {
  const { outcome, record, retry } = useRecordRead(line, line.id);
  const sections = useMemo(() => (record === null ? null : recordSections(record)), [record]);
  if (outcome === null) {
    return (
      <div className="wgi-sheet-skeleton" role="status">
        <span className="sr-only">Loading the request</span>
        <i data-stands-for="section-title" />
        <i data-stands-for="detail-row" />
        <i data-stands-for="detail-value" />
      </div>
    );
  }
  if (record === null || sections === null) {
    return (
      <div className="wgi-sheet-state" role="alert">
        <p className="wgi-sheet-state-title">
          {outcome.kind === "gone"
            ? "This request no longer exists."
            : "The request could not be loaded."}
        </p>
        {outcome.kind === "gone" ? null : (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  return (
    <>
      <PatientMessage message={record.message?.trim() ?? ""} />
      {sections.latestNote === null ? null : <LatestNoteBlock note={sections.latestNote} />}
      <section className="wgi-sheet-section" aria-labelledby="wgi-sheet-origin-label">
        <h3 id="wgi-sheet-origin-label" className="wgi-sheet-label">
          How they came to us
        </h3>
        <p className="wgi-sheet-origin">
          <span>{cameToUs(record)}</span>
          <Link href={`/admin?request=${record.id}`} className="wgi-sheet-history-link">
            History · {sections.rowCount}
            <ChevronRight aria-hidden="true" />
          </Link>
        </p>
      </section>
    </>
  );
}

function VisitsTab({ groups, patientId }: Readonly<{ groups: VisitGroups; patientId: string }>) {
  if (groups.upcoming.length === 0 && groups.earlier.length === 0) {
    return <p className="wgi-sheet-empty">No visits yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <VisitGroup label="Upcoming" visits={groups.upcoming} patientId={patientId} />
      <VisitGroup label="Earlier" visits={groups.earlier} patientId={patientId} />
    </div>
  );
}

function VisitGroup({
  label,
  visits,
  patientId,
}: Readonly<{ label: string; visits: readonly PatientVisit[]; patientId: string }>) {
  if (visits.length === 0) return null;
  return (
    <section className="wgi-visit-group" aria-label={label}>
      <h3 className="wgi-sheet-label">{label}</h3>
      <ul className="wgi-visit-list">
        {visits.map((visit) => (
          <li key={visit.id}>
            <VisitCard visit={visit} patientId={patientId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* A visit moves the schedule to its day; the record stays open over it. */
function VisitCard({
  visit,
  patientId,
}: Readonly<{ visit: Readonly<PatientVisit>; patientId: string }>) {
  const today = isToday(visit);
  const word = visitWord(visit);
  return (
    <Link
      href={`${dayHref(visitDate(visit))}&patient=${patientId}`}
      scroll={false}
      className="wgi-visit"
      data-today={today || undefined}
    >
      <Calendar className="wgi-visit-icon" aria-hidden="true" />
      <span className="wgi-visit-text">
        <span className="wgi-visit-when">{visitWhen(visit)}</span>
        <span className="wgi-visit-with">{visitWith(visit)}</span>
      </span>
      <span className="wgi-visit-word">
        {word ?? (
          <>
            Show on schedule
            <ChevronRight aria-hidden="true" />
          </>
        )}
      </span>
    </Link>
  );
}

const CLINICAL_STATUS = {
  draft: "Draft",
  signed: "Signed",
  entered_in_error: "Entered in error",
} as const;

function ClinicalTab({
  list,
  noun,
}: Readonly<{ list: ScheduleClinicalList; noun: "clinical notes" | "documents" }>) {
  if (!list.ok) {
    return (
      <p className="wgi-sheet-empty" role={list.forbidden ? undefined : "alert"}>
        {list.forbidden
          ? `Your role can't open ${noun}.`
          : `The ${noun} could not be loaded. Try again in a moment.`}
      </p>
    );
  }
  if (list.items.length === 0) return <p className="wgi-sheet-empty">No {noun} yet.</p>;
  return (
    <ul className="wgi-clinical-list">
      {list.items.map((item) => (
        <li key={item.id} className="wgi-clinical-item">
          <span className="wgi-clinical-title" data-ui-redact="staff-note">
            {item.title}
          </span>
          <span className="wgi-clinical-meta">
            {item.serviceDate === null ? null : `${dateLabel(item.serviceDate)} · `}
            {CLINICAL_STATUS[item.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
