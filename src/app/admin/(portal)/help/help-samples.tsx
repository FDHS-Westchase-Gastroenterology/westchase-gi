import type { ComponentType } from "react";

import { Search } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import type { HelpSampleId } from "@/lib/portal/help-topics";

/* The live samples beside each Help topic (issue #358, Figma U4): the
   control the answer is about, drawn small in the screen's own paint from
   the ui/ recipes, inert so nothing in it can be pressed or focused. The
   names are fictional, and the ones that stand for patients carry
   data-ui-redact like the screens they copy. */

function MonthDay() {
  return (
    <div className="wgi-help-sample-row">
      <strong>5 open</strong>
      <span className="wgi-help-sample-fill" aria-hidden="true">
        <span />
      </span>
      <span className="wgi-help-sample-muted">tints deeper as it fills</span>
    </div>
  );
}

function OpenHour() {
  return (
    <div className="wgi-help-sample-row">
      <span className="wgi-help-sample-time">10:00 AM</span>
      <span className="wgi-help-sample-open">1 hour open</span>
    </div>
  );
}

function Visit() {
  return (
    <div className="wgi-help-sample-row">
      <span className="wgi-help-sample-visit">
        <strong data-ui-redact="patient-name">Ana Foster</strong>
        <span className="wgi-help-sample-muted">9:30 AM · Consultation</span>
      </span>
      <span className="wgi-help-sample-pill">Reschedule</span>
      <span className="wgi-help-sample-pill">More</span>
    </div>
  );
}

function TakenTime() {
  return (
    <div className="wgi-help-sample-row">
      <s className="wgi-help-sample-taken">2:00 PM</s>
      <span className="wgi-help-sample-pill" data-selected="">
        2:30 PM
      </span>
      <span className="wgi-help-sample-muted">just taken; the next open time</span>
    </div>
  );
}

function PatientSearch() {
  return (
    <div className="wgi-help-sample-stack">
      <span className="wgi-help-sample-search">
        <Search width={14} height={14} aria-hidden="true" />
        fos
        <Kbd className="ml-auto">/</Kbd>
      </span>
      <span className="wgi-help-sample-row" data-ui-redact="patient-contact">
        <strong>Ana Foster</strong>
        <span className="wgi-help-sample-muted">(813) 555-0142</span>
      </span>
    </div>
  );
}

function RequestRow() {
  return (
    <div className="wgi-help-sample-row">
      <strong data-ui-redact="patient-name">Marcus Hale</strong>
      <Badge variant="attention">New</Badge>
      <span className="wgi-help-sample-muted">8:12 AM</span>
    </div>
  );
}

function CallAnswers() {
  return (
    <div className="wgi-help-sample-row wgi-help-sample-wrap">
      {["No answer", "Contacted", "Appointment scheduled", "Close request"].map((answer) => (
        <span key={answer} className="wgi-help-sample-pill">
          {answer}
        </span>
      ))}
    </div>
  );
}

function HoursBar() {
  return (
    <div className="wgi-help-sample-row">
      <strong>Dr. Chang</strong>
      <span className="wgi-help-sample-bar" aria-hidden="true">
        <span />
      </span>
      <span className="wgi-help-sample-muted">8 AM – 4 PM</span>
      <Switch checked readOnly aria-label="Working" />
    </div>
  );
}

function Roles() {
  return (
    <div className="wgi-help-sample-row">
      <span className="wgi-help-sample-pill" data-selected="">
        Front desk
      </span>
      <span className="wgi-help-sample-pill">Admin</span>
    </div>
  );
}

function Recipient() {
  return (
    <div className="wgi-help-sample-row">
      <span>frontdesk@mock.com</span>
      <Switch checked readOnly aria-label="Gets request emails" />
    </div>
  );
}

const SAMPLES = {
  "month-day": MonthDay,
  "open-hour": OpenHour,
  visit: Visit,
  "taken-time": TakenTime,
  "patient-search": PatientSearch,
  "request-row": RequestRow,
  "call-answers": CallAnswers,
  "hours-bar": HoursBar,
  roles: Roles,
  recipient: Recipient,
} as const satisfies Readonly<Record<HelpSampleId, ComponentType>>;

export function HelpSample({ sample }: Readonly<{ sample: HelpSampleId }>) {
  const Sample = SAMPLES[sample];
  return (
    <div className="wgi-help-sample" inert aria-hidden="true" data-testid="help-sample">
      <Sample />
    </div>
  );
}
