"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from "react";
import { toast } from "sonner";

import type { MinuteSpan } from "@/app/admin/(portal)/settings/providers/providers-model";
import { rulerAt } from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  QUARTER_HOUR,
  clockOf,
  longDay,
  placeName,
  rulerLabels,
  shortDate,
  shortName,
} from "@/app/admin/(portal)/settings/settings-model";
import { Calendar, ChevronDown, Clock, MapPin, Repeat } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/ui/help-button";
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { PopoverContainer } from "@/components/ui/popover-behavior";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { showUndoToast } from "@/components/ui/undo-toast";
import type { UndoResult } from "@/components/ui/undo-toast";
import type {
  DayHours,
  DayHoursConflict,
  DayHoursOutcome,
  DayHoursProvider,
  DayHoursScope,
} from "@/lib/portal/scheduling/day-hours-contracts";

import { readDayHoursFor, setDayHours, undoDayHours } from "./day-hours-actions";
import {
  addedLine,
  closedLine,
  baselineOf,
  bookingStart,
  firstName,
  homeOf,
  hoursFailureMessage,
  hoursWords,
  keepChoice,
  keepPast,
  lockMinute,
  monthDay,
  movedTo,
  nowMinute,
  offText,
  officeHours,
  sameWindows,
  saveLabel,
  savedDetail,
  savedHeadline,
  scopeLine,
  sheetSpan,
  strandedIds,
  switchedOff,
  switchedOn,
  undoFailureMessage,
  usualLine,
  windowRange,
  worksAhead,
} from "./day-hours-model";
import type { HoursDraft, HoursWindow, RowCheck, SavedChange } from "./day-hours-model";
import { endMinute, practiceTime } from "./week-calendar";

/* The Day view's Hours sheet (issue #353; Figma page 02, H1–H4): every bookable provider's hours
   on the viewed day as bars on one ruler, for an admin to drag, switch on or off, and save for
   that day or for the weekday from that day on.

   - The Hours pill reads the day when it is pressed (and starts reading on hover), then the
     sheet drops from the top over the dimmed day. It is a native modal <dialog> wearing the
     portal's .portal-confirm-dialog parts; schedule-day.css widens it and gives it its drop.
   - Each change is sent as a dry run the moment a bar is let go or a switch is flipped. The
     server answers with the open times the day would have, or the visits the change would
     strand; Save waits until every changed row has been answered and none strands a visit.
   - Bars snap to the quarter hour and stay inside the office's hours. On today the quarter hour
     now falls in is a lock: what has passed stays as it was, in either scope.
   - A save closes the sheet, re-reads the schedule and raises the undo toast; Undo sends each
     change's undo in reverse, version-checked, so a change made since is never overwritten. */

type Checks = Readonly<Record<string, RowCheck>>;

interface LiveDrag {
  readonly providerId: string;
  readonly index: number;
  readonly windows: readonly HoursWindow[];
}

function scopeOptions(weekday: string): readonly SegmentedControlOption<DayHoursScope>[] {
  return [
    { value: "date", label: "This day only", icon: <Calendar aria-hidden="true" /> },
    { value: "weekday_from", label: `Every ${weekday}`, icon: <Repeat aria-hidden="true" /> },
  ];
}

const READ_FAILED = "The hours couldn't be read. Try again.";
const SEND_FAILED = "The hours couldn't be saved. Check the schedule and try again.";
const DRAG_HINT = "Drag the ends of a bar to change a provider’s hours.";
// A read started on hover is used by the press that follows it, if it is this fresh.
const PREFETCH_MS = 30_000;
// How long a row waits after its last change before it asks the database.
const CHECK_PAUSE = 250;
const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/* ---- The Hours pill ---- */

