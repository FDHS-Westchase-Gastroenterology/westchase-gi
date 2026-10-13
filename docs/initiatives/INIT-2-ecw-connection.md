# INIT-2 · eCW connection: built to sync, shipped with double entry

## Progress

**Status:** Not started. Waits on INIT-1 (the new AWS stack and Drizzle).

**Last updated:** 2026-10-13

To keep this current: when a PR finishes a step, tick its box in that same PR, add the PR number next to it (like `(#412)`), and update **Status** and **Last updated**.

Steps (from "Order"):

- [ ] 1. Double entry: eCW status fields, outbox, manual adapter and the "Needs entering in eCW" worklist.
- [ ] 2. The settings page.
- [ ] 3. The read connection and backfill.
- [ ] 4. The step-2 pack: the FDHS write-connection request and the business case template.

Waiting on Jason:

- [ ] Sign the BAA with FDHS (listed in INIT-1). The read connection needs it first.
- [ ] Register the app on eCW's developer portal under the company.
- [ ] Get FDHS's eCW admin to switch on the app and build the Registry patient group.
- [ ] Have the clinic review the first match list.
- [ ] Review the FDHS request pack and business case template.
- [ ] Send the step-2 request through FDHS.

## The ask

Make the portal a good neighbor to eClinicalWorks (eCW). The work has two halves.

1. **Ship safe double entry now.** Until FDHS pays for an automatic write connection, front-desk staff enter each booking in both the portal and eCW. Make that hard to get wrong. Every appointment should know whether it's in eCW, and a worklist should show exactly what still needs entering, updating or cancelling there.
2. **Build the plumbing for automatic sync, and use the free read connection.** Every booking change goes through an outbox and an adapter, so an automatic eCW adapter can drop in later without touching any screen. Meanwhile, use eCW's free read connection to pre-load patients, insurance and visit history, so staff stop retyping what eCW already knows.

## Why

The clinic wants to work entirely in our portal, but eCW stays their system of record for charting and billing. Double entry is the reality on day one, and the worklist turns it from "hope someone remembered" into a checklist.

The backfill is the hook: the portal instantly knows every returning patient. Once the clinic relies on the portal, FDHS has a reason to fund the write connection, and our side will already be built.

## What we know about eCW (researched 6 Oct)

- **The read connection is free and self-service.**
  - eCW's certified FHIR R4 APIs are "available ... at no cost at this time," with 30 days' notice before any fee. Federal rules (45 CFR 170.404) cap fees anyway.
  - You register a backend-services app on eCW's developer portal: SMART Backend Services, RS384-signed assertions, public keys at a JWKS URL.
  - FDHS's eCW admin activates it under Admin → Product Activation → FHIR APIs.
  - We need a BAA with FDHS first.
- **What it can read.**
  - Patient, Coverage, Encounter, Practitioner, PractitionerRole, Location and Organization.
  - A whole population comes through a bulk export (`$export`) of a patient group FDHS saves in eCW's Registry.
  - There's no "changed since" filter on patients, so a refresh means re-exporting and comparing.
  - Expect around 250 calls a minute per practice.
- **What it can't do.** No Appointment, Schedule or Slot, and no writes except questionnaire answers. Writing appointments needs the healow scheduling API (contract) or an HL7 SIU interface (paid). FDHS requests either through interop@eclinicalworks.com.
- **There's no test server for backend apps.** Build against a local FHIR server (HAPI FHIR with Synthea patients) shaped like eCW's capability statement. The first real run is against FDHS's own eCW.
- Full research is in `benchmark/reviews/2026-10-06-ecw-read-connection.md` in the project.

## Already decided

- **Link fields.**
  - Appointments get an eCW status: `not_entered`, `entered`, `needs_update`, `needs_cancel`, `synced` or `mismatch`. They also get the eCW appointment number and a record of who marked them and when.
  - Patients get the eCW chart number (MRN) and FHIR ID, with where each field came from and when it was refreshed.
- **Outbox and adapter.**
  - Every create, reschedule and cancel writes exactly one outbox event in the same transaction.
  - One adapter interface covers the scheduling side: create, update or cancel an appointment; find or upsert a patient; list appointments in a date range; health check.
  - The manual adapter ships now and turns events into worklist items.
  - A live write adapter is out of scope until FDHS has a contract.
- **Worklist.**
  - "Needs entering in eCW" appears on Home and in the schedule, oldest first.
  - Each item shows what staff need to type into eCW, there's a count in the header, and soon-starting appointments are highlighted.
  - A reschedule or cancel after entry puts the item back automatically.
  - Card actions are "Mark entered" (takes the eCW number), "Mark updated" and "Mark cancelled", each audited.
