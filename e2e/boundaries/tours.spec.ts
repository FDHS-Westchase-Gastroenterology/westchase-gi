import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";

import { expectDenied } from "../harness/assert";
import { publishableDb, runId, serviceDb } from "../harness/env";
import { createStaffFixture } from "../harness/session";
import type { StaffFixture } from "../harness/session";

/* Issue #358: the first-sign-in tours keep one record per account and tour
   (staff_tours), written only through portal_set_staff_tour. Front desk
   takes its own tour; an admin may take both. The session read names the
   tour to start from these records (auth.ts pendingTourFor); the portal
   specs in e2e/portal/tours.spec.ts sign in and watch it start. */

test.use({ trace: "off" });

test.describe("Staff tour records", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("records each tour per account, refuses the admin tour to front desk, and audits", async () => {
    const db = serviceDb();
    const fixtures: StaffFixture[] = [];
    try {
      const desk = await createStaffFixture(db, {
        prefix: `tour-desk-${runId}`,
        displayName: "TEST Tour Front Desk",
      });
      fixtures.push(desk);
      const admin = await createStaffFixture(db, {
        prefix: `tour-admin-${runId}`,
        displayName: "TEST Tour Admin",
        role: "admin",
      });
      fixtures.push(admin);
      const set = (userId: string, tour: string, status: string) =>
        db.rpc("portal_set_staff_tour", { p_user_id: userId, p_tour: tour, p_status: status });
      const records = async (userId: string) => {
        const read = await db
          .from("staff_tours")
          .select("tour, status")
          .eq("staff_user_id", userId)
          .order("tour");
        expect(read.error).toBeNull();
        return read.data;
      };

      // A fresh account has no record: its role's tour starts on first sign-in.
      expect(await records(desk.userId)).toEqual([]);

      // Front desk may not take the admin tour; nothing is written.
      expect((await set(desk.userId, "admin", "pending")).error?.code).toBe("42501");
      expect(await records(desk.userId)).toEqual([]);

      // Unknown tours and statuses, and accounts without an active profile, are refused.
      expect((await set(desk.userId, "manager", "pending")).error?.code).toBe("22023");
      expect((await set(desk.userId, "front_desk", "dismissed")).error?.code).toBe("22023");
      expect((await set(randomUUID(), "front_desk", "pending")).error?.code).toBe("P0002");

      // Skipping records the tour; the same status again changes nothing.
      const skipped = await set(desk.userId, "front_desk", "skipped");
      expect(skipped.error).toBeNull();
      expect(skipped.data).toBe(true);
      const again = await set(desk.userId, "front_desk", "skipped");
      expect(again.error).toBeNull();
      expect(again.data).toBe(false);
      expect(await records(desk.userId)).toEqual([{ tour: "front_desk", status: "skipped" }]);

      // Help restarts it, and Done finishes it.
      expect((await set(desk.userId, "front_desk", "pending")).data).toBe(true);
      expect((await set(desk.userId, "front_desk", "finished")).data).toBe(true);
      expect(await records(desk.userId)).toEqual([{ tour: "front_desk", status: "finished" }]);

      const audits = await db
        .from("audit_log")
        .select("action, entity, detail")
        .eq("actor_email", desk.email)
        .order("at");
      expect(audits.error).toBeNull();
      expect(audits.data).toEqual([
        {
          action: "staff.tour_dismiss",
          entity: "staff_profiles",
          detail: { tour: "front_desk", status: "skipped" },
        },
        {
          action: "staff.tour_restart",
          entity: "staff_profiles",
          detail: { tour: "front_desk", status: "pending" },
        },
        {
          action: "staff.tour_complete",
          entity: "staff_profiles",
          detail: { tour: "front_desk", status: "finished" },
        },
      ]);

      // An admin may take both tours, each kept on its own record.
      expect((await set(admin.userId, "admin", "finished")).error).toBeNull();
      expect((await set(admin.userId, "front_desk", "pending")).error).toBeNull();
      expect(await records(admin.userId)).toEqual([
        { tour: "admin", status: "finished" },
        { tour: "front_desk", status: "pending" },
      ]);

      // The records go with the account.
      await db.from("audit_log").delete().eq("actor_email", admin.email);
      await admin.dispose();
      fixtures.splice(fixtures.indexOf(admin), 1);
      expect(await records(admin.userId)).toEqual([]);
    } finally {
      for (const fixture of fixtures) {
        await db.from("audit_log").delete().eq("actor_email", fixture.email);
        await fixture.dispose();
      }
    }
  });

  test("keeps tour records and the command closed to browser clients", async () => {
    const db = serviceDb();
    const desk = await createStaffFixture(db, {
      prefix: `tour-closed-${runId}`,
      displayName: "TEST Tour Closed",
    });
    try {
      const anon = publishableDb();
      const signedIn = publishableDb();
      expect((await signedIn.auth.signInWithPassword(desk)).error).toBeNull();
      for (const client of [anon, signedIn]) {
        expectDenied(await client.from("staff_tours").select("*"));
        expectDenied(
          await client
            .from("staff_tours")
            .insert({ staff_user_id: desk.userId, tour: "front_desk", status: "finished" }),
        );
        expectDenied(
          await client.rpc("portal_set_staff_tour", {
            p_user_id: desk.userId,
            p_tour: "front_desk",
            p_status: "finished",
          }),
        );
      }
      const read = await db.from("staff_tours").select("tour").eq("staff_user_id", desk.userId);
      expect(read.data).toEqual([]);

      // The single dismissal column the records replaced is gone.
      const legacy = await db.from("staff_profiles").select("portal_tour_dismissed_at").limit(1);
      expect(legacy.error?.code).toBe("42703");
    } finally {
      await db.from("audit_log").delete().eq("actor_email", desk.email);
      await desk.dispose();
    }
  });
});
