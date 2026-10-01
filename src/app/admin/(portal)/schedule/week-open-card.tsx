"use client";

import { Popover } from "@base-ui/react/popover";
import { startTransition, useEffect, useId, useState } from "react";

import { Clock, MapPin, Search, User } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { WeekOpenCell } from "./schedule-week-model";
import { bookOpenTime, searchWeekPatients } from "./week-actions";
import { appointmentWhen } from "./week-calendar";
import { startClock } from "./week-card-model";
import type { WeekPatient } from "./week-card-model";
import { CardError, useCommand } from "./week-card-parts";
import type { ReferenceType } from "./week-card-parts";

/* ---- The open-time card ---- */

const SEARCH_REST_MS = 250;

export function OpenTimeCard({
  cell,
  referenceType,
  onDone,
}: Readonly<{
  cell: WeekOpenCell;
  referenceType: ReferenceType;
  onDone: (message: string) => void;
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
            appointmentTypeId: referenceType.id,
            expectedTypeVersion: referenceType.version,
            start: { date: cell.date, time: startClock(cell.startsAt) },
          },
        }),
      `${chosen.name} is booked at ${cell.time}.`,
    );
  }

  return (
    <section className="wgi-week-card-body" aria-labelledby={titleId}>
      <Popover.Title id={titleId} className="wgi-week-card-name">
        Book {cell.time}
      </Popover.Title>
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
          {cell.locationName} · {referenceType.name}
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

/* ---- Patient search: two characters, then a short rest. The card keeps
   the query, so "Change patient" comes back to the same search. ---- */

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

  return (
    <div className="wgi-week-card-face">
      <label htmlFor={searchId} className="wgi-week-card-label">
        Patient
      </label>
      <div className="wgi-week-card-search">
        <Search width={16} height={16} />
        <Input
          id={searchId}
          type="search"
          placeholder="Search by name or phone"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            onQuery(event.currentTarget.value);
          }}
        />
      </div>
      {term.length < 2 ? null : results === undefined ? (
        <p className="wgi-week-card-quiet" aria-live="polite">
          Searching…
        </p>
      ) : results === null ? (
        <CardError>Patients couldn&apos;t be searched. Try again.</CardError>
      ) : results.length === 0 ? (
        <p className="wgi-week-card-quiet">No patients match.</p>
      ) : (
        <ul className="wgi-week-card-patients" aria-label="Patients">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="wgi-week-card-patient"
                onClick={() => {
                  onPick(result);
                }}
              >
                <span data-ui-redact="patient-name">{result.name}</span>
                {result.dateOfBirth === null ? null : (
                  <span className="wgi-week-card-quiet" data-ui-redact="patient-contact">
                    {result.dateOfBirth}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
