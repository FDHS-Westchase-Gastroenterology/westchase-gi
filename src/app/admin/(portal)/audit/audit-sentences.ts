/* The audit record's sentences (issue #357): one audit_log row as the plain words the Activity
   log reads after the actor's name. activity-model.ts phrases every log row and hands audit rows
   here. Storage codes stay in the Technical record. Browser-safe. */

import {
  OUTCOME_HISTORY_LABELS,
  STATUS_LABELS,
  followUpShortLabel,
  stateLabel,
} from "@/app/admin/(portal)/requests/format";
import { asJsonBoolean, asJsonNumber, asJsonString } from "@/lib/json";
import type { JsonObject } from "@/lib/json";
import type { AuditLogRow } from "@/lib/portal/rows";
import { normalizeRequestState, parseRequestStatus } from "@/lib/portal/workflow/contracts";

import { printPacketSentence } from "./print-packet-sentence";

/** The audit_log columns a sentence reads. */
export type AuditEntry = Readonly<
  Pick<AuditLogRow, "id" | "actor_email" | "action" | "entity" | "entity_id" | "detail" | "at">
>;

/** Names a sentence resolves; a missing one falls back to a plain noun. */
export interface AuditSentenceContext {
  // Staff_profiles id -> display name (for staff.* entity references)
  namesByProfileId: ReadonlyMap<string, string>;
  // Notification_recipients id -> email (recipient references; removed
  // Recipients fall back to "a notification recipient")
  recipientsById: ReadonlyMap<string, string>;
  now: Date;
}

function isCallOutcomeId(value: string): value is keyof typeof OUTCOME_HISTORY_LABELS {
  return Object.hasOwn(OUTCOME_HISTORY_LABELS, value);
}

function recipientLabel(recipientsById: ReadonlyMap<string, string>, id: string | null): string {
  if (id === null || id === "") return "a notification recipient";
  return recipientsById.get(id) ?? "a notification recipient";
}

function profileLabel(namesByProfileId: ReadonlyMap<string, string>, id: string | null): string {
  if (id === null || id === "") return "a colleague";
  return namesByProfileId.get(id) ?? "a colleague";
}

function staffStateWord(raw: string): string | null {
  const state = normalizeRequestState(raw);
  return state === null ? null : stateLabel(state);
}

export interface ActionDescription {
  sentence: string;
  technical: boolean;
}

