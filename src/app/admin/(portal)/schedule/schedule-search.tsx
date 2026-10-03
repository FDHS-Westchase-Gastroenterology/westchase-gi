"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { formatPhoneForDisplay } from "@/app/admin/(portal)/requests/format";
import { Plus, Search, User } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxStatus,
} from "@/components/ui/combobox";
import type { FoundPerson } from "@/lib/portal/patients/contracts";

import { useSchedulePeople } from "./schedule-people";
import {
  countWords,
  nameParts,
  SEARCH_MIN,
  standingLine,
  startOffer,
} from "./schedule-search-model";
import { findSchedulePeople } from "./week-actions";
import type { SchedulePeopleOutcome } from "./week-actions";

/* The Schedule's search (issue #356), in the toolbar on Day, Week and
   Month; / focuses it. From the second character it lists the people
   whose name starts a word with what was typed, or whose phone has the
   digits, under PATIENTS · N: registry patients and the open requests no
   patient is linked to yet. The arrows walk the list while focus stays in
   the field, Return opens the record, and Escape clears the field before
   it leaves it. A query that finds nobody offers to start a request with
   the name (or the number) that was typed, and on the portal's first day,
   with nobody in it yet, the field says so as soon as it is focused.

   No motion: the popup answers a keystroke, and keyboard-initiated
   actions never animate (design-system/motion.md). The query stays in
   this component's state: never in the address, storage or telemetry. */

const SEARCH_REST_MS = 200;
const SEARCHING = "Searching…";

interface Found {
  readonly query: string;
  readonly outcome: SchedulePeopleOutcome | null;
}

function announce(term: string, found: Found | null, current: boolean): string {
  if (term.length < SEARCH_MIN) return "";
  if (!current) return SEARCHING;
  if (found?.outcome?.ok !== true) return "Patients couldn't be searched.";
  return found.outcome.total === 0
    ? `No patients matching ${term}.`
    : countWords(found.outcome.total);
}