export function HoursButton({
  date,
  onReschedule,
}: Readonly<{ date: string; onReschedule: (appointmentId: string) => void }>) {
  const [open, setOpen] = useState<{ readonly hours: DayHours; readonly instant: boolean } | null>(
    null,
  );
  const [reading, setReading] = useState(false);
  const early = useRef<{
    readonly date: string;
    readonly at: number;
    readonly read: Promise<DayHoursOutcome>;
  } | null>(null);

  async function read(): Promise<DayHoursOutcome> {
    const started = early.current;
    if (started?.date === date && Date.now() - started.at < PREFETCH_MS) return started.read;
    const next = readDayHoursFor(date);
    // The read may never be awaited; its failure is answered when it is.
    next.catch(() => undefined);
    early.current = { date, at: Date.now(), read: next };
    return next;
  }

  return (
    <>
      <button
        type="button"
        className="wgi-schedule-today wgi-hours-pill"
        aria-haspopup="dialog"
        aria-busy={reading || undefined}
        onPointerEnter={() => {
          void read();
        }}
        onFocus={() => {
          void read();
        }}
        onClick={(event) => {
          if (reading) return;
          const instant = event.detail === 0;
          setReading(true);
          startTransition(async () => {
            try {
              const outcome = await read();
              early.current = null;
              if (outcome.ok) setOpen({ hours: outcome, instant });
              else toast.error(hoursFailureMessage(outcome.code));
            } catch {
              early.current = null;
              toast.error(READ_FAILED);
            } finally {
              setReading(false);
            }
          });
        }}
      >
        <Clock aria-hidden="true" className="size-4 shrink-0" />
        Hours
      </button>
      {open === null ? null : (
        <HoursSheet
          key={open.hours.observedAt}
          hours={open.hours}
          instant={open.instant}
          onClosed={(appointmentId) => {
            setOpen(null);
            if (appointmentId !== null) onReschedule(appointmentId);
          }}
        />
      )}
    </>
  );
}

/* ---- Talking to the server ---- */

type Saved = SavedChange & { readonly changeId: string; readonly version: number };

interface SaveResult {
  readonly saved: readonly Saved[];
  readonly failure: string | null;
  readonly conflict: {
    readonly providerId: string;
    readonly conflicts: readonly DayHoursConflict[];
  } | null;
}

/** What the server says a row's change would do, without writing it. */
async function askDryRun(
  hours: Readonly<DayHours>,
  provider: Readonly<DayHoursProvider>,
  scope: DayHoursScope,
  windows: readonly HoursWindow[],
): Promise<RowCheck> {
  try {
    const outcome = await setDayHours({
      idempotencyKey: crypto.randomUUID(),
      command: {
        providerId: provider.id,
        date: hours.date,
        scope,
        windows,
        expectedVersion: provider.version,
        dryRun: true,
      },
    });
    if (outcome.ok) return { state: "ok", openCount: outcome.openCount };
    if ("conflicts" in outcome) return { state: "conflict", conflicts: outcome.conflicts };
    return { state: "refused", message: hoursFailureMessage(outcome.code) };
  } catch {
    return { state: "refused", message: SEND_FAILED };
  }
}

/** Each provider's change is its own command; they run in turn so a refusal stops the rest. */
async function saveInTurn(
  hours: Readonly<DayHours>,
  scope: DayHoursScope,
  sending: readonly {
    readonly provider: DayHoursProvider;
    readonly windows: readonly HoursWindow[];
  }[],
): Promise<SaveResult> {
  const saved: Saved[] = [];
  try {
    for (const { provider, windows } of sending) {
      const outcome = await setDayHours({
        idempotencyKey: crypto.randomUUID(),
        command: {
          providerId: provider.id,
          date: hours.date,
          scope,
          windows,
          expectedVersion: provider.version,
          dryRun: false,
        },
      });
      if (!outcome.ok)
        return {
          saved,
          failure: hoursFailureMessage(outcome.code),
          conflict:
            "conflicts" in outcome
              ? { providerId: provider.id, conflicts: outcome.conflicts }
              : null,
        };
      if (outcome.changeId !== undefined)
        saved.push({
          provider,
          windows,
          openCount: outcome.openCount,
          changeId: outcome.changeId,
          version: outcome.version,
        });
    }
  } catch {
    return { saved, failure: SEND_FAILED, conflict: null };
  }
  return { saved, failure: null, conflict: null };
}

/** The toast after a save; Undo sends each change's undo in reverse, version-checked. */
function raiseUndo(
  hours: Readonly<DayHours>,
  saved: readonly Saved[],
  scope: DayHoursScope,
  refresh: () => void,
) {
  const keys = saved.map(() => crypto.randomUUID());
  showUndoToast({
    headline: savedHeadline(scope, hours),
    detail: savedDetail(saved, scope, hours),
    undo: async (): Promise<UndoResult> => {
      for (const [at, change] of saved.toReversed().entries()) {
        const outcome = await undoDayHours({
          idempotencyKey: keys[at] ?? crypto.randomUUID(),
          changeId: change.changeId,
          expectedVersion: change.version,
        });
        if (!outcome.ok) return { ok: false, message: undoFailureMessage(outcome.code) };
      }
      return { ok: true, message: "The hours are back as they were" };
    },
    onSettled: refresh,
  });
}

