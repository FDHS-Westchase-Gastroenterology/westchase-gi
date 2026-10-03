"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  startTransition,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { toast } from "sonner";

import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { AddRequestDialog } from "@/app/admin/(portal)/add-appointment-dialog";
import type { AddRequestDialogHandle } from "@/app/admin/(portal)/add-appointment-dialog";
import { recordHref } from "@/app/admin/(portal)/record-address";
import type { FoundPerson } from "@/lib/portal/patients/contracts";

import { PatientRecordSheet } from "./patient-record-sheet";
import { RequestRecordSheet } from "./request-record-sheet";
import { requestPrefill } from "./schedule-search-model";
import { readWeekRecordLine } from "./week-actions";
import type { RecordHint } from "./week-card-parts";

/* The people the Schedule opens (issue #356), shared by its three views:
   the full-record sheet and the Add request dialog live once here, in the
   Schedule's layout, so a record opened from the search or from a card
   stays open while the views change under it, and the schedule stays live
   behind it. The open record is in the address, `?patient=` for a
   patient's record and `?request=` for a person known only by a request,
   so reload, Back and a pasted link open it again; opening pushes a
   history entry and closing replaces it, so Back closes the sheet before
   it leaves the page. The query that found the person never reaches the
   address.

   While a patient's record is open, their appointments on the grid wear
   its outline. Focus goes back where the record came from: the card's
   appointment on the grid, or the search field. */

interface SchedulePeopleValue {
  /** Opens what the search found: the person's request, or their record. */
  readonly openPerson: (person: FoundPerson, instant: boolean) => void;
  /** Opens Add request with what the search typed, if anything. */
  readonly startRequest: (typed: string, instant: boolean) => void;
  /** Opens the record of the patient behind an appointment card. */
  readonly openRecord: (patient: RecordHint, appointmentId: string, instant: boolean) => void;
}

const SchedulePeopleContext = createContext<SchedulePeopleValue | null>(null);
const NO_VISITS: ReadonlySet<string> = new Set();
const OpenRecordVisits = createContext<ReadonlySet<string>>(NO_VISITS);

/** The appointments of the patient whose record is open, which the grid outlines. */
export function useOpenRecordVisits(): ReadonlySet<string> {
  return use(OpenRecordVisits);
}

export function useSchedulePeople(): SchedulePeopleValue {
  const value = use(SchedulePeopleContext);
  if (value === null) throw new Error("useSchedulePeople must be used inside SchedulePeople");
  return value;
}

function searchField(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-schedule-search] input");
}

interface RecordState {
  readonly shown: HomeLine | null;
  readonly setShown: (line: HomeLine) => void;
  /** What opened a patient's record knew of them already. */
  readonly hint: RecordHint | null;
  readonly instant: boolean;
  /** Where focus goes when the record closes: an appointment on the grid, or the search field (null). */
  readonly origin: Readonly<RefObject<string | null>>;
  readonly onVisits: (ids: ReadonlySet<string>) => void;
  /** The request on screen was booked: its record becomes the patient's. */
  readonly toPatient: (patient: RecordHint) => void;
}

/* The sheet of the record the address names. It reads the address, so it
   sits under its own Suspense boundary and the views around it never wait
   on it. */
