import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import {
  findPeopleOutcomeSchema,
  patientVisitSchema,
} from "../../src/lib/portal/patients/contracts";
import { expectDenied } from "../harness/assert";
import { publishableDb, runId, serviceDb } from "../harness/env";
import { savePatient } from "../harness/patients";
import { createSchedulingFixture } from "../harness/scheduling";
import { insertRequest } from "./support";

/* Issue #356: the schedule's search, read at the database. A name matches by the start of any of
   its words in any order and without its accents; a phone matches by its digits whatever the
   formatting, with a typed country code dropped. Open requests no patient is linked to come back
   as people of their own. Each person carries where they stand, and the list orders by it: a
   visit today, then the next one, then an open request, then the rest. Browser roles never reach
   the read. The shared Preview database has other people, so every check is scoped to this run's
   names and number. */

/** A word only this run's people have: the run id with its digits spelled as letters. */
const tag = runId.replaceAll(/\d/gu, (digit) => "ghijklmnop"[Number(digit)]);
/** A phone number only this run's people have. */
const line = String(Number.parseInt(runId, 16) % 10_000_000).padStart(7, "0");
const phone = `813${line}`;
const visitsReadSchema = z.object({
  ok: z.literal(true),
  appointments: z.object({
    items: z.array(patientVisitSchema),
    total: z.number().int().nonnegative(),
  }),
});

test("people are found by any word of their name or the digits of their phone, in standing order", async () => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `find-${runId}`);
  const actor = fixture.staff.userId;
  const requestIds = [randomUUID(), randomUUID(), randomUUID()];
  async function find(query: string) {
    const result = await db.rpc("portal_find_people", {
      p_actor_id: actor,
      p_query: query,
      p_limit: 20,
    });
    expect(result.error).toBeNull();
    const outcome = findPeopleOutcomeSchema.parse(result.data);
    if (!outcome.ok) throw new Error(`Search failed: ${outcome.code}`);
    return outcome;
  }
  try {
    const names = {
      today: `Tess ${tag} Lindqvist`,
      booked: `María-José ${tag} Pérez`,
      unbooked: `Owen ${tag} O'Neill`,
      linked: `Ruth ${tag} Abara`,
      waiting: `Nadia ${tag} Brooks`,
      calling: `Callum ${tag} Reyes`,
      closed: `Closed ${tag} Person`,
    };
    const ids: Record<string, string> = {};
    for (const key of ["today", "booked", "unbooked", "linked"] as const) {
      const created = await savePatient(db, actor, {
        kind: "create",
        patient: {
          name: names[key],
          phone: key === "booked" ? `(813) ${line.slice(0, 3)}-${line.slice(3)}` : null,
        },
      });
      if (!created.ok) throw new Error("Patient fixture failed");
      fixture.patientIds.push(created.patientId);
      ids[key] = created.patientId;
    }
    const followUpAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
    await insertRequest(db, { id: requestIds[0], name: names.waiting, phone });
    await insertRequest(db, {
      id: requestIds[1],
      name: names.calling,
      phone: "8135550100",
      status: "contacted",
      follow_up_at: followUpAt,
    });
    await insertRequest(db, {
      id: requestIds[2],
      name: names.closed,
      phone,
      status: "closed",
      closure_reason: "wont_schedule",
      closed_at: new Date().toISOString(),
    });
    // A request linked to a patient is that patient's, not a person of its own.
    const linkRequest = randomUUID();
    requestIds.push(linkRequest);
    await insertRequest(db, { id: linkRequest, name: names.linked, status: "contacted" });
    const linked = await savePatient(db, actor, {
      kind: "link_request",
      patientId: ids.linked,
      expectedVersion: 1,
      requestId: linkRequest,
    });
    expect(linked).toMatchObject({ ok: true });
    const booking = fixture.booking("10:00");
    expect(
      await fixture.save({ ...booking, command: { ...booking.command, patientId: ids.booked } }),
    ).toMatchObject({ ok: true });

    /* Booking refuses a time already past, so today's visit is booked ahead, then moved to
       this morning and checked in. */
    const visit = fixture.booking("11:00");
    const today = await fixture.save({
      ...visit,
      command: { ...visit.command, patientId: ids.today },
    });
    if (!today.ok) throw new Error("Today's booking failed");
    const morning = new Date(
      `${new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })}T09:00:00-04:00`,
    );
    const moved = await db
      .from("appointments")
      .update({
        starts_at: morning.toISOString(),
        ends_at: new Date(morning.getTime() + 30 * 60_000).toISOString(),
        reserved_from: new Date(morning.getTime() - 5 * 60_000).toISOString(),
        reserved_until: new Date(morning.getTime() + 35 * 60_000).toISOString(),
        status: "checked_in",
      })
      .eq("id", today.id);
    expect(moved.error).toBeNull();

    const everyone = await find(tag);
    expect(everyone.anyone).toBe(true);
    expect(everyone.total).toBe(6);
    expect(everyone.people[0]).toMatchObject({
      kind: "patient",
      id: ids.today,
      status: { kind: "appointment", when: "today", appointmentId: today.id, status: "checked_in" },
    });
    expect(everyone.people.slice(1).map((person) => person.name)).toEqual([
      names.booked,
      names.calling,
      names.waiting,
      names.linked,
      names.unbooked,
    ]);
    const [, next, calling, waiting, ruth, owen] = everyone.people;
    expect(next).toMatchObject({
      kind: "patient",
      id: ids.booked,
      status: { kind: "appointment", when: "next", status: "scheduled" },
    });
    expect(next.status.kind === "appointment" && next.status.providerName).toBe(
      `TEST find-${runId} First`,
    );
    expect(calling).toMatchObject({
      kind: "request",
      id: requestIds[1],
      status: { kind: "request", requestId: requestIds[1], requestStatus: "contacted" },
    });
    expect(calling.status.kind === "request" && Date.parse(calling.status.followUpAt ?? "")).toBe(
      Date.parse(followUpAt),
    );
    expect(ruth).toMatchObject({
      kind: "patient",
      id: ids.linked,
      status: { kind: "request", requestId: linkRequest, requestStatus: "contacted" },
    });
    expect(waiting).toMatchObject({
      kind: "request",
      phone,
      status: { kind: "request", requestStatus: "new", followUpAt: null },
    });
    expect(owen).toMatchObject({ kind: "patient", status: { kind: "none", lastVisitAt: null } });

    // Any word's start, in any order, without accents or punctuation.
    for (const query of [`mar ${tag}`, `${tag} jose`, `PEREZ ${tag.slice(0, 4)}`, `maría ${tag}`]) {
      expect(
        (await find(query)).people.map((person) => person.name),
        query,
      ).toEqual([names.booked]);
    }
    expect((await find(`oneill ${tag}`)).people.map((person) => person.name)).toEqual([
      names.unbooked,
    ]);
    // A word must start the name's word: the middle of one is no match.
    expect((await find(`${tag} erez`)).total).toBe(0);

    // Phone digits, however typed; a leading +1 or 1 is the country code.
    for (const query of [
      line,
      `${line.slice(0, 3)}-${line.slice(3)}`,
      `(813) ${line.slice(0, 3)} ${line.slice(3)}`,
      `+1 813 ${line}`,
      `1 (813) ${line}`,
      `1813${line}`,
    ]) {
      const found = await find(query);
      expect(found.people.map((person) => person.name).toSorted(), query).toEqual(
        [names.booked, names.waiting].toSorted(),
      );
    }

    // Results start from the second character, two digits included.
    expect((await find(line.slice(0, 2))).total).toBeGreaterThanOrEqual(2);

    // Too little to search returns nobody, and still says whether anyone exists.
    for (const query of ["", " ", "m", "8", "--"]) {
      expect(await find(query), JSON.stringify(query)).toEqual({
        ok: true,
        anyone: true,
        total: 0,
        people: [],
      });
    }
    const limited = await db.rpc("portal_find_people", {
      p_actor_id: actor,
      p_query: tag,
      p_limit: 2,
    });
    expect(limited.error).toBeNull();
    expect(findPeopleOutcomeSchema.parse(limited.data)).toMatchObject({
      ok: true,
      total: 6,
      people: [{ id: ids.today }, { id: ids.booked }],
    });
    expect(
      (await db.rpc("portal_find_people", { p_actor_id: actor, p_query: "x".repeat(255) })).data,
    ).toEqual({ ok: false, code: "invalid_command" });
  } finally {
    await db.from("patient_request_links").delete().in("request_id", requestIds);
    await db.from("requests").delete().in("id", requestIds);
    await fixture.dispose();
  }
});

