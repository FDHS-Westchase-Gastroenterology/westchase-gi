/* The Activity log's demo history (issue #357): what staff did besides booking and settling
   visits. Some appointments were moved before they happened, some cancellations and no-shows
   were undone within a minute or two, two schedule changes were made in Settings, the front desk
   printed the New-request packet some mornings, and everyone signed in on the days they worked.
   Each part draws from its own random stream, so the rest of the dataset is the same without it. */
import { CANCEL_REASONS } from "./content.mjs";
import { DAY, HOUR, MIN, addDays, createRandom, iso, ny, nyDate, weekday } from "./context.mjs";
import { OFFICE_DAYS, isClosedDay } from "./roster.mjs";

/** Undo is offered for 15 minutes after a change; the demo undoes within four. */
const UNDO_WITHIN = 4;

/**
 * Rewrites some appointments' steps in place: a reschedule after booking (the earlier steps
 * carry the slot the visit was first booked into), a cancellation undone, or a no-show undone
 * before the patient was checked in. Request-managed visits keep their history, because moving
 * or cancelling them also changes their request.
 */
export function addAppointmentActivity(g, appts) {
  const { ri, pick } = createRandom(`${g.seed}:activity`);
  const { NOW, TYPES, staff } = g;
  const { hours, away } = g.clinic;
  const operator = staff.operator;
  const byProviderDay = new Map();
  for (const a of appts) {
    const key = `${a.provider}|${a.date}`;
    if (!byProviderDay.has(key)) byProviderDay.set(key, []);
    byProviderDay.get(key).push(a);
  }
  const free = (a, date, start) => {
    const h = hours[a.provider][weekday(date)];
    if (!h || h[0] !== a.loc || isClosedDay(date) || away[a.provider]?.has(date)) return false;
    if (a.patient.days.has(date)) return false;
    const until = start + (a.endsAt - a.startsAt) + a.type.after * MIN;
    return !(byProviderDay.get(`${a.provider}|${date}`) ?? []).some(
      (b) =>
        b.status !== "cancelled" && start < b.endsAt + b.type.after * MIN && until > b.startsAt,
    );
  };

  for (const a of appts) {
    if (a.request || a.type === TYPES.INF || a.steps[0]?.command !== "book") continue;
    const [book, next] = a.steps;
    const until = Math.min(next?.at ?? NOW, a.startsAt, NOW);
    const roll = ri(1, 1000);

    if (roll <= 45) {
      // Moved up a week: first booked into the same time seven days later.
      const date = addDays(a.date, 7);
      const priorStart = a.startsAt + (ny(date, 0) - ny(a.date, 0));
      if (!free(a, date, priorStart)) continue;
      const room = until - book.at - HOUR;
      if (room < HOUR) continue;
      const at = book.at + 30 * MIN + Math.floor((room * ri(10, 90)) / 100);
      const slot = {
        starts_at: iso(priorStart),
        ends_at: iso(priorStart + (a.endsAt - a.startsAt)),
        reserved_from: iso(priorStart),
        reserved_until: iso(priorStart + (a.endsAt - a.startsAt) + a.type.after * MIN),
      };
      book.slot = slot;
      a.steps.splice(1, 0, {
        command: "reschedule",
        status: "scheduled",
        at,
        by: operator,
        reason: null,
      });
    } else if (roll <= 60) {
      // Cancelled by mistake, then undone.
      const room = until - book.at - HOUR;
      if (room < HOUR) continue;
      const at = book.at + 20 * MIN + Math.floor((room * ri(10, 90)) / 100);
      a.steps.splice(
        1,
        0,
        { command: "cancel", status: "cancelled", at, by: operator, reason: pick(CANCEL_REASONS) },
        {
          command: "undo",
          status: "scheduled",
          at: at + ri(1, UNDO_WITHIN) * MIN,
          by: operator,
          reason: null,
        },
      );
    } else if (roll <= 72) {
      // Marked a no-show, then the patient arrived late: undone, checked in, seen.
      const commands = a.steps.map((s) => s.command).join(",");
      if (commands !== "book,check_in,complete" || a.endsAt > NOW - 3 * HOUR) continue;
      const complete = a.steps[2];
      const noShowAt = a.startsAt + ri(15, 20) * MIN;
      const undoAt = noShowAt + ri(1, UNDO_WITHIN) * MIN;
      const checkInAt = undoAt + ri(1, 3) * MIN;
      const completeAt = Math.max(
        complete.at,
        checkInAt + (a.endsAt - a.startsAt) + ri(2, 10) * MIN,
      );
      if (completeAt >= NOW) continue;
      a.steps.splice(
        1,
        2,
        { command: "no_show", status: "no_show", at: noShowAt, by: operator, reason: null },
        { command: "undo", status: "scheduled", at: undoAt, by: operator, reason: null },
        { command: "check_in", status: "checked_in", at: checkInAt, by: operator, reason: null },
        { ...complete, at: completeAt },
      );
    }
  }
}

