"use client";

import { Popover } from "@base-ui/react/popover";
import { startTransition, useEffect, useId, useState } from "react";

import { Check, ChevronRight, Clock, MapPin, Phone, User } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/components/ui/menu";

import type { WeekAppointmentCell } from "./schedule-week-model";
import { readWeekAppointment, readWeekRecordLine, weekAppointmentCommand } from "./week-actions";
import type { WeekAppointmentOutcome } from "./week-actions";
import { appointmentWhen } from "./week-calendar";
import { CancelFace, RescheduleFace } from "./week-card-faces";
import { cardActions, failureMessage, MORE_LABEL, statusBadge } from "./week-card-model";
import type { MoreCommand, WeekAppointmentCommand, WeekAppointmentDetail } from "./week-card-model";
import { CardError, useCommand } from "./week-card-parts";
import type { CardHandlers } from "./week-card-parts";

/* ---- The appointment card ---- */

type Face = "details" | "reschedule" | "cancel";

export function AppointmentCard({
  cell,
  onDone,
  onOpenRecord,
}: Readonly<CardHandlers & { cell: WeekAppointmentCell }>) {
  const titleId = useId();
  const [read, setRead] = useState<WeekAppointmentOutcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    startTransition(async () => {
      try {
        // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the read is in flight
        const outcome = await readWeekAppointment(cell.id);
        if (live) setRead(outcome);
      } catch {
        if (live) setRead({ ok: false, code: "unavailable" });
      }
    });
    return () => {
      live = false;
    };
  }, [cell.id, attempt]);

  return (
    <section className="wgi-week-card-body" aria-labelledby={titleId}>
      {read?.ok === true ? (
        <AppointmentDetails
          detail={read.detail}
          titleId={titleId}
          onDone={onDone}
          onOpenRecord={onOpenRecord}
        />
      ) : (
        <>
          <Popover.Title id={titleId} className="wgi-week-card-name" data-ui-redact="patient-name">
            {cell.name}
          </Popover.Title>
          {read === null ? (
            <p className="wgi-week-card-quiet" aria-live="polite">
              Reading the appointment…
            </p>
          ) : (
            <>
              <CardError>
                {read.code === "not_found"
                  ? failureMessage("not_found")
                  : "The appointment couldn't be read."}
              </CardError>
              <div className="wgi-week-card-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRead(null);
                    setAttempt((count) => count + 1);
                  }}
                >
                  Try again
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function AppointmentDetails({
  detail,
  titleId,
  onDone,
  onOpenRecord,
}: Readonly<CardHandlers & { detail: WeekAppointmentDetail; titleId: string }>) {
  const [face, setFace] = useState<Face>("details");
  const command = useCommand(onDone);
  const badge = statusBadge(detail.status);
  const existing = { id: detail.id, expectedVersion: detail.version };

  function send(next: Readonly<WeekAppointmentCommand>, done: string) {
    command.run(
      async (idempotencyKey) => weekAppointmentCommand({ idempotencyKey, command: next }),
      done,
    );
  }

  function turnTo(next: Face) {
    command.clear();
    setFace(next);
  }

  return (
    <>
      <Popover.Title id={titleId} className="wgi-week-card-name" data-ui-redact="patient-name">
        {detail.patientName}
      </Popover.Title>
      <p className="wgi-week-card-kind">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span>{detail.appointmentTypeName}</span>
      </p>
      {face === "details" ? (
        <>
          <DetailsFace
            detail={detail}
            pending={command.pending}
            error={command.error}
            send={send}
            onTurn={turnTo}
          />
          {detail.sourceRequestId === null ? null : (
            <RecordFoot
              requestId={detail.sourceRequestId}
              appointmentId={detail.id}
              onOpenRecord={onOpenRecord}
            />
          )}
        </>
      ) : null}
      {face === "reschedule" ? (
        <RescheduleFace
          detail={detail}
          pending={command.pending}
          error={command.error}
          onBack={() => {
            turnTo("details");
          }}
          onPick={(start) => {
            send(
              {
                kind: "reschedule",
                ...existing,
                providerId: detail.providerId,
                locationId: detail.locationId,
                start,
                requestVersion: detail.requestVersion,
              },
              `${detail.patientName} is moved.`,
            );
          }}
        />
      ) : null}
      {face === "cancel" ? (
        <CancelFace
          detail={detail}
          pending={command.pending}
          error={command.error}
          onBack={() => {
            turnTo("details");
          }}
          onCancel={(reason, callAgainOn) => {
            send(
              {
                kind: "cancel",
                ...existing,
                reason,
                requestVersion: detail.requestVersion,
                callAgainOn,
              },
              `${detail.patientName}'s appointment is cancelled.`,
            );
          }}
        />
      ) : null}
    </>
  );
}

/* ---- Details: when, who, where, and what can happen next ---- */

function DetailsFace({
  detail,
  pending,
  error,
  send,
  onTurn,
}: Readonly<{
  detail: WeekAppointmentDetail;
  pending: boolean;
  error: string | null;
  send: (next: Readonly<WeekAppointmentCommand>, done: string) => void;
  onTurn: (face: Face) => void;
}>) {
  const actions = cardActions(detail);
  const existing = { id: detail.id, expectedVersion: detail.version };

  function more(kind: MoreCommand) {
    if (kind === "cancel") onTurn("cancel");
    else if (kind === "no_show")
      send({ kind: "no_show", ...existing }, `${detail.patientName} is marked no-show.`);
    else send({ kind: "complete", ...existing }, `${detail.patientName}'s visit is complete.`);
  }

  return (
    <>
      <ul className="wgi-week-card-facts">
        <li>
          <Clock width={16} height={16} />
          {appointmentWhen(detail.startsAt, detail.endsAt)}
        </li>
        <li>
          <User width={16} height={16} />
          {detail.providerName}
        </li>
        <li>
          <MapPin width={16} height={16} />
          {detail.locationName}
        </li>
        {detail.patientPhone === null ? null : (
          <li>
            <Phone width={16} height={16} />
            <a
              href={`tel:${detail.patientPhone.replaceAll(/[^\d+]/gu, "")}`}
              className="wgi-week-card-phone"
              data-ui-redact="patient-contact"
            >
              {detail.patientPhone}
            </a>
          </li>
        )}
      </ul>
      {error === null ? null : <CardError>{error}</CardError>}
      {actions.readOnly ? null : (
        <div className="wgi-week-card-actions">
          {actions.checkIn ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                send({ kind: "check_in", ...existing }, `${detail.patientName} is checked in.`);
              }}
            >
              <Check data-icon="inline-start" />
              Check in
            </Button>
          ) : null}
          {actions.reschedule ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                onTurn("reschedule");
              }}
            >
              Reschedule
            </Button>
          ) : null}
          {actions.more.length === 0 ? null : (
            <Menu>
              <MenuTrigger
                className="wgi-week-card-more"
                aria-label="More actions"
                disabled={pending}
              >
                <span aria-hidden="true">•••</span>
              </MenuTrigger>
              <MenuContent align="end" className="min-w-48">
                <MenuGroup>
                  {actions.more.map((kind) => (
                    <MenuItem
                      key={kind}
                      onClick={() => {
                        more(kind);
                      }}
                    >
                      {MORE_LABEL[kind]}
                    </MenuItem>
                  ))}
                </MenuGroup>
              </MenuContent>
            </Menu>
          )}
        </div>
      )}
    </>
  );
}

/* ---- The full record: Home's sheet, opened on the source request ---- */

function RecordFoot({
  requestId,
  appointmentId,
  onOpenRecord,
}: Readonly<{
  requestId: string;
  appointmentId: string;
  onOpenRecord: CardHandlers["onOpenRecord"];
}>) {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  function open() {
    setPending(true);
    setFailed(false);
    startTransition(async () => {
      try {
        const line = await readWeekRecordLine(requestId);
        if (line === null) setFailed(true);
        else onOpenRecord(line, appointmentId);
      } catch {
        setFailed(true);
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <div className="wgi-week-card-foot">
      {failed ? <CardError>The full record couldn&apos;t be opened.</CardError> : null}
      <button type="button" className="wgi-week-card-record" disabled={pending} onClick={open}>
        Open full record
        <ChevronRight width={14} height={14} />
      </button>
    </div>
  );
}