test("a patient's read lists their visits latest first, without the cancelled ones", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `find-visits-${runId}`);
  try {
    const ids: string[] = [];
    for (const time of ["09:00", "11:00", "14:00"]) {
      const booked = await fixture.save(fixture.booking(time));
      if (!booked.ok) throw new Error(`Booking at ${time} failed`);
      ids.push(booked.id);
    }
    expect(
      await fixture.save({
        action: "command",
        idempotencyKey: randomUUID(),
        command: { kind: "cancel", id: ids[1], expectedVersion: 1, reason: "TEST cancelled visit" },
      }),
    ).toMatchObject({ ok: true });
    /* The patient's own fields stay in the row shape the server maps
       (rows.ts); the visits arrive in the shape the record reads. */
    const visitsOf = async (patientId: string | undefined) => {
      const read = await db.rpc("portal_read_patient", {
        p_actor_id: fixture.staff.userId,
        p_patient_id: patientId,
      });
      expect(read.error).toBeNull();
      return visitsReadSchema.parse(read.data).appointments;
    };
    const visits = await visitsOf(fixture.patientIds[0]);
    expect(visits.total).toBe(2);
    expect(visits.items.map((visit) => visit.id)).toEqual([ids[2], ids[0]]);
    expect(visits.items[0]).toMatchObject({
      status: "scheduled",
      version: 1,
      sourceRequestId: null,
      providerId: fixture.providerIds[0],
      providerName: `TEST find-visits-${runId} First`,
      locationId: fixture.locationIds[0],
      appointmentTypeId: fixture.typeId,
    });
    // Another patient's read carries none of them.
    expect(await visitsOf(fixture.patientIds[1])).toEqual({ total: 0, items: [] });
  } finally {
    await fixture.dispose();
  }
});

test("browser roles cannot search, and an inactive actor is refused", async () => {
  const db = serviceDb();
  const browser = publishableDb();
  const fixture = await createSchedulingFixture(db, `find-access-${runId}`);
  try {
    const args = { p_actor_id: fixture.staff.userId, p_query: tag, p_limit: 20 };
    expectDenied(await browser.rpc("portal_find_people", args));
    expectDenied(await browser.rpc("portal_name_key", { p_name: tag }));
    const signIn = await browser.auth.signInWithPassword(fixture.staff);
    expect(signIn.error).toBeNull();
    expectDenied(await browser.rpc("portal_find_people", args));
    expect(
      (await db.rpc("portal_find_people", { ...args, p_actor_id: randomUUID() })).data,
    ).toEqual({ ok: false, code: "unauthorized" });
    const deactivated = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", fixture.staff.userId);
    expect(deactivated.error).toBeNull();
    expect((await db.rpc("portal_find_people", args)).data).toEqual({
      ok: false,
      code: "unauthorized",
    });
  } finally {
    await fixture.dispose();
  }
});
