# Incident response and breach notification

Satisfies, for the Westchase GI website and staff portal:

- security incident procedures, response and reporting,
  [45 CFR 164.308(a)(6)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(6));
- notification by a business associate,
  [164.410](https://www.ecfr.gov/current/title-45/section-164.410), and the business associate's
  part in the covered entity's notifications under
  [164.404](https://www.ecfr.gov/current/title-45/section-164.404) to
  [164.408](https://www.ecfr.gov/current/title-45/section-164.408);
- the incident-reporting term of the business associate agreement,
  [164.314(a)(2)(i)(C)](https://www.ecfr.gov/current/title-45/section-164.314#p-164.314(a)(2)(i)(C))
  and [164.504(e)(2)(ii)(C)](https://www.ecfr.gov/current/title-45/section-164.504#p-164.504(e)(2)(ii)(C));
- a third-party agent's duty to notify under Florida's
  [section 501.171(6)](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.171.html).

The security official owns this policy and leads every incident.

## Definitions

- **Security incident:** "the attempted or successful unauthorized access, use, disclosure,
  modification, or destruction of information or interference with system operations in an
  information system" ([164.304](https://www.ecfr.gov/current/title-45/section-164.304)).
- **Breach:** an acquisition, access, use or disclosure of PHI that the Privacy Rule does not
  permit and that compromises its security or privacy. It is presumed to be a breach unless a
  risk assessment shows a low probability that the PHI has been compromised, or one of the three
  exceptions applies ([164.402](https://www.ecfr.gov/current/title-45/section-164.402)).
- **Unsecured PHI:** PHI not rendered unusable, unreadable or indecipherable to unauthorized
  persons by a method in HHS's guidance
  ([164.402](https://www.ecfr.gov/current/title-45/section-164.402);
  [HHS breach notification guidance](https://www.hhs.gov/hipaa/for-professionals/breach-notification/guidance/index.html)).
  Data encrypted at rest with a KMS customer-managed key is secured only while the key is not
  compromised. PHI read through the application, or through a credential that can decrypt it, is
  unsecured.
- **Breach of security under Florida law:** unauthorized access of electronic data containing
  personal information, which includes a person's name together with medical history, condition,
  treatment or diagnosis, or a username or email address together with a password that permits
  access to an online account (section 501.171(1)). The business associate is a "third-party
  agent" under that section.

## How incidents are detected

- GuardDuty findings and CloudWatch alarms reach the security official by email through the SNS
  alert topic (topic and GuardDuty in step 2, alarms in step 4).
- The monthly [activity review](access-control.md#activity-review).
- A report from anyone: clinic staff, the Practice Manager, a patient, a vendor, AWS, a workforce
  member or an AI coding agent's operator. Every workforce member reports a suspected incident to
  the security official as soon as they notice it, and does not investigate alone first.

## Response

The security official runs each step and writes it into the incident record as it happens.

1. **Open the record.** Note when and how the incident was reported, who reported it and what is
   known. The date the business associate first knew of a breach, or would have known through
   reasonable diligence, is the discovery date
   ([164.410(a)(2)](https://www.ecfr.gov/current/title-45/section-164.410#p-164.410(a)(2))). Every
   deadline below counts from the discovery or determination date.
2. **Contain.** Use whichever applies:
   - deactivate the affected portal account (takes effect on the next request) and disable the
     user in the Cognito pool (step 3);
   - end the affected AWS sessions, revoke the affected IAM role sessions, and remove the
     affected workforce member's access
     ([termination](access-control.md#termination));
   - rotate every secret the incident could have exposed, by generating a new value at its source
     and moving it into Secrets Manager without displaying it;
   - block the source in the WAF (step 4), scale the affected service to zero, or freeze writes so
     the website asks patients to call and the portal is read-only (the freeze built for the
     cut-over in step 5);
   - for a vendor incident, revoke that vendor's tokens and rotate the API key it holds.
3. **Preserve evidence.** Keep CloudTrail, CloudWatch Logs, GuardDuty findings, `audit_log`, the
   access log and any affected snapshots. Nothing that could be evidence is deleted until the
   record is closed. Evidence that contains PHI stays in encrypted AWS storage.
4. **Assess.** Decide whether PHI was involved, whose, which elements, whether it was secured,
   and whether it was actually acquired or viewed. Then make the breach determination below.
5. **Notify** as set out below.
6. **Recover.** Fixes follow [change management](change-management.md#emergency-changes). Data is
   restored under the [contingency plan](contingency-plan.md#disaster-recovery-plan).
7. **Learn.** Record the cause, update the [risk register](../risk-analysis.md#risk-register),
   and treat the incident as a trigger for
   [periodic evaluation](../security-official.md#periodic-evaluation). Follow the
   [sanctions](access-control.md#sanctions) policy where a person's conduct contributed.

## Breach determination

Unless one of the exceptions in
[164.402](https://www.ecfr.gov/current/title-45/section-164.402) applies, an impermissible use or
disclosure of PHI is treated as a breach unless the written risk assessment shows a low
probability that the PHI has been compromised, considering at least:

1. the nature and extent of the PHI, including the types of identifiers and the likelihood of
   re-identification;
2. the unauthorized person who used the PHI or to whom it was disclosed;
3. whether the PHI was actually acquired or viewed;
4. the extent to which the risk has been mitigated.

The business associate makes this assessment for its own systems and gives it to the covered
entity with the notice. The covered entity decides the notifications it makes to individuals,
HHS and the media. A determination that an incident is not a breach is written down with its
reasoning, because the business associate carries the burden of proof
([164.414(b)](https://www.ecfr.gov/current/title-45/section-164.414#p-164.414(b))).

## Notifying the covered entity

| What | When | How | Source |
| --- | --- | --- | --- |
| A breach, or reason to believe one occurred | Without unreasonable delay, and no later than 10 calendar days after the breach is determined or there is reason to believe it occurred | Phone call to the Practice Manager, then written notice to the contact named in the BAA | [Fla. Stat. 501.171(6)(a)](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.171.html); within the 60-day limit of [164.410(b)](https://www.ecfr.gov/current/title-45/section-164.410#p-164.410(b)); [BAA §2(c)](../baa-template.md#2-obligations-and-activities-of-business-associate) |
| Any other use or disclosure of PHI not provided for by the BAA | Within the same 10 days | Written notice | [164.504(e)(2)(ii)(C)](https://www.ecfr.gov/current/title-45/section-164.504#p-164.504(e)(2)(ii)(C)); BAA §2(c) |
| A successful security incident that did not involve PHI | Within the same 10 days | Written notice | [164.314(a)(2)(i)(C)](https://www.ecfr.gov/current/title-45/section-164.314#p-164.314(a)(2)(i)(C)); BAA §2(c) |
| Unsuccessful attempts (blocked sign-ins, port scans, denied requests) that did not reach the system or its data | No individual report; summarized on request | As the BAA allows | BAA §2(c) |

The notice of a breach includes, as far as known at the time and supplemented as more is learned:

- the identification of each individual whose unsecured PHI was, or is reasonably believed to
  have been, accessed, acquired, used or disclosed
  ([164.410(c)(1)](https://www.ecfr.gov/current/title-45/section-164.410#p-164.410(c)(1)));
- what happened, the date of the breach and the date of discovery;
- the types of PHI involved;
- what the business associate is doing to investigate, mitigate harm and prevent a recurrence;
- the four-factor risk assessment;
- everything else the covered entity needs for its notices under
  [164.404(c)](https://www.ecfr.gov/current/title-45/section-164.404#p-164.404(c))
  ([164.410(c)(2)](https://www.ecfr.gov/current/title-45/section-164.410#p-164.410(c)(2))) and
  under Florida law (section 501.171(6)(a)).

The notice itself carries no PHI over email. Patient identities go to the covered entity through
the channel the BAA names for PHI.

## Notifications the covered entity makes

The covered entity sends these notices; the business associate supplies the information and, if
the covered entity asks in writing, drafts or sends them on its behalf. The table is here so the
business associate's own timing leaves the covered entity room to meet them.

| Notice | Threshold | Deadline | Source |
| --- | --- | --- | --- |
| Each affected individual, in plain language, by first-class mail or agreed email | Any breach of unsecured PHI | Without unreasonable delay, no later than 60 calendar days after discovery | [164.404](https://www.ecfr.gov/current/title-45/section-164.404) |
| Each affected Florida resident | Any breach of security of personal information | No later than 30 days after the breach is determined or there is reason to believe it occurred | [Fla. Stat. 501.171(4)(a)](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.171.html) |
| Prominent media outlets serving the state | More than 500 residents of one state | No later than 60 calendar days after discovery | [164.406](https://www.ecfr.gov/current/title-45/section-164.406) |
| HHS, through the [breach portal](https://www.hhs.gov/hipaa/for-professionals/breach-notification/breach-reporting/index.html) | 500 or more individuals | At the same time as the individual notices | [164.408(b)](https://www.ecfr.gov/current/title-45/section-164.408#p-164.408(b)) |
| HHS, through the breach portal | Fewer than 500 individuals | Logged, then reported no later than 60 days after the end of the calendar year | [164.408(c)](https://www.ecfr.gov/current/title-45/section-164.408#p-164.408(c)) |
| Florida Department of Legal Affairs | 500 or more Florida residents | No later than 30 days after determination; 15 more days for good cause given in writing | Fla. Stat. 501.171(3)(a) |
| Nationwide consumer reporting agencies | More than 1,000 individuals at one time | Without unreasonable delay | Fla. Stat. 501.171(5) |

Florida deems notice given under a federal regulator's rules to satisfy its individual-notice
requirement, and a timely copy to the Department to satisfy its Department-notice requirement
(section 501.171(4)(g)). Whether that relieves the 30-day clock for a HIPAA covered entity is a
question for the covered entity's counsel. Until counsel answers it, this policy plans to the
30-day Florida deadline, which is the shorter one.

## Law enforcement delay

If a law enforcement official says a notice would impede a criminal investigation or damage
national security, the notice is delayed for the period stated in writing, or, for an oral
statement, for no more than 30 days unless a written statement follows. The statement and the
official's identity are recorded
([164.412](https://www.ecfr.gov/current/title-45/section-164.412); Fla. Stat. 501.171(4)(b)). The
business associate tells the covered entity about the request in the same notice.

## Vendor and subcontractor incidents

- **AWS** reports incidents affecting the business associate's data under the AWS BAA. The
  security official treats such a report as the start of an incident here.
- **Vendors with no BAA** ([vendors.md](../vendors.md#vendors)) receive no PHI by design. An
  incident at one of them is still recorded: credentials it holds are rotated, and the record
  confirms that no PHI reached it.

## Records

- Each incident has a record with: the timeline, the discovery date, what was affected, the
  containment and recovery steps, the evidence kept, the breach risk assessment and
  determination, every notice sent (to whom, when and what), any law enforcement statement, and
  the lessons and risk-register changes.
- Records are kept for six years from creation or last effect
  ([164.316(b)(2)(i)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(i)),
  and [164.530(j)](https://www.ecfr.gov/current/title-45/section-164.530#p-164.530(j)) through
  [164.414(a)](https://www.ecfr.gov/current/title-45/section-164.414#p-164.414(a))). That also
  covers Florida's five-year retention for a written no-harm determination (section
  501.171(4)(c)).
- A record that contains PHI, patient identities, account identifiers or security details that
  would help an attacker is kept outside this repository, in encrypted AWS storage under a
  customer-managed key or in the covered entity's own records. GitHub issues and pull requests
  about an incident carry no PHI.
- The security official walks through this procedure at every
  [periodic evaluation](../security-official.md#periodic-evaluation) and checks that the alert
  topic's email subscription is still confirmed.