/* ---- The sheet's state ---- */

/** Tab and Shift+Tab stay inside the sheet. */
function keepFocusInSheet(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]",
    ),
  ).filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0);
  const first = controls.at(0);
  const last = controls.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function barStyle(span: Readonly<MinuteSpan>, open: number, close: number): CSSProperties {
  const left = rulerAt(span, Math.max(open, span.open));
  const right = rulerAt(span, Math.min(close, span.close));
  return { left: `${String(left)}%`, width: `${String(Math.max(0, right - left))}%` };
}

/** The track's faint lines, one an hour across the ruler's span. */
function hourLines(span: Readonly<MinuteSpan>): CSSProperties {
  return { backgroundSize: `${String(6000 / (span.close - span.open))}% 100%` };
}

/** One value per scope: each scope keeps its own drafts, answers and settled hours. */
interface ByScope<T> {
  readonly date: T;
  readonly weekday_from: T;
}

function emptyScopes<T>(value: T): ByScope<T> {
  return { date: value, weekday_from: value };
}

/** `all` with one provider's value set in one scope. */
function withRow<T>(
  all: ByScope<Readonly<Record<string, T>>>,
  scope: DayHoursScope,
  providerId: string,
  value: T,
): ByScope<Readonly<Record<string, T>>> {
  return { ...all, [scope]: { ...all[scope], [providerId]: value } };
}

function withoutRow<T>(
  all: ByScope<Readonly<Record<string, T>>>,
  scope: DayHoursScope,
  providerId: string,
): ByScope<Readonly<Record<string, T>>> {
  const { [providerId]: _gone, ...rest } = all[scope];
  return { ...all, [scope]: rest };
}

interface HoursEditor {
  readonly dialog: RefObject<HTMLDialogElement | null>;
  readonly scope: DayHoursScope;
  readonly lock: number | null;
  readonly live: LiveDrag | null;
  readonly saving: boolean;
  readonly error: string | null;
  readonly ready: boolean;
  readonly changed: readonly DayHoursProvider[];
  readonly draftOf: (provider: Readonly<DayHoursProvider>) => readonly HoursWindow[];
  readonly settledOf: (provider: Readonly<DayHoursProvider>) => readonly HoursWindow[];
  readonly checkOf: (providerId: string) => RowCheck | undefined;
  readonly chooseScope: (next: DayHoursScope) => void;
  readonly drag: (providerId: string, index: number, windows: readonly HoursWindow[]) => void;
  readonly commit: (provider: Readonly<DayHoursProvider>, next: readonly HoursWindow[]) => void;
  readonly save: () => void;
  readonly close: (rescheduleId: string | null, keyed: boolean) => void;
}