/** A choice made from the keyboard opens what it chose at once, without motion. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry framework member types that cannot be made readonly
function isKeyed(event: Event): boolean {
  return event instanceof KeyboardEvent || (event instanceof MouseEvent && event.detail === 0);
}

export function ScheduleSearch() {
  const { openPerson, startRequest } = useSchedulePeople();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [anyone, setAnyone] = useState<boolean | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const term = query.trim();

  useEffect(() => {
    if (term.length < SEARCH_MIN) return undefined;
    let live = true;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the search is in flight
          const outcome = await findSchedulePeople(term);
          if (!live) return;
          setFound({ query: term, outcome });
          if (outcome.ok) setAnyone(outcome.anyone);
        } catch {
          if (live) setFound({ query: term, outcome: null });
        }
      });
    }, SEARCH_REST_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [term]);

  /* The first focus asks once whether anyone is in the portal at all, so
     its first day can say so before anything is typed. */
  function probe() {
    if (anyone !== null) return;
    startTransition(async () => {
      try {
        const outcome = await findSchedulePeople("");
        setAnyone(outcome.ok ? outcome.anyone : true);
      } catch {
        setAnyone(true);
      }
    });
  }

  const current = found?.query === term;
  const outcome = found?.outcome ?? null;
  // The last answer stays up while the next one is on its way.
  const people = term.length >= SEARCH_MIN && outcome?.ok === true ? outcome.people : [];
  const total = term.length >= SEARCH_MIN && outcome?.ok === true ? outcome.total : 0;
  const nobody = current && outcome?.ok === true && outcome.total === 0;
  const failed = current && outcome === null;
  const firstDay = anyone === false && term.length < SEARCH_MIN;
  const shown = open && (term.length >= SEARCH_MIN || firstDay);

  function start(typed: string, keyed: boolean) {
    setOpen(false);
    setQuery("");
    startRequest(typed, keyed);
  }

  return (
    <Combobox<FoundPerson>
      items={people}
      filter={null}
      autoHighlight="always"
      open={shown}
      onOpenChange={(next) => {
        setOpen(next);
      }}
      itemToStringLabel={(person) => person.name}
      inputValue={query}
      onInputValueChange={(value) => {
        setQuery(value);
        setOpen(true);
      }}
      value={null}
      onValueChange={(person, details) => {
        if (person === null) return;
        setOpen(false);
        setQuery("");
        openPerson(person, isKeyed(details.event));
      }}
    >
      <ComboboxInputGroup className="wgi-schedule-search" data-schedule-search="">
        <Search width={18} height={18} aria-hidden="true" />
        <ComboboxInput
          ref={input}
          type="search"
          motion="none"
          placeholder="Search patients"
          aria-label="Search patients"
          maxLength={254}
          autoComplete="off"
          spellCheck={false}
          data-ui-redact="patient-name"
          onFocus={() => {
            probe();
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              // The first Escape clears the field; the next one leaves it.
              event.preventBaseUIHandler();
              if (query !== "") setQuery("");
              else {
                setOpen(false);
                input.current?.blur();
              }
              return;
            }
            if (event.key === "Enter" && nobody) {
              event.preventDefault();
              start(term, true);
            }
          }}
        />
      </ComboboxInputGroup>
      <ComboboxStatus className="sr-only" data-ui-redact="patient-name">
        {open ? announce(term, found, current) : ""}
      </ComboboxStatus>
      <ComboboxContent className="wgi-people-popup">
        {firstDay ? (
          <FirstDay
            onAdd={(keyed) => {
              start("", keyed);
            }}
          />
        ) : (
          <>
            <p className="wgi-people-head" aria-hidden="true">
              Patients · {current || people.length > 0 ? total : "…"}
            </p>
            <ComboboxList className="wgi-people-list" aria-label="Patients">
              {(person: FoundPerson) => (
                <PersonRow key={`${person.kind}:${person.id}`} person={person} query={term} />
              )}
            </ComboboxList>
            {!current && people.length === 0 ? (
              <p className="wgi-people-quiet">{SEARCHING}</p>
            ) : null}
            {failed ? (
              <p className="wgi-people-quiet" role="alert">
                Patients couldn&apos;t be searched. Try again.
              </p>
            ) : null}
            {nobody ? (
              <NoMatch
                query={term}
                onStart={(keyed) => {
                  start(term, keyed);
                }}
              />
            ) : null}
            {people.length > 0 || nobody ? (
              <p className="wgi-people-foot" aria-hidden="true">
                {nobody ? (
                  <span>Return to start the request</span>
                ) : (
                  <>
                    <span>↑↓ to choose</span>
                    <span>Return to open the record</span>
                  </>
                )}
              </p>
            ) : null}
          </>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

function PersonRow({ person, query }: Readonly<{ person: FoundPerson; query: string }>) {
  const line = standingLine(person.status);
  return (
    <ComboboxItem value={person} className="wgi-people-row">
      <span className="wgi-people-avatar" data-kind={person.kind} aria-hidden="true">
        <User width={15} height={15} />
      </span>
      <span className="wgi-people-who">
        <span className="wgi-people-name" data-ui-redact="patient-name">
          {nameParts(person.name, query).map((part, index) =>
            part.matched ? <b key={index}>{part.text}</b> : <span key={index}>{part.text}</span>,
          )}
        </span>
        <span className="wgi-people-line" data-tone={line.tone}>
          {line.text}
        </span>
      </span>
      {person.phone === null ? null : (
        <span className="wgi-people-phone" data-ui-redact="patient-contact">
          {formatPhoneForDisplay(person.phone)}
        </span>
      )}
    </ComboboxItem>
  );
}

function NoMatch({
  query,
  onStart,
}: Readonly<{ query: string; onStart: (keyed: boolean) => void }>) {
  const offer = startOffer(query);
  return (
    <div className="wgi-people-none">
      <p className="wgi-people-title">Not in the portal yet?</p>
      <p className="wgi-people-lead" data-ui-redact="patient-name">
        {offer.lead}
      </p>
      <Button
        type="button"
        variant="outline"
        className="wgi-cmd wgi-cmd-primary wgi-people-start"
        data-ui-redact="patient-name"
        onClick={(event) => {
          onStart(event.detail === 0);
        }}
      >
        <Plus width={16} height={16} aria-hidden="true" />
        {offer.action}
      </Button>
    </div>
  );
}

function FirstDay({ onAdd }: Readonly<{ onAdd: (keyed: boolean) => void }>) {
  return (
    <div className="wgi-people-first">
      <p className="wgi-people-title">No patients yet</p>
      <p className="wgi-people-lead">
        People appear here once a request comes in from the website or someone is booked on the
        schedule. Search finds them by name or phone number.
      </p>
      <Button
        type="button"
        variant="outline"
        className="wgi-cmd wgi-people-start"
        onClick={(event) => {
          onAdd(event.detail === 0);
        }}
      >
        Add request…
      </Button>
    </div>
  );
}