- **Settings ("the knobs").** An admin-only page.
  - For each area (appointments, patients, provider and staff schedules) it shows who owns it ("Us", "eCW" or "Both, synced") and how sync happens ("Manual (worklist)" or "Automatic"). Automatic stays disabled until an automatic adapter exists.
  - It also shows read-connection health: last refresh, patients matched, items needing review and errors.
  - Changes explain their effect before saving and are audited.
- **What we read.**
  - Patient: name, date of birth, sex, contact details, preferred language and chart number.
  - Coverage: payer, plan and member ID.
  - Encounter: date, provider, location and type.
  - Practitioner and Location, to map eCW providers to ours.
  - No clinical resources, ever.
- **Patient matching.** A patient auto-links in two cases:
  - the chart number matches, or
  - first name, last name, date of birth, and either phone or email all match exactly after normalizing.

  Everything else goes to a "Review matches" list where staff confirm or reject. Nothing is ever merged silently.
- **Refresh.**
  - A nightly re-export and compare, plus a "Refresh now" button for admins on the settings page.
  - Changed fields update with their source recorded.
  - Patients missing from eCW are flagged, never deleted.
- **The patient record.** Shows "From eCW, refreshed (date)", visit history and insurance. An "Open in eCW" button copies the chart number, since eCW deep links aren't confirmed to exist.
- **Future visits.** On the first real run, check whether future visits show up as encounters. If they do, show them as blocked time on the calendar.
- **Step-2 pack.**
  - `docs/ecw/fdhs-write-connection-request.md`: a ready-to-send request from FDHS to eCW for appointment write access.
  - A one-page business case template built on the worklist's real volumes.
- Keys and secrets live in AWS Secrets Manager.

## Order

1. Get double entry solid first (status fields, outbox, manual adapter, worklist), because that's what ships to the clinic.
2. Then the settings page.
3. Then the read connection and backfill.
4. Then the step-2 pack.

This runs in parallel with INIT-3. You'll both touch the appointment card, so coordinate there.

## Effort

Medium-large. Double entry is in front of staff every day, so polish it: test every path end to end and record a walkthrough on staging.

The FHIR client is careful work against a test server. Make it robust (retries, polling, partial failures) without gold-plating it, because the first real run will teach us things.

## What done looks like

- [ ] Every appointment carries an eCW status and, once entered, its eCW number.
- [ ] Every linked patient carries a chart number.
- [ ] Book, reschedule and cancel each produce exactly one outbox event in the same transaction, idempotently.
- [ ] With the manual adapter on, each event becomes a worklist item, and nothing is lost if processing fails.
- [ ] The worklist and card actions work end to end: book → mark entered → reschedule → needs update → mark updated → cancel → mark cancelled.
- [ ] Every status change is audited, and a staging walkthrough is recorded.
- [ ] A test adapter proves an automatic adapter can replace the manual one without changing any screen, and the interface is documented.
- [ ] The settings page shows ownership and sync mode per area, plus read-connection health.
- [ ] Settings changes are admin-only and audited, and tests show they route outbox processing correctly.
- [ ] A full backfill against the local FHIR server completes with correct counts, requesting only the resources listed above.
- [ ] Matching follows the rule above, and the review list works for both confirm and reject.
- [ ] The nightly refresh and "Refresh now" update changed fields with their source and never delete portal data.
- [ ] "Open in eCW" is on patient records.
- [ ] The future-visit check is written up after the first real run, and blocked time shows if future visits are available.
- [ ] The FDHS request pack and business case template exist, and Jason has reviewed them.

## Only Jason can do

- Register the app on eCW's developer portal under the company.
- Get FDHS's eCW admin to activate it and build the Registry patient group.
- Have the clinic review the first match list.
- Send the step-2 request through FDHS.

## Kickoff prompt

```
Next up for westchase-gi: the eCW connection. The brief is docs/initiatives/INIT-2-ecw-connection.md. It has what we learned about eCW's free read connection, the decisions already made, and what done looks like.

Short version: the clinic books everything in our portal but still needs every visit in eClinicalWorks. Until FDHS pays for an automatic write connection, staff will enter bookings twice, so make that safe with an eCW status on every appointment and a "Needs entering in eCW" worklist. Build it on an outbox and adapter so an automatic adapter can replace the manual one later without touching screens. Then use eCW's free FHIR read connection to backfill patients, insurance and visit history.

Start with double entry. It ships to the clinic first, so polish it and test every path end to end. eCW has no test server, so build the FHIR client against a local HAPI FHIR server with Synthea patients, shaped like eCW's capability statement. Never request clinical resources. INIT-3 is running alongside you and also touches the appointment card, so keep your changes there tidy.

You're done when every item under "What done looks like" is proven with evidence in the PRs. Finish with a short report that walks through each item, pass or fail, and links the evidence.
```