function useHoursEditor(
  hours: Readonly<DayHours>,
  onClosed: (rescheduleId: string | null) => void,
): HoursEditor {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const sent = useRef(new Map<string, number>());
  const waiting = useRef(new Map<string, number>());
  const [scope, setScope] = useState<DayHoursScope>("date");
  const [drafts, setDrafts] = useState<ByScope<HoursDraft>>(() => emptyScopes({}));
  const [settled, setSettled] = useState<ByScope<HoursDraft>>(() => emptyScopes({}));
  const [checks, setChecks] = useState<ByScope<Checks>>(() => emptyScopes({}));
  const [live, setLive] = useState<LiveDrag | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = lockMinute(hours);

  const draftOf = (provider: Readonly<DayHoursProvider>) =>
    drafts[scope][provider.id] ?? baselineOf(provider, scope);
  const changed = hours.providers.filter(
    (provider) => !sameWindows(draftOf(provider), baselineOf(provider, scope)),
  );
  const ready =
    changed.length > 0 &&
    changed.every((provider) => checks[scope][provider.id]?.state === "ok") &&
    !saving;

  /** Close with the sheet's exit, then unmount; a reschedule opens its card after. */
  function close(rescheduleId: string | null, keyed: boolean) {
    for (const timer of waiting.current.values()) window.clearTimeout(timer);
    const node = dialog.current;
    if (node === null) {
      onClosed(rescheduleId);
      return;
    }
    node.toggleAttribute("data-instant", keyed || node.hasAttribute("data-instant"));
    node.close();
    void Promise.allSettled(node.getAnimations().map(async (animation) => animation.finished)).then(
      () => {
        onClosed(rescheduleId);
      },
    );
  }

  /* Each row asks on its own line: a newer ask for the row drops an older answer, and the ask
     waits for a pause so a run of arrow keys sends one dry run, not one per quarter hour (the
     framework runs a page's server actions one after another). */
  function check(provider: Readonly<DayHoursProvider>, windows: readonly HoursWindow[]) {
    const atScope = scope;
    const line = `${atScope}:${provider.id}`;
    const ask = (sent.current.get(line) ?? 0) + 1;
    sent.current.set(line, ask);
    window.clearTimeout(waiting.current.get(line));
    if (sameWindows(windows, baselineOf(provider, atScope))) {
      setChecks((all) => withoutRow(all, atScope, provider.id));
      return;
    }
    const answer = (next: RowCheck) => {
      if (ask !== sent.current.get(line)) return;
      setChecks((all) => withRow(all, atScope, provider.id, next));
      if (next.state === "ok") setSettled((all) => withRow(all, atScope, provider.id, windows));
    };
    answer({ state: "checking" });
    const send = () => {
      startTransition(async () => {
        answer(await askDryRun(hours, provider, atScope, windows));
      });
    };
    waiting.current.set(line, window.setTimeout(send, CHECK_PAUSE));
  }

  function commit(provider: Readonly<DayHoursProvider>, next: readonly HoursWindow[]) {
    const windows = keepPast(next, provider.windows, lock);
    setLive(null);
    setError(null);
    setDrafts((all) => withRow(all, scope, provider.id, windows));
    check(provider, windows);
  }

  function save() {
    if (!ready) return;
    const atScope = scope;
    const sending = changed.map((provider) => ({ provider, windows: draftOf(provider) }));
    setSaving(true);
    setError(null);
    startTransition(async () => {
      const { saved, failure, conflict } = await saveInTurn(hours, atScope, sending);
      setSaving(false);
      if (conflict !== null)
        setChecks((all) =>
          withRow(all, atScope, conflict.providerId, {
            state: "conflict",
            conflicts: conflict.conflicts,
          }),
        );
      if (saved.length === 0) {
        setError(failure ?? SEND_FAILED);
        return;
      }
      router.refresh();
      raiseUndo(hours, saved, atScope, () => {
        router.refresh();
      });
      if (failure !== null) toast.error(failure);
      close(null, false);
    });
  }

  return {
    dialog,
    scope,
    lock,
    live,
    saving,
    error,
    ready,
    changed,
    draftOf,
    settledOf: (provider) => settled[scope][provider.id] ?? baselineOf(provider, scope),
    checkOf: (providerId) => checks[scope][providerId],
    chooseScope: (next) => {
      setLive(null);
      setError(null);
      setScope(next);
    },
    drag: (providerId, index, windows) => {
      setLive({ providerId, index, windows });
    },
    commit,
    save,
    close,
  };
}

/* ---- The sheet ---- */

/** The subtitle: who was just added and what their day holds, why nothing can change, or how to
    change it. */
function subtitleOf(
  editor: Readonly<HoursEditor>,
  hours: Readonly<DayHours>,
  added: readonly DayHoursProvider[],
): string {
  const one = added.length === 1 ? added.at(0) : undefined;
  const answer = one === undefined ? undefined : editor.checkOf(one.id);
  if (one !== undefined && answer?.state === "ok")
    return addedLine(one.name, editor.scope, hours, answer.openCount);
  return closedLine(hours, editor.lock) ?? DRAG_HINT;
}

