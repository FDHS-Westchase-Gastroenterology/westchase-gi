"use client";

import { cn } from "cn";
import { startTransition, useEffect, useId, useState } from "react";

import { formatPhoneForDisplay, telHref } from "@/app/admin/(portal)/requests/format";
import { Check, ChevronRight, Clock, Ellipsis, MapPin, Phone, User } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { PopoverTitle } from "@/components/ui/popover";

import type { WeekAppointmentCell } from "./schedule-week-model";
import { readWeekAppointment, weekAppointmentCommand } from "./week-actions";
import type { WeekAppointmentOutcome } from "./week-actions";
import { appointmentAt, appointmentWhen } from "./week-calendar";
import { CancelFace, RescheduleFace } from "./week-card-faces";
import {
  BADGE_PAINT,
  cancelledDetail,
  cardActions,
  checkedInDetail,
  failureMessage,
  LEAD_LABEL,
  MORE_LABEL,
  statusBadge,
} from "./week-card-model";
import type {
  LeadCommand,
  MoreCommand,
  WeekAppointmentCommand,
  WeekAppointmentDetail,
} from "./week-card-model";
import { CardError, useCommand } from "./week-card-parts";
import type { CardHandlers, RecordHint, Said } from "./week-card-parts";

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
          <PopoverTitle id={titleId} className="wgi-week-card-name" data-ui-redact="patient-name">
            {cell.name}
          </PopoverTitle>
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

  /* The toast names the patient, then what happened; under it, when and
     where, unless the command says something closer: when the patient
     arrived, or where a cancel sent the request. A move's new time is the
     grid's to show. */
  function send(
    next: Readonly<WeekAppointmentCommand>,
    rest: string,
    line: Said["detail"] = next.kind === "reschedule"
      ? null
      : `${appointmentAt(detail.startsAt)} · ${detail.providerName}, ${detail.locationName}`,
    after?: Said["detailAfter"],
  ) {
    command.run(
      async (idempotencyKey) => weekAppointmentCommand({ idempotencyKey, command: next }),
      { subject: detail.patientName, rest, detail: line, detailAfter: after },
    );
  }

  function turnTo(next: Face) {
    command.clear();
    setFace(next);
  }

  /* Figma Ap4: the cancel form is its own card, titled for what it does. */
  if (face === "cancel")
    return (
      <CancelFace
        detail={detail}
        titleId={titleId}
        pending={command.pending}
        error={command.error}
        onKeep={() => {
          turnTo("details");
        }}
        onCancel={(reason, afterwards) => {
          send(
            {
              kind: "cancel",
              ...existing,
              reason,
              requestVersion: detail.requestVersion,
              callAgainOn: afterwards?.outcome === "call_again" ? afterwards.callAgainOn : null,
              requestOutcome: afterwards?.outcome ?? null,
            },
            "'s appointment is cancelled",
            null,
            (request) => cancelledDetail(detail, request),
          );
        }}
      />
    );

  return (
    <>
      <PopoverTitle id={titleId} className="wgi-week-card-name" data-ui-redact="patient-name">
        {detail.patientName}
      </PopoverTitle>
      <p className="wgi-week-card-kind">
        <Badge variant={badge.variant} className={cn("wgi-badge", BADGE_PAINT[badge.variant])}>
          {badge.label}
        </Badge>
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
          <RecordFoot
            patient={{ id: detail.patientId, name: detail.patientName, phone: detail.patientPhone }}
            appointmentId={detail.id}
            onOpenRecord={onOpenRecord}
          />
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
              " is moved",
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
  send: (next: Readonly<WeekAppointmentCommand>, rest: string, line?: Said["detail"]) => void;
  onTurn: (face: Face) => void;
}>) {
  const actions = cardActions(detail);
  const { lead } = actions;
  const existing = { id: detail.id, expectedVersion: detail.version };

  function run(kind: LeadCommand | MoreCommand) {
    if (kind === "cancel") onTurn("cancel");
    else if (kind === "check_in")
      send(
        { kind: "check_in", ...existing },
        " is checked in",
        checkedInDetail(new Date(), detail.startsAt, detail.providerName),
      );
    else if (kind === "no_show") send({ kind: "no_show", ...existing }, " is marked no-show");
    else send({ kind: "complete", ...existing }, "'s visit is complete");
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
      </ul>
      {detail.patientPhone === null ? null : (
        <a
          href={telHref(detail.patientPhone)}
          className="wgi-week-card-call"
          data-ui-redact="patient-contact"
        >
          <Phone width={15} height={15} />
          {formatPhoneForDisplay(detail.patientPhone)}
        </a>
      )}
      {error === null ? null : <CardError>{error}</CardError>}
      {actions.readOnly ? null : (
        <div className="wgi-week-card-actions">
          {lead === null ? null : (
            <Button
              size="sm"
              className="wgi-week-card-go"
              disabled={pending}
              onClick={() => {
                run(lead);
              }}
            >
              {lead === "check_in" ? <Check data-icon="inline-start" /> : null}
              {LEAD_LABEL[lead]}
            </Button>
          )}
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
                <Ellipsis width={15} height={15} />
              </MenuTrigger>
              <MenuContent align="end" className="min-w-48">
                <MenuGroup>
                  {actions.more.map((kind) => (
                    <MenuItem
                      key={kind}
                      onClick={() => {
                        run(kind);
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

/* ---- The full record: the patient's, opened in the Schedule's sheet ---- */

function RecordFoot({
  patient,
  appointmentId,
  onOpenRecord,
}: Readonly<{
  patient: RecordHint;
  appointmentId: string;
  onOpenRecord: CardHandlers["onOpenRecord"];
}>) {
  return (
    <div className="wgi-week-card-foot">
      <Button
        variant="link"
        size="sm"
        motion="none"
        className="wgi-week-card-record"
        onClick={() => {
          onOpenRecord(patient, appointmentId);
        }}
      >
        Open full record
        <ChevronRight data-icon="inline-end" />
      </Button>
    </div>
  );
}