/**
 * Sign-ins: each clinician on the days they see patients, the front desk on every office day,
 * a little before the first visit. Whole seconds, never after the reference time.
 */
export function signIns(g) {
  const { ri } = createRandom(`${g.seed}:sign-ins`);
  const { NOW, START, TODAY, staff } = g;
  const { hours, away } = g.clinic;
  const rows = [];
  for (let date = START; date <= TODAY; date = addDays(date, 1)) {
    if (isClosedDay(date)) continue;
    const wd = weekday(date);
    const people = Object.keys(hours)
      .filter((k) => hours[k][wd] && !away[k]?.has(date))
      .map((k) => ({ who: staff[k], open: hours[k][wd][1] }));
    if (OFFICE_DAYS.includes(wd)) people.push({ who: staff.operator, open: 8 * 60 });
    for (const { who, open } of people) {
      const at = ny(date, open - ri(10, 40)) + ri(0, 59) * 1000;
      if (at < NOW) rows.push({ user_id: who.id, email: who.email, at: iso(at) });
    }
  }
  return rows;
}

/**
 * Two changes made in Settings after setup: time off for the physician's conference, and the
 * next office closure on each office's calendar. Each entity is at version 2 afterwards, and
 * the closure row is created when the change was made. Returns the changes for sql.mjs, which
 * records each one's before and after the way portal_save_scheduling_settings does.
 */
export function settingsChanges(g, rows) {
  const { ri } = createRandom(`${g.seed}:settings`);
  const { TODAY, staff } = g;
  const operator = staff.operator;
  const changes = [];
  /** A weekday morning 10–24 days before `date`, or in the past week when that is still ahead. */
  function when(date) {
    let day = addDays(date, -ri(10, 24));
    if (day >= TODAY) day = addDays(TODAY, -ri(1, 6));
    while (!OFFICE_DAYS.includes(weekday(day)) || isClosedDay(day)) day = addDays(day, -1);
    return ny(day, 9 * 60 + ri(0, 90)) + ri(0, 59) * 1000;
  }
  const bump = (row, at) => {
    const before = { version: row.version, updated_at: row.updated_at, updated_by: row.updated_by };
    Object.assign(row, { version: row.version + 1, updated_at: iso(at), updated_by: operator.id });
    return before;
  };

  const exception = rows.provider_time_exceptions[0];
  const provider = rows.scheduling_providers.find((p) => p.id === exception?.provider_id);
  if (exception && provider) {
    const at = when(nyDate(Date.parse(exception.starts_at)));
    if (at > Date.parse(provider.created_at) + DAY) {
      changes.push({
        entity: "provider",
        entity_id: provider.id,
        command: "add_time_off",
        item_id: exception.id,
        before_patch: bump(provider, at),
        actor_id: operator.id,
        actor_email: operator.email,
        occurred_at: iso(at),
      });
    }
  }

  for (const location of rows.scheduling_locations) {
    const closures = rows.location_closures
      .filter((c) => c.location_id === location.id)
      .sort((x, y) => (x.closed_on < y.closed_on ? -1 : 1));
    const closure = closures.find((c) => c.closed_on > TODAY) ?? closures.at(-1);
    if (!closure) continue;
    const at = when(closure.closed_on);
    if (at <= Date.parse(location.created_at) + DAY) continue;
    closure.created_at = iso(at);
    changes.push({
      entity: "location",
      entity_id: location.id,
      command: "add_location_closure",
      item_id: closure.id,
      before_patch: bump(location, at),
      actor_id: operator.id,
      actor_email: operator.email,
      occurred_at: iso(at),
    });
  }
  return changes;
}

/**
 * The front desk prints the New-request packet on some office-day mornings. sql.mjs fills each
 * packet with the requests that were new at that moment and leaves out a packet with none.
 */
export function printPackets(g) {
  const { ri, chance } = createRandom(`${g.seed}:print`);
  const { NOW, START, TODAY } = g;
  const packets = [];
  for (let date = START; date <= TODAY; date = addDays(date, 1)) {
    if (!OFFICE_DAYS.includes(weekday(date)) || isClosedDay(date) || !chance(0.4)) continue;
    const at = ny(date, 8 * 60 + ri(5, 50)) + ri(0, 59) * 1000;
    if (at < NOW) packets.push({ actor_email: g.staff.operator.email, at: iso(at) });
  }
  return packets;
}