function AddressedRecord({
  shown,
  setShown,
  hint,
  instant,
  origin,
  onVisits,
  toPatient,
}: RecordState) {
  const router = useRouter();
  const params = useSearchParams();
  const requestId = params.get("request");
  const patientId = params.get("patient");
  const returnFocus = () =>
    origin.current === null
      ? searchField()
      : document.querySelector<HTMLElement>(`[data-appointment="${origin.current}"]`);
  const line = shown?.id === requestId ? shown : null;

  /* A record the address names that this page has not read yet: a reload,
     Back, a pasted link, or a person the search found. */
  useEffect(() => {
    if (requestId === null || shown?.id === requestId) return undefined;
    let live = true;
    startTransition(async () => {
      // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the read is in flight
      const read = await readWeekRecordLine(requestId).catch(() => null);
      if (!live) return;
      if (read === null) {
        toast("That record couldn't be opened.");
        window.history.replaceState(null, "", recordHref("request", null));
        return;
      }
      /* A request with a patient is that patient's record. */
      if (read.patientId !== null) {
        toPatient({ id: read.patientId, name: read.name, phone: read.phoneDigits });
        return;
      }
      setShown(read);
    });
    return () => {
      live = false;
    };
  }, [requestId, shown, setShown, toPatient]);

  return (
    <>
      <RequestRecordSheet
        line={line}
        instant={instant}
        onOpenChange={(open) => {
          if (!open) window.history.replaceState(null, "", recordHref("request", null));
        }}
        onClosed={() => {
          router.refresh();
        }}
        /* The card saved or booked. A booked request now has its patient,
           and the record on screen becomes theirs; a saved call is the
           same request a step further on, read again. */
        onChanged={(id) => {
          startTransition(async () => {
            const read = await readWeekRecordLine(id).catch(() => null);
            if (
              read === null ||
              new URLSearchParams(window.location.search).get("request") !== id
            ) {
              return;
            }
            if (read.patientId !== null) {
              toPatient({ id: read.patientId, name: read.name, phone: read.phoneDigits });
              return;
            }
            setShown(read);
          });
        }}
        returnFocus={() =>
          /* Booked into the patient's record: focus moves into that sheet. */
          new URLSearchParams(window.location.search).has("patient") ? null : returnFocus()
        }
      />
      <PatientRecordSheet
        patientId={requestId === null ? patientId : null}
        hint={hint}
        instant={instant}
        onOpenChange={(open) => {
          if (!open) window.history.replaceState(null, "", recordHref("patient", null));
        }}
        onClosed={() => {
          router.refresh();
        }}
        onVisits={onVisits}
        returnFocus={returnFocus}
      />
    </>
  );
}

export function SchedulePeople({
  addRequestKey,
  children,
}: Readonly<{ addRequestKey: string; children: ReactNode }>) {
  const router = useRouter();
  const [shown, setShown] = useState<HomeLine | null>(null);
  const [hint, setHint] = useState<RecordHint | null>(null);
  const [visits, setVisits] = useState<ReadonlySet<string>>(NO_VISITS);
  const [instant, setInstant] = useState(false);
  const origin = useRef<string | null>(null);
  const addDialog = useRef<AddRequestDialogHandle>(null);

  /* A new set every read; the grid repaints only when the appointments change. */
  const showVisits = useCallback((ids: ReadonlySet<string>) => {
    setVisits((current) =>
      current.size === ids.size && [...ids].every((id) => current.has(id)) ? current : ids,
    );
  }, []);

  const toPatient = useCallback(
    (patient: RecordHint) => {
      /* One record gives way to the other in place, without the sheets'
         travel: the person on screen is the same. The swap goes through the
         router rather than the history API: a booking has just refreshed
         the page, and an address changed under that refresh makes its
         answer mismatch the page, which Next settles with a full reload. */
      setInstant(true);
      setHint(patient);
      router.replace(recordHref("patient", patient.id), { scroll: false });
    },
    [router],
  );

  const value = useMemo<SchedulePeopleValue>(
    () => ({
      openPerson(person, keyed) {
        origin.current = null;
        setInstant(keyed);
        if (person.kind === "request") {
          window.history.pushState(null, "", recordHref("request", person.id));
          return;
        }
        setHint({ id: person.id, name: person.name, phone: person.phone });
        window.history.pushState(null, "", recordHref("patient", person.id));
      },
      startRequest(typed, keyed) {
        addDialog.current?.open(requestPrefill(typed), keyed);
      },
      openRecord(patient, appointmentId, keyed) {
        origin.current = appointmentId;
        setInstant(keyed);
        setHint(patient);
        window.history.pushState(null, "", recordHref("patient", patient.id));
      },
    }),
    [],
  );

  return (
    <SchedulePeopleContext value={value}>
      <OpenRecordVisits value={visits}>{children}</OpenRecordVisits>
      <Suspense fallback={null}>
        <AddressedRecord
          shown={shown}
          setShown={setShown}
          hint={hint}
          instant={instant}
          origin={origin}
          onVisits={showVisits}
          toPatient={toPatient}
        />
      </Suspense>
      <AddRequestDialog
        idempotencyKey={addRequestKey}
        permalink="/admin/schedule"
        handleRef={addDialog}
        onCreated={() => {
          router.refresh();
        }}
        onClosed={() => {
          searchField()?.focus();
        }}
      />
    </SchedulePeopleContext>
  );
}
