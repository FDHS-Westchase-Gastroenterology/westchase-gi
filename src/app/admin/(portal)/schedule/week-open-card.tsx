"use client";

import { startTransition, useEffect, useId, useState } from "react";

import { Clock, MapPin, Search, User } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxStatus,
} from "@/components/ui/combobox";
import { FieldLabel } from "@/components/ui/field";
import { PopoverTitle } from "@/components/ui/popover";

import type { WeekOpenCell } from "./schedule-week-model";
import { bookOpenTime, searchWeekPatients } from "./week-actions";
import { appointmentAt, appointmentWhen } from "./week-calendar";
import { startClock } from "./week-card-model";
import type { WeekPatient } from "./week-card-model";
import { CardError, useCommand } from "./week-card-parts";
import type { DoneHandler } from "./week-card-parts";

/* ---- The open-time card ---- */

const SEARCH_REST_MS = 250;

export function OpenTimeCard({
  cell,
  onDone,
}: Readonly<{
  cell: WeekOpenCell;
  onDone: DoneHandler;
}>) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<WeekPatient | null>(null);
  const command = useCommand(onDone);

  function book(chosen: Readonly<WeekPatient>) {
    command.run(
      async (idempotencyKey) =>
        bookOpenTime({
          idempotencyKey,
          command: {
            patientId: chosen.id,
            providerId: cell.providerId,
            locationId: cell.locationId,
            appointmentTypeId: cell.type.id,
            expectedTypeVersion: cell.type.version,
            start: { date: cell.date, time: startClock(cell.startsAt) },
          },
        }),
      {
        subject: chosen.name,
        rest: ` is booked at ${cell.time}`,
        headline: `${chosen.name} is booked`,
        detail: `${appointmentAt(cell.startsAt)} · ${cell.providerName}, ${cell.locationName}`,
      },
    );
  }

  return (
    <section className="wgi-week-card-body" aria-labelledby={titleId}>
      <PopoverTitle id={titleId} className="wgi-week-card-name">
        Book {cell.time}
      </PopoverTitle>
      <ul className="wgi-week-card-facts">
        <li>
          <Clock width={16} height={16} />
          {appointmentWhen(cell.startsAt, cell.endsAt)}
        </li>
        <li>
          <User width={16} height={16} />
          {cell.providerName}
        </li>
        <li>
          <MapPin width={16} height={16} />
          {cell.locationName} · {cell.type.name}
        </li>
      </ul>
      {patient === null ? (
        <PatientSearch query={query} onQuery={setQuery} onPick={setPatient} />
      ) : (
        <div className="wgi-week-card-face">
          <p className="wgi-week-card-chosen">
            <span data-ui-redact="patient-name">{patient.name}</span>
          </p>
          {command.error === null ? null : <CardError>{command.error}</CardError>}
          <div className="wgi-week-card-actions">
            <Button
              size="sm"
              className="wgi-week-card-go"
              disabled={command.pending}
              onClick={() => {
                book(patient);
              }}
            >
              Book {cell.time}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={command.pending}
              onClick={() => {
                command.clear();
                setPatient(null);
              }}
            >
              Change patient
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

const SEARCHING = "Searching…";
const NO_MATCH = "No patients match.";

/** What the search's live region says: nothing under two characters or
   after a failed search (the error is its own alert), otherwise the wait,
   the miss, or the count. */
function searchStatus(term: string, results: readonly WeekPatient[] | null | undefined) {
  if (term.length < 2 || results === null) return "";
  if (results === undefined) return SEARCHING;
  if (results.length === 0) return NO_MATCH;
  return `${results.length} ${results.length === 1 ? "patient" : "patients"}`;
}

/* ---- Patient search: two characters, then a short rest. The card keeps
   the query, so "Change patient" comes back to the same search. The list
   is a combobox: arrows walk it while focus stays in the field, Return
   picks, and Escape clears a query before it closes the card. ---- */

function PatientSearch({
  query,
  onQuery,
  onPick,
}: Readonly<{
  query: string;
  onQuery: (query: string) => void;
  onPick: (patient: WeekPatient) => void;
}>) {
  const searchId = useId();
  const [found, setFound] = useState<{
    query: string;
    patients: readonly WeekPatient[] | null;
  } | null>(null);
  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return undefined;
    let live = true;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the search is in flight
          const outcome = await searchWeekPatients(term);
          if (live) setFound({ query: term, patients: outcome.ok ? outcome.patients : null });
        } catch {
          if (live) setFound({ query: term, patients: null });
        }
      });
    }, SEARCH_REST_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [term]);

  const results = found?.query === term ? found.patients : undefined;
  const status = searchStatus(term, results);
  const patients = term.length < 2 ? [] : (results ?? []);

  return (
    <div className="wgi-week-card-face">
      <FieldLabel htmlFor={searchId} className="wgi-week-card-label">
        Patient
      </FieldLabel>
      <Combobox
        inline
        open
        items={patients}
        filter={null}
        autoHighlight
        itemToStringLabel={(patient: WeekPatient) => patient.name}
        inputValue={query}
        onInputValueChange={(value) => {
          onQuery(value);
        }}
        value={null}
        onValueChange={(patient: WeekPatient | null) => {
          if (patient !== null) onPick(patient);
        }}
      >
        <div className="wgi-week-card-search">
          <Search width={16} height={16} />
          <ComboboxInput
            id={searchId}
            type="search"
            placeholder="Search by name or phone"
            onKeyDown={(event) => {
              if (event.key !== "Escape" || query === "") return;
              /* The first Escape clears the query; the card stays. */
              event.preventBaseUIHandler();
              event.stopPropagation();
              onQuery("");
            }}
          />
        </div>
        <ComboboxStatus className="sr-only">{status}</ComboboxStatus>
        {results === null ? (
          <CardError>Patients couldn&apos;t be searched. Try again.</CardError>
        ) : null}
        {status === SEARCHING || status === NO_MATCH ? (
          <p className="wgi-week-card-quiet" aria-hidden="true">
            {status}
          </p>
        ) : null}
        <ComboboxList className="wgi-week-card-patients" aria-label="Patients">
          {(patient: WeekPatient) => (
            <ComboboxItem key={patient.id} value={patient} className="wgi-week-card-patient">
              <span data-ui-redact="patient-name">{patient.name}</span>
              {patient.dateOfBirth === null ? null : (
                <span className="wgi-week-card-quiet" data-ui-redact="patient-contact">
                  {patient.dateOfBirth}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </Combobox>
    </div>
  );
}