function HoursSheet({
  hours,
  instant,
  onClosed,
}: Readonly<{
  hours: DayHours;
  instant: boolean;
  onClosed: (rescheduleId: string | null) => void;
}>) {
  const editor = useHoursEditor(hours, onClosed);
  const { scope, lock, live } = editor;
  const titleId = `${hours.date}-hours-title`;
  const span = sheetSpan(hours.locations);
  // Past shading, the now-mark and the booking ticks belong to one day, not to every weekday.
  const now = scope === "date" ? nowMinute(hours) : null;
  const added = editor.changed.filter(
    (provider) =>
      baselineOf(provider, scope).length === 0 && worksAhead(editor.draftOf(provider), lock),
  );
  const addedIds = new Set(added.map((provider) => provider.id));
  const groups = hours.locations.flatMap((place) => {
    const providers = hours.providers.filter(
      (provider) => homeOf(provider, hours.locations) === place.id,
    );
    return providers.length > 0 ? [{ place, providers }] : [];
  });

  return (
    <dialog
      ref={(node) => {
        editor.dialog.current = node;
        if (node !== null && !node.open) {
          node.toggleAttribute("data-instant", instant);
          node.showModal();
        }
      }}
      aria-modal="true"
      aria-labelledby={titleId}
      className="portal-confirm-dialog wgi-hours-sheet"
      onKeyDown={keepFocusInSheet}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        /* Escape inside the open help popover closes the popover, not the sheet under it. */
        if (event.currentTarget.querySelector('[data-slot="popover-content"][data-open]')) return;
        editor.close(null, true);
      }}
    >
      <PopoverContainer value={editor.dialog}>
        <header className="wgi-hours-head">
          <h2 id={titleId} className="portal-confirm-dialog-title">
            Hours for {shortDate(hours.date).split(",").at(0)},{" "}
            {LONG_DATE.format(new Date(`${hours.date}T12:00:00Z`))}
          </h2>
          <p className="wgi-hours-subtitle" aria-live="polite">
            {subtitleOf(editor, hours, added)}
          </p>
        </header>
        <ScopeBand hours={hours} scope={scope} onChange={editor.chooseScope} />
        <div className="wgi-hours-rows">
          <HoursRuler span={span} now={now} />
          {groups.map(({ place, providers }) => (
            <section key={place.id} className="wgi-hours-group" aria-label={placeName(place)}>
              <h3 className="wgi-hours-group-head">
                <span className="wgi-hours-group-name">{placeName(place)}</span>
                {`${String(providers.filter((provider) => editor.draftOf(provider).length > 0).length)} of ${String(providers.length)} working`}
              </h3>
              {providers.map((provider) => (
                <HoursRow
                  key={provider.id}
                  provider={provider}
                  hours={hours}
                  scope={scope}
                  span={span}
                  lock={lock}
                  now={now}
                  draft={editor.draftOf(provider)}
                  settledWindows={editor.settledOf(provider)}
                  live={live?.providerId === provider.id ? live : null}
                  rowCheck={editor.checkOf(provider.id)}
                  isAdded={addedIds.has(provider.id)}
                  onDrag={(index, windows) => {
                    editor.drag(provider.id, index, windows);
                  }}
                  onCommit={(windows) => {
                    editor.commit(provider, windows);
                  }}
                  onReschedule={(id) => {
                    editor.close(id, false);
                  }}
                />
              ))}
            </section>
          ))}
        </div>
        <HoursFoot
          hours={hours}
          editor={editor}
          settingsFor={editor.changed.at(0) ?? hours.providers.at(0)}
        />
      </PopoverContainer>
    </dialog>
  );
}

function ScopeBand({
  hours,
  scope,
  onChange,
}: Readonly<{ hours: DayHours; scope: DayHoursScope; onChange: (next: DayHoursScope) => void }>) {
  const line = scopeLine(scope, hours);
  return (
    <div className="wgi-hours-scope">
      <SegmentedControl<DayHoursScope>
        aria-label="Which days"
        options={scopeOptions(longDay(hours.weekday))}
        value={scope}
        className="wgi-hours-scope-switch"
        onValueChange={onChange}
      />
      <p className="wgi-hours-scope-line">
        {line.lead === "" ? null : <strong>{line.lead}</strong>}
        {line.rest}
      </p>
    </div>
  );
}

function HoursRuler({ span, now }: Readonly<{ span: MinuteSpan; now: number | null }>) {
  return (
    <div aria-hidden="true" className="wgi-hours-ruler">
      <span className="wgi-hours-ruler-marks">
        {rulerLabels(span.open + 60, span.close).map(({ minute, label }) => (
          <span key={minute} style={{ left: `${String(rulerAt(span, minute))}%` }}>
            {label}
          </span>
        ))}
        {now !== null && now > span.open && now < span.close ? (
          <span className="wgi-hours-now-tick" style={{ left: `${String(rulerAt(span, now))}%` }} />
        ) : null}
      </span>
    </div>
  );
}

