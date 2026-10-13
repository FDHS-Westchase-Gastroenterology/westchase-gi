# Security official

Satisfies [45 CFR 164.308(a)(2)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(2)),
Assigned security responsibility: "Identify the security official who is responsible for the
development and implementation of the policies and procedures required by this subpart."

## Designation

**Jason** is the security official for the Westchase GI website and staff portal, for the
business associate `[BUSINESS ASSOCIATE LEGAL NAME]`.

The covered entity, FDHS Westchase Gastroenterology, keeps its own security and privacy officials
for its own program. For this system, the covered entity's day-to-day contact is the clinic's
Practice Manager (Juliet). Contact details live in the signed business associate agreement, not
in this repository.

## Responsibilities

The security official:

- owns this record, approves every change to it, and reviews it on the schedule below;
- owns the [risk analysis](risk-analysis.md) and decides each risk treatment, including every
  accepted risk;
- authorizes access to production and removes it ([access control](policies/access-control.md));
- approves every production deploy in the protected GitHub `production` environment
  ([change management](policies/change-management.md));
- leads incident response and makes the business associate's breach determination and its
  notice to the covered entity ([incident response](policies/incident-response.md));
- owns backup, restore and the contingency plan ([contingency plan](policies/contingency-plan.md));
- keeps the [vendor list](vendors.md) current and approves any new vendor before it receives
  data;
- receives every CloudWatch alarm and GuardDuty finding through the SNS alert topic, whose email
  subscription the security official confirms (the topic and GuardDuty arrive in INIT-1 step 2,
  the alarms in step 4);
- authorizes activation of the data-lifecycle scheduler, which Terraform creates disabled.

The security official may delegate tasks to another workforce member or to an AI coding agent
working under the rules in [access control](policies/access-control.md#ai-coding-agents). The
responsibility stays with the security official.

## Security awareness and training

Satisfies [164.308(a)(5)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(5)).

- **Workforce of the business associate.** Every person given access to production or to the
  AWS account reads this directory before access is granted and confirms in writing (an email
  or a signed note kept with the access record) that they have read it. The security official
  repeats this each year at the annual review and after any material policy change.
- **Security reminders** (addressable, implemented). The annual review and every policy change
  are announced to the workforce. Incidents and near misses are written up and shared as
  reminders.
- **Protection from malicious software** (addressable, implemented). See
  [workstation security](policies/workstation-security.md#malicious-software), GuardDuty (INIT-1
  step 2) and the pipeline's vulnerability scan (INIT-1 step 4).
- **Log-in monitoring** (addressable, implemented). See
  [access control](policies/access-control.md#activity-review).
- **Password management** (addressable, implemented). See
  [access control](policies/access-control.md#authentication) and
  [workstation security](policies/workstation-security.md#workstation-security).
- **AI coding agents.** Agents receive these rules through the repository's agent instructions,
  which point at this directory. An agent is a tool operated by a workforce member, not a
  workforce member.
- **Clinic staff** who use the portal are the covered entity's workforce. Their HIPAA training is
  the covered entity's. The business associate tells the Practice Manager about portal changes
  that affect how staff sign in or handle patient data (for example, two-step login in INIT-1
  step 3).

## Periodic evaluation

Satisfies [164.308(a)(8)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(8))
and [164.316(b)(2)(iii)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(iii)).

The security official performs a technical and nontechnical evaluation of this record and the
controls it describes:

- at least once every 12 months;
- before real patient data moves to AWS (INIT-1 step 5, the cut-over);
- after the old stack is decommissioned (INIT-1 step 6);
- when a new AWS service, vendor, data flow or environment is added;
- when the system starts handling a new kind of ePHI (for example, the eCW connection in INIT-2);
- after any security incident, and after any change to the HIPAA rules.

The evaluation checks each row of the [crosswalk](README.md#security-rule-crosswalk), updates the
[risk register](risk-analysis.md#risk-register), and records its result as a change to this
directory, with the date and the evaluator. Findings that need work become GitHub issues that
carry no PHI.
