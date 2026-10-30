# Workstation use and security

Satisfies workstation use and workstation security,
[45 CFR 164.310(b) and (c)](https://www.ecfr.gov/current/title-45/section-164.310#p-164.310(b));
device and media controls,
[164.310(d)](https://www.ecfr.gov/current/title-45/section-164.310#p-164.310(d)(1)); and, for
workstations, protection from malicious software and password management,
[164.308(a)(5)(ii)(B) and (D)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(5)(ii)(B)).

The security official owns this policy.

## Scope

A workstation is any laptop, desktop, tablet or phone that a member of the business associate's
workforce uses to build or operate the system: to sign in to AWS, GitHub or a vendor console, to
approve a production deploy, to receive security alerts, to hold a second factor, or to run an AI
coding agent.

The computers clinic staff use to reach the portal belong to the covered entity and fall under
its own program. On those computers the portal ends sessions on its own
([access control](access-control.md#sessions-and-automatic-logoff)), and its authenticated
responses carry `Cache-Control: private, no-store` so the browser does not keep a copy (in place,
`src/proxy.ts`).

## Workstation use

164.310(b).

- A workstation is used for the system only by the workforce member it is assigned to, under
  that member's own operating-system account. It is not shared, and nobody else uses that account.
- Development, tests, demos, screenshots and visual evidence use staging and previews, which hold
  only the fictional data from the demo-data generator (`npm run demo:data`). AI coding agents run
  only against that data ([access control](access-control.md#ai-coding-agents)).
- Production ePHI is reached only when a task needs it (an incident, a restore, a request from the
  covered entity) and only inside AWS or through the portal, under the rules below.
- The screen is locked whenever the workstation is left unattended, and is not left where others
  can read it while it shows the portal or an AWS console.
- Signing in to AWS, GitHub or a vendor console happens on a network the member trusts or over the
  service's own TLS connection; credentials are never typed into a link that arrived in an email or
  message.

## No ePHI at rest on workstations

164.310(d)(2)(iv), and the reason the facility controls in
[164.310(a)(2)(ii) and (iii)](https://www.ecfr.gov/current/title-45/section-164.310#p-164.310(a)(2)(ii))
are met by the alternative in the [crosswalk](../README.md#physical-safeguards-164310).

- Production ePHI is never stored on a workstation: no database exports, downloaded files,
  screenshots, notes, chat messages, email attachments or AI agent transcripts that contain it.
  Exports stay in AWS ([contingency plan](contingency-plan.md#exports)).
- No production credential is stored on a workstation. AWS access is the short-lived `aws login`
  session; there are no IAM users or access keys; agents never retrieve secret values.
- If ePHI reaches a workstation by mistake, the member stops, tells the security official, and
  handles it as a security incident ([incident response](incident-response.md)). The security
  official decides how the copy is removed and records it.

## Workstation security

164.310(c), and password management, 164.308(a)(5)(ii)(D).

Every workstation in scope meets this baseline before it is used for the system:

| Control | Requirement |
| --- | --- |
| Disk encryption | Full-disk encryption on (FileVault on macOS) |
| Screen lock | Locks after no more than 10 minutes idle and asks for the password or biometric at once |
| Updates | Automatic operating-system and browser updates on; security updates installed within 14 days of release |
| Firewall and sharing | The operating system's firewall on; file sharing, screen sharing, remote login, media receivers and other services that accept incoming connections off unless a task needs them, and off again afterwards |
| Accounts | A unique, strong password for the operating-system account; daily work in a standard account where the platform allows it |
| Passwords | A password manager holds every system and vendor password; each password is unique |
| Second factor | Two-step sign-in on AWS, GitHub and every vendor console in [vendors.md](../vendors.md#vendors), with a passkey or security key wherever the service offers one |
| Loss | Device location and remote erase on (Find My on Apple devices) |
| Phones | A phone that holds a second factor or receives security alerts has a passcode, current updates and remote erase |

The security official checks each workstation against this baseline when access is granted and at
each [periodic evaluation](../security-official.md#periodic-evaluation), and records the result in
the device inventory. A workstation that does not meet the baseline is not used for the system
until it does.

## Malicious software

164.308(a)(5)(ii)(B), for workstations. The pipeline's controls are in
[change management](change-management.md#dependencies-and-malicious-software).

- The operating system's built-in malware protection stays on (on macOS: Gatekeeper, XProtect and
  System Integrity Protection).
- Software comes from the platform's app store, the vendor's own site or a package manager, and
  project dependencies come from the committed lockfile.
- Downloaded files and archives are treated as untrusted: they are not opened with an
  interpreter or build tool from inside their own directory, and an AI coding agent does not run
  them unless the workforce member asked for that.
- A suspected infection is a security incident: disconnect the workstation from the network, tell
  the security official, and treat every session and credential on it as exposed
  ([incident response](incident-response.md)).

## Device and media controls

164.310(d)(1) and (d)(2)(i) to (iii).

- **Inventory (accountability, addressable, implemented).** The security official keeps a device
  inventory outside this repository: each workstation and phone in scope, the person it is
  assigned to, and the date and result of its last baseline check. Moving a device to another
  person, or retiring it, is recorded there.
- **Disposal (required).** Before a workstation or phone is sold, recycled, returned or thrown away,
  its storage is erased with the platform's erase procedure (on Apple devices, Erase All Content
  and Settings, which destroys the encryption keys). Removable media is not used for ePHI. Florida
  also requires customer records holding personal information to be erased or otherwise made
  unreadable when they are no longer kept
  ([section 501.171(8)](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.171.html)).
- **Media re-use (required).** A device is erased the same way before it is assigned to another
  person.
- **Cloud media.** AWS manages the physical media behind RDS, S3 and the other services under the
  AWS BAA and shared responsibility model, and decommissions storage devices using NIST 800-88
  techniques before they leave its control
  ([AWS data center controls](https://aws.amazon.com/trust-center/data-center/our-controls/)).
  Data the business associate stops keeping is deleted through the service, and the key that
  encrypted it can be scheduled for deletion.
- **Transition vendors.** Supabase and Vercel are disposed of in step 6: a final encrypted export
  is stored in AWS, then the projects are deleted and the deletion is recorded in
  [vendors.md](../vendors.md#vendors).