function HoursFoot({
  hours,
  editor,
  settingsFor,
}: Readonly<{
  hours: DayHours;
  editor: HoursEditor;
  settingsFor: DayHoursProvider | undefined;
}>) {
  return (
    <footer className="wgi-hours-foot">
      <HelpButton
        topic="changing-hours-one-day"
        values={{ date: shortDate(hours.date), weekday: longDay(hours.weekday) }}
      />
      {settingsFor === undefined ? null : (
        <Link
          href={`/admin/settings/providers?provider=${settingsFor.id}`}
          className="wgi-hours-settings-link"
        >
          Weekly hours and time off are in Settings ›
        </Link>
      )}
      {editor.error === null ? null : (
        <p className="wgi-hours-error" role="alert">
          {editor.error}
        </p>
      )}
      <div className="wgi-hours-actions">
        <Button
          variant="outline"
          onClick={(event) => {
            editor.close(null, event.detail === 0);
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={!editor.ready}
          aria-busy={editor.saving || undefined}
          onClick={editor.save}
        >
          {editor.saving ? "Saving…" : saveLabel(editor.scope, hours)}
        </Button>
      </div>
    </footer>
  );
}

/* ---- A provider's row ---- */

interface RowProps {
  readonly provider: DayHoursProvider;
  readonly hours: DayHours;
  readonly scope: DayHoursScope;
  readonly span: MinuteSpan;
  readonly lock: number | null;
  readonly now: number | null;
  readonly draft: readonly HoursWindow[];
  readonly settledWindows: readonly HoursWindow[];
  readonly live: LiveDrag | null;
  readonly rowCheck: RowCheck | undefined;
  readonly isAdded: boolean;
  readonly onDrag: (index: number, windows: readonly HoursWindow[]) => void;
  readonly onCommit: (windows: readonly HoursWindow[]) => void;
  readonly onReschedule: (appointmentId: string) => void;
}

function HoursRow(props: RowProps) {
  const { provider, hours, scope, lock, draft, settledWindows, live, rowCheck, onCommit } = props;
  const shown = live === null ? draft : live.windows;
  const working = worksAhead(draft, lock) || draft.length > 0;
  const canWork = switchedOn(provider, hours.locations, lock).some(
    (window) => lock === null || window.closeMinute > lock,
  );
  const conflict = rowCheck?.state === "conflict" ? rowCheck : null;
  const nameId = `${provider.id}-hours-name`;
  const track = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        className="wgi-hours-row"
        data-off={working ? undefined : ""}
        data-added={props.isAdded ? "" : undefined}
        data-conflict={conflict === null ? undefined : ""}
      >
        <RowWho {...props} nameId={nameId} working={working} shown={shown} />
        <RowTrack
          {...props}
          trackRef={track}
          working={working}
          shown={shown}
          showWas={live !== null || conflict !== null}
        />
        <Switch
          checked={worksAhead(draft, lock)}
          disabled={!canWork && !worksAhead(draft, lock)}
          aria-labelledby={nameId}
          aria-label={undefined}
          onCheckedChange={(on: boolean) => {
            onCommit(
              on ? switchedOn(provider, hours.locations, lock) : switchedOff(provider, lock),
            );
          }}
        />
      </div>
      {conflict === null ? null : (
        <ConflictBanner
          provider={provider}
          hours={hours}
          scope={scope}
          lock={lock}
          conflicts={conflict.conflicts}
          settledWindows={settledWindows}
          draft={draft}
          onKeep={() => {
            onCommit(settledWindows);
            // The banner and its button leave with the conflict; the bar's end takes focus.
            requestAnimationFrame(() => {
              const ends = track.current?.querySelectorAll<HTMLInputElement>("input[type=range]");
              (ends === undefined ? undefined : [...ends].at(-1))?.focus();
            });
          }}
          onReschedule={props.onReschedule}
        />
      )}
      {rowCheck?.state === "refused" ? (
        <p className="wgi-hours-refused" role="alert">
          {rowCheck.message}
        </p>
      ) : null}
    </>
  );
}

/** The provider's name, and under it their hours, or the office menu for someone just added. */
function RowWho({
  provider,
  hours,
  lock,
  draft,
  isAdded,
  onCommit,
  nameId,
  working,
  shown,
}: Readonly<RowProps & { nameId: string; working: boolean; shown: readonly HoursWindow[] }>) {
  const place = hours.locations.find((location) => location.id === draft.at(0)?.locationId);
  return (
    <div className="wgi-hours-who">
      <span id={nameId} className="wgi-hours-name">
        {provider.name}
      </span>
      {isAdded ? (
        <Menu>
          <MenuTrigger
            className="wgi-hours-place"
            aria-label={`${provider.name}'s office: ${place === undefined ? "none" : placeName(place)}`}
          >
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{place === undefined ? "Office" : placeName(place)}</span>
            <ChevronDown aria-hidden="true" className="size-3 shrink-0" />
          </MenuTrigger>
          <MenuContent className="min-w-48">
            <MenuRadioGroup
              value={place?.id ?? ""}
              onValueChange={(id: string) => {
                onCommit(movedTo(draft, id, provider, hours.locations, lock));
              }}
            >
              {hours.locations.map((location) => (
                <MenuRadioItem
                  key={location.id}
                  value={location.id}
                  closeOnClick
                  disabled={officeHours(location) === null}
                >
                  <span className="truncate">{placeName(location)}</span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      ) : (
        <span className="wgi-hours-sub">{working ? hoursWords(shown) : usualLine(provider)}</span>
      )}
    </div>
  );
}

/** The track: past shading, the last good hours dashed while a change is open, each window's
    bar, the drag pill and the booking ticks. */
function RowTrack({
  provider,
  hours,
  scope,
  span,
  lock,
  now,
  draft,
  settledWindows,
  live,
  onDrag,
  onCommit,
  trackRef,
  working,
  shown,
  showWas,
}: Readonly<
  RowProps & {
    trackRef: RefObject<HTMLDivElement | null>;
    working: boolean;
    shown: readonly HoursWindow[];
    showWas: boolean;
  }
>) {
  const stranded = strandedIds(provider, shown);
  return (
    <div ref={trackRef} className="wgi-hours-track" style={hourLines(span)}>
      {now !== null && now > span.open ? (
        <span className="wgi-hours-past" style={barStyle(span, span.open, now)} />
      ) : null}
      {working ? null : <span className="wgi-hours-off">{offText(scope, hours.weekday)}</span>}
      {showWas
        ? settledWindows.map((window) => (
            <span
              key={`was-${String(window.openMinute)}`}
              aria-hidden="true"
              className="wgi-hours-was"
              style={barStyle(span, window.openMinute, window.closeMinute)}
            />
          ))
        : null}
      {draft.map((window, index) => (
        <WindowBar
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- a day's windows are positional: the first stays the first while its ends are dragged, and keying by its minutes would remount the slider under the pointer
          key={index}
          label={`${provider.name}${draft.length > 1 ? `, window ${String(index + 1)}` : ""}`}
          index={index}
          window={window}
          current={shown.at(index) ?? window}
          draft={draft}
          hours={hours}
          span={span}
          lock={lock}
          onDrag={onDrag}
          onCommit={onCommit}
        />
      ))}
      {live === null ? null : <DragPill span={span} live={live} draft={draft} />}
      {scope === "date"
        ? provider.bookings.map((booking) => (
            <span
              key={booking.id}
              aria-hidden="true"
              className="wgi-hours-tick"
              data-stranded={stranded.has(booking.id) ? "" : undefined}
              style={barStyle(span, bookingStart(booking), endMinute(booking.endsAt))}
            />
          ))
        : null}
    </div>
  );
}

function windowsWith(
  draft: readonly HoursWindow[],
  index: number,
  [open, close]: readonly [number, number],
): HoursWindow[] {
  return draft.map((window, at) =>
    at === index ? { ...window, openMinute: open, closeMinute: close } : window,
  );
}

/** A started window keeps its start; its end can come back no earlier than now. */
function clampEnds(
  window: Readonly<HoursWindow>,
  value: readonly number[],
  lock: number | null,
): [number, number] {
  const [open = 0, close = 0] = value;
  if (lock !== null && window.openMinute < lock)
    return [window.openMinute, Math.max(close, lock, window.openMinute + QUARTER_HOUR)];
  return [open, close];
}

/** One window: a two-ended slider, or a still bar once it has passed. */
function WindowBar({
  label,
  index,
  window,
  current,
  draft,
  hours,
  span,
  lock,
  onDrag,
  onCommit,
}: Readonly<{
  label: string;
  index: number;
  window: HoursWindow;
  current: HoursWindow;
  draft: readonly HoursWindow[];
  hours: DayHours;
  span: MinuteSpan;
  lock: number | null;
  onDrag: (index: number, windows: readonly HoursWindow[]) => void;
  onCommit: (windows: readonly HoursWindow[]) => void;
}>) {
  if (lock !== null && window.closeMinute <= lock)
    return (
      <span
        className="wgi-hours-bar"
        style={barStyle(span, window.openMinute, window.closeMinute)}
        role="img"
        aria-label={`${label}: ${clockOf(window.openMinute)} to ${clockOf(window.closeMinute)}, passed`}
      />
    );
  const range = windowRange(draft, index, hours.locations, lock);
  const min = Math.max(span.open, Math.min(range.open, window.openMinute));
  const max = Math.min(span.close, Math.max(range.close, window.closeMinute));
  return (
    <Slider
      tone="hours"
      className="wgi-hours-slider"
      style={barStyle(span, min, max)}
      min={min}
      max={max}
      step={QUARTER_HOUR}
      largeStep={60}
      minStepsBetweenValues={1}
      value={[current.openMinute, current.closeMinute]}
      thumbLabel={(thumb) => `${label} ${thumb === 0 ? "start" : "end"}`}
      thumbValueText={(minute) => clockOf(minute)}
      onValueChange={(value: readonly number[]) => {
        onDrag(index, windowsWith(draft, index, clampEnds(window, value, lock)));
      }}
      onValueCommitted={(value: readonly number[]) => {
        onCommit(windowsWith(draft, index, clampEnds(window, value, lock)));
      }}
    />
  );
}

/** "Ends 2:00 PM" over the end being dragged, or "Starts 9:00 AM" over the start. */
function DragPill({
  span,
  live,
  draft,
}: Readonly<{ span: MinuteSpan; live: LiveDrag; draft: readonly HoursWindow[] }>) {
  const now = live.windows.at(live.index);
  const was = draft.at(live.index);
  if (now === undefined) return null;
  const ends = was === undefined || now.closeMinute !== was.closeMinute;
  const minute = ends ? now.closeMinute : now.openMinute;
  return (
    <span
      aria-hidden="true"
      className="wgi-hours-pill-time"
      style={{ left: `${String(rulerAt(span, minute))}%` }}
    >
      {ends ? "Ends" : "Starts"} {clockOf(minute)}
    </span>
  );
}

/* ---- H2: a change that would strand a visit ---- */

function Patient({ children }: Readonly<{ children: ReactNode }>) {
  return <span data-ui-redact="patient-name">{children}</span>;
}

function conflictWhen(conflict: Readonly<DayHoursConflict>, hours: Readonly<DayHours>): string {
  const time = practiceTime(conflict.startsAt);
  return conflict.date === hours.date ? `at ${time}` : `${monthDay(conflict.date)} at ${time}`;
}

function ConflictBanner({
  provider,
  hours,
  scope,
  lock,
  conflicts,
  settledWindows,
  draft,
  onKeep,
  onReschedule,
}: Readonly<{
  provider: DayHoursProvider;
  hours: DayHours;
  scope: DayHoursScope;
  lock: number | null;
  conflicts: readonly DayHoursConflict[];
  settledWindows: readonly HoursWindow[];
  draft: readonly HoursWindow[];
  onKeep: () => void;
  onReschedule: (appointmentId: string) => void;
}>) {
  const keep = keepChoice(settledWindows, draft, provider, scope, hours.weekday, lock);
  const first = conflicts.at(0);
  if (first === undefined) return null;
  const doctor = shortName(provider.name);
  const movable = conflicts.find((conflict) => conflict.date === hours.date);
  const shown = conflicts.slice(0, 3);
  const more = conflicts.length - shown.length;
  return (
    <div className="wgi-hours-banner" role="alert">
      {conflicts.length === 1 ? (
        <p className="wgi-hours-banner-text">
          <Patient>{first.patientName}</Patient> is booked {conflictWhen(first, hours)} with{" "}
          {doctor}. Move <Patient>{firstName(first.patientName)}</Patient> first, or {keep.phrase}.
        </p>
      ) : (
        <div className="wgi-hours-banner-text">
          <p>
            {`${String(conflicts.length)} visits with ${doctor} fall outside these hours. Move them first, or ${keep.phrase}.`}
          </p>
          <ul className="wgi-hours-banner-list">
            {shown.map((conflict) => (
              <li key={conflict.id}>
                <Patient>{conflict.patientName}</Patient> · {shortDate(conflict.date)},{" "}
                {practiceTime(conflict.startsAt)}
              </li>
            ))}
            {more > 0 ? <li>{`and ${String(more)} more`}</li> : null}
          </ul>
        </div>
      )}
      <div className="wgi-hours-banner-actions">
        <Button variant="outline" size="sm" className="bg-white" onClick={onKeep}>
          {keep.button}
        </Button>
        {movable === undefined ? null : (
          <button
            type="button"
            className="wgi-hours-reschedule"
            onClick={() => {
              onReschedule(movable.id);
            }}
          >
            Reschedule <Patient>{firstName(movable.patientName)}</Patient> ›
          </button>
        )}
      </div>
    </div>
  );
}
