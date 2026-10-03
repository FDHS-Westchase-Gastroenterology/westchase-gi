"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  startTransition,
  Suspense,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { toast } from "sonner";

import { FullRecordSheet } from "@/app/admin/(portal)/(home)/full-record-sheet";
import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { AddRequestDialog } from "@/app/admin/(portal)/add-appointment-dialog";
import type { AddRequestDialogHandle } from "@/app/admin/(portal)/add-appointment-dialog";
import type { FoundPerson } from "@/lib/portal/patients/contracts";

import { requestPrefill } from "./schedule-search-model";
import { readWeekRecordLine } from "./week-actions";

/* The people the Schedule opens (issue #356), shared by its three views:
   the full-record sheet and the Add request dialog live once here, in the
   Schedule's layout, so a record opened from the search or from a card
   stays open while the views change under it, and the schedule stays live
   behind it. The open record is in the address (`?request=`), so reload,
   Back and a pasted link open it again; opening pushes a history entry and
   closing replaces it, so Back closes the sheet before it leaves the page.
   The query that found the person never reaches the address.

   Focus goes back where the record came from: the card's appointment on
   the grid, or the search field. */

interface SchedulePeopleValue {
  /** Opens what the search found: the person's request, or their record. */
  readonly openPerson: (person: FoundPerson, instant: boolean) => void;
  /** Opens Add request with what the search typed, if anything. */
  readonly startRequest: (typed: string, instant: boolean) => void;
  /** Opens the record of the request behind an appointment card. */
  readonly openRecord: (line: HomeLine, appointmentId: string, instant: boolean) => void;
}

const SchedulePeopleContext = createContext<SchedulePeopleValue | null>(null);

export function useSchedulePeople(): SchedulePeopleValue {
  const value = use(SchedulePeopleContext);
  if (value === null) throw new Error("useSchedulePeople must be used inside SchedulePeople");
  return value;
}

const RECORD_PARAMS = ["request", "patient"] as const;

/** The address with the open record set to `id`, or with none when `id` is null. */
function recordHref(param: (typeof RECORD_PARAMS)[number], id: string | null): string {
  const params = new URLSearchParams(window.location.search);
  for (const name of RECORD_PARAMS) params.delete(name);
  if (id !== null) params.set(param, id);
  const query = params.toString();
  return `${window.location.pathname}${query === "" ? "" : `?${query}`}`;
}

function searchField(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-schedule-search] input");
}

interface RecordState {
  readonly shown: HomeLine | null;
  readonly setShown: (line: HomeLine) => void;
  readonly instant: boolean;
  /** Where focus goes when the record closes: an appointment on the grid, or the search field (null). */
  readonly origin: Readonly<RefObject<string | null>>;
}

/* The sheet of the record the address names. It reads the address, so it
   sits under its own Suspense boundary and the views around it never wait
   on it. */
function AddressedRecord({ shown, setShown, instant, origin }: RecordState) {
  const router = useRouter();
  const params = useSearchParams();
  const requestId = params.get("request");
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
      setShown(read);
    });
    return () => {
      live = false;
    };
  }, [requestId, shown, setShown]);

  return (
    <FullRecordSheet
      line={line}
      instant={instant}
      onOpenChange={(open) => {
        if (!open) window.history.replaceState(null, "", recordHref("request", null));
      }}
      onClosed={() => {
        router.refresh();
      }}
      returnFocus={() =>
        origin.current === null
          ? searchField()
          : document.querySelector<HTMLElement>(`[data-appointment="${origin.current}"]`)
      }
    />
  );
}

export function SchedulePeople({
  addRequestKey,
  children,
}: Readonly<{ addRequestKey: string; children: ReactNode }>) {
  const router = useRouter();
  const [shown, setShown] = useState<HomeLine | null>(null);
  const [instant, setInstant] = useState(false);
  const origin = useRef<string | null>(null);
  const addDialog = useRef<AddRequestDialogHandle>(null);

  const value = useMemo<SchedulePeopleValue>(
    () => ({
      openPerson(person, keyed) {
        origin.current = null;
        setInstant(keyed);
        if (person.kind === "request") {
          window.history.pushState(null, "", recordHref("request", person.id));
          return;
        }
        if (person.status.kind === "request") {
          window.history.pushState(null, "", recordHref("request", person.status.requestId));
          return;
        }
        window.history.pushState(null, "", recordHref("patient", person.id));
      },
      startRequest(typed, keyed) {
        addDialog.current?.open(requestPrefill(typed), keyed);
      },
      openRecord(next, appointmentId, keyed) {
        origin.current = appointmentId;
        setInstant(keyed);
        setShown(next);
        window.history.pushState(null, "", recordHref("request", next.id));
      },
    }),
    [],
  );

  return (
    <SchedulePeopleContext value={value}>
      {children}
      <Suspense fallback={null}>
        <AddressedRecord shown={shown} setShown={setShown} instant={instant} origin={origin} />
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