/** One audit row as a plain sentence. `technical` is true when the record has no words for it. */
export function describeAction(
  entry: Readonly<AuditEntry>,
  detail: JsonObject,
  ctx: Readonly<AuditSentenceContext>,
): ActionDescription {
  const requestEntity = entry.entity === "requests";
  switch (entry.action) {
    case "request.create":
      return { sentence: "added an appointment request", technical: false };
    case "request.status_change": {
      const to = asJsonString(detail.to) ?? "";
      if (to === "closed" && detail.legacy_unclassified_close === true) {
        return { sentence: "closed a request without an outcome", technical: false };
      }
      const status = parseRequestStatus(to);
      return {
        sentence: `marked a request ${status === null ? to : STATUS_LABELS[status]}`,
        technical: false,
      };
    }
    case "request.close": {
      return {
        sentence: `closed a request — ${
          detail.disposition === "converted" ? "appointment booked" : "no appointment booked"
        }`,
        technical: false,
      };
    }
    case "request.call_outcome": {
      const outcome = asJsonString(detail.outcome) ?? "";
      const followUpAt = asJsonString(detail.follow_up_at);
      const followUp =
        followUpAt !== null && followUpAt !== ""
          ? ` — call again ${followUpShortLabel(followUpAt, ctx.now)}`
          : "";
      switch (outcome) {
        case "reached_follow_up":
          return {
            sentence: `reached the patient on a request${followUp}`,
            technical: false,
          };
        case "voicemail":
          return {
            sentence: `left a voicemail on a request${followUp}`,
            technical: false,
          };
        case "no_answer":
          return {
            sentence: `got no answer on a request${followUp}`,
            technical: false,
          };
        case "wont_schedule":
          return {
            sentence: "closed a request — patient won't schedule",
            technical: false,
          };
        case "not_actionable":
          return {
            sentence: "closed a request — duplicate or not actionable",
            technical: false,
          };
        case "scheduled_transferred":
          return {
            sentence: "finished a request — appointment was booked",
            technical: false,
          };
      }
      return {
        sentence: `recorded an outcome on a request${
          isCallOutcomeId(outcome) ? ` — ${OUTCOME_HISTORY_LABELS[outcome]}` : ""
        }`,
        technical: false,
      };
    }
    case "request.note":
      return { sentence: "added a note to a request", technical: false };
    case "request.authorized_delete":
      return { sentence: "deleted a request early (authorized)", technical: false };
    case "request.retention_delete":
      return { sentence: "a request was removed by the retention policy", technical: false };
    case "request.retention_hold":
      return {
        sentence: `${asJsonBoolean(detail.held) === false ? "released" : "placed"} a legal hold on a request`,
        technical: false,
      };
    case "requests.export": {
      const count = asJsonNumber(detail.row_count);
      return {
        sentence: `exported the request list${
          count !== null ? ` (${count} ${count === 1 ? "request" : "requests"})` : ""
        }`,
        technical: false,
      };
    }
    case "requests.print_new":
      return { sentence: printPacketSentence(detail), technical: false };
    case "recipients.add":
      return {
        sentence: `added ${recipientLabel(ctx.recipientsById, entry.entity_id)} to notification emails`,
        technical: false,
      };
    case "recipients.remove":
      return {
        sentence: `removed ${recipientLabel(ctx.recipientsById, entry.entity_id)} from notification emails`,
        technical: false,
      };
    case "recipients.toggle":
      return {
        sentence: `${asJsonBoolean(detail.to) === true ? "resumed" : "paused"} notification emails for ${recipientLabel(ctx.recipientsById, entry.entity_id)}`,
        technical: false,
      };
    case "recipients.label_update":
      return {
        sentence: `renamed ${recipientLabel(ctx.recipientsById, entry.entity_id)} on the notification list`,
        technical: false,
      };
    case "staff.invite":
      return {
        sentence: `invited ${profileLabel(ctx.namesByProfileId, entry.entity_id)} to the portal`,
        technical: false,
      };
    case "staff.onboard":
      return { sentence: "completed portal setup", technical: false };
    case "staff.deactivate":
      return {
        sentence: `deactivated ${profileLabel(ctx.namesByProfileId, entry.entity_id)}'s portal access`,
        technical: false,
      };
    case "staff.role":
      return {
        sentence: `changed ${profileLabel(ctx.namesByProfileId, entry.entity_id)}'s role`,
        technical: false,
      };
    case "staff.password_reset":
      return {
        sentence: `sent ${profileLabel(ctx.namesByProfileId, entry.entity_id)} a password reset link`,
        technical: false,
      };
    case "staff.tour_dismiss":
      // It pairs with tour_complete on finish, so it reads as technical and stays in the
      // Technical record.
      return { sentence: "dismissed the portal tour nudge", technical: true };
    case "staff.tour_restart":
      return { sentence: "restarted the portal tour", technical: false };
    case "staff.tour_complete":
      return { sentence: "finished the portal tour", technical: false };
    case "maintainers.invite":
      return {
        sentence: `invited ${asJsonString(detail.target_login) ?? "a maintainer"} to edit the website`,
        technical: false,
      };
    case "maintainers.cancel":
      return {
        sentence: `canceled a website-maintainer invitation for ${asJsonString(detail.target_login) ?? "a maintainer"}`,
        technical: false,
      };
    case "maintainers.revoke":
      return {
        sentence: `removed ${asJsonString(detail.target_login) ?? "a maintainer"}'s website access`,
        technical: false,
      };
    case "request.workflow_command": {
      const command = asJsonString(detail.command) ?? "";
      const to = asJsonString(detail.to) ?? "";
      switch (command) {
        case "record_contact_attempt":
          return { sentence: "recorded a contact attempt on a request", technical: false };
        case "confirm_booking_handoff":
          return { sentence: "marked a request Scheduled", technical: false };
        case "close_request":
          return { sentence: "closed a request", technical: false };
        case "reopen_request":
          return { sentence: "reopened a request", technical: false };
        case "set_call_again":
          return { sentence: "corrected the call-again time on a request", technical: false };
        case "undo_latest_transition": {
          const restored = staffStateWord(to);
          return {
            sentence:
              restored === null
                ? "undid the last change on a request"
                : `undid the last change on a request — back to ${restored}`,
            technical: false,
          };
        }
        case "classify_legacy_closure":
          return { sentence: "classified a closed request", technical: false };
        default:
          return {
            sentence: requestEntity
              ? `${entry.action} on a request`
              : `${entry.action} (${entry.entity})`,
            technical: true,
          };
      }
    }
    default:
      return {
        sentence: requestEntity
          ? `${entry.action} on a request`
          : `${entry.action} (${entry.entity})`,
        technical: true,
      };
  }
}
