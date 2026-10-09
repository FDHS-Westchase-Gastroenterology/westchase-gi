"use client";

import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { toast } from "sonner";

import { initialsOf } from "@/app/admin/(portal)/schedule/week-calendar";
import {
  changeStaffRole,
  deactivateStaff,
  resendStaffInvite,
} from "@/app/admin/(portal)/settings/actions";
import { showModalWithInitialFocus } from "@/app/admin/(portal)/settings/open-dialog";
import { InviteDialog } from "@/app/admin/(portal)/settings/staff/invite-dialog";
import type { SentInvite } from "@/app/admin/(portal)/settings/staff/invite-dialog";
import {
  invitedLabel,
  ROLE_NAMES,
  signedInLabel,
} from "@/app/admin/(portal)/settings/staff/staff-model";
import { ChevronDown, Ellipsis, Mail } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { showUndoToast } from "@/components/ui/undo-toast";
import { parseStaffRole, STAFF_ROLES } from "@/lib/portal/contracts";
import type { StaffRole } from "@/lib/portal/contracts";
import type { InviteStaffResult } from "@/lib/portal/management";

/* Staff access (issue #355, Figma St4): everyone who can sign in to the
   portal, their role, and when they last signed in. An admin invites from
   the header, changes a role from its pill (with Undo), resends a pending
   invite from its row, and deactivates or cancels an invite from the •••
   menu after a confirm, because neither has an Undo. The front desk reads
   the list. The server keeps at least one admin: nobody can demote or
   deactivate themselves, so the signed-in row never offers either. */

export interface StaffMember {
  readonly user_id: string;
  readonly email: string;
  readonly display_name: string;
  readonly role: StaffRole;
  readonly onboarded_at: string | null;
  readonly created_at: string;
  readonly lastSignInAt: string | null;
}

interface Fallback {
  readonly email: string;
  readonly url: string;
  readonly copied: boolean;
}

type Confirming =
  | { readonly kind: "deactivate"; readonly person: StaffMember }
  | { readonly kind: "cancel-invite"; readonly person: StaffMember };

/* Least access first, the order the invite form offers them. */
const ROLES = STAFF_ROLES.toReversed();

export function StaffView({
  staff,
  canEdit,
  selfUserId,
  signInReadFailed,
  now,
  inviting,
}: Readonly<{
  staff: readonly StaffMember[];
  canEdit: boolean;
  selfUserId: string;
  signInReadFailed: boolean;
  now: string;
  inviting: boolean;
}>) {
  const router = useRouter();
  const [sent, setSent] = useState<readonly SentInvite[]>([]);
  const [fallback, setFallback] = useState<Fallback | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const known = new Set(staff.map((person) => person.email.toLowerCase()));
  /* An invite shows as its pending row at once; the server's row replaces
     it when the refreshed list lands, and the placeholder is forgotten so a
     cancelled invite doesn't come back. */
  const arriving = sent.filter((invite) => !known.has(invite.email.toLowerCase()));
  if (arriving.length !== sent.length) setSent(arriving);

  function leaveInvite() {
    const address = new URL(window.location.href);
    address.searchParams.delete("invite");
    router.replace(`${address.pathname}${address.search}`, { scroll: false });
  }

  function reportDelivery(
    email: string,
    result: Readonly<Exclude<InviteStaffResult, { ok: false }>>,
    resent: boolean,
  ) {
    if (result.delivery === "accepted") {
      setFallback(null);
      toast.success(resent ? `Invite sent again to ${email}` : `Invite sent to ${email}`);
      return;
    }
    setFallback({ email, url: result.fallbackSetupUrl, copied: false });
  }

  async function resend(person: Readonly<StaffMember>) {
    const result = await resendStaffInvite({ id: person.user_id });
    if (!result.ok) {
      toast.error(result.error);
      router.refresh();
      return;
    }
    reportDelivery(person.email, result, true);
  }

  async function changeRole(person: Readonly<StaffMember>, role: StaffRole) {
    if (role === person.role) return;
    const result = await changeStaffRole({ userId: person.user_id, role });
    router.refresh();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const name = person.onboarded_at === null ? person.email : person.display_name;
    showUndoToast({
      headline: `${name} is now ${ROLE_NAMES[role]}`,
      detail: null,
      undo: async () => {
        const back = await changeStaffRole({ userId: person.user_id, role: person.role });
        return back.ok
          ? { ok: true, message: `${name} is ${ROLE_NAMES[person.role]} again` }
          : { ok: false, message: back.error };
      },
      onSettled: () => {
        router.refresh();
      },
    });
  }

  function copyFallback() {
    if (fallback === null) return;
    void navigator.clipboard
      .writeText(fallback.url)
      .then(() => {
        setFallback((current) => (current === null ? current : { ...current, copied: true }));
      })
      .catch(() => {
        toast.error("The link couldn't be copied. Select it and copy it instead.");
      });
  }

  return (
    <div data-testid="staff-manager" className="wgi-settings mt-6 flex flex-col gap-4">
      <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">
        Everyone who can sign in to the staff portal, and what their role lets them do.
      </p>
      {fallback === null ? null : (
        <section
          data-testid="invite-fallback-panel"
          aria-labelledby="invite-fallback-title"
          className="settings-notice flex flex-col gap-3"
        >
          <div role="status">
            <p id="invite-fallback-title" className="font-bold">
              The invite email to <span data-ui-redact>{fallback.email}</span> didn&apos;t send
            </p>
            <p className="mt-1">
              Give them this setup link another way. It works once and isn&apos;t shown again.
            </p>
          </div>
          <code
            data-testid="fallback-setup-url"
            data-ui-redact
            className="block rounded-[0.5rem] bg-white px-3 py-2 font-mono text-[0.8125rem] leading-relaxed break-all text-(--wgi-name-ink)"
          >
            {fallback.url}
          </code>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={copyFallback}>
              {fallback.copied ? "Copied" : "Copy setup link"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFallback(null);
              }}
            >
              Dismiss
            </Button>
          </div>
        </section>
      )}
      <div className="settings-table settings-staff">
        <div aria-hidden="true" className="settings-table-head">
          <span>Name</span>
          <span>Role</span>
          <span>Last signed in</span>
          <span />
        </div>
        <ul data-testid="staff-list" aria-label="Staff who can sign in" className="contents">
          {staff.map((person) => (
            <StaffRowView
              key={person.user_id}
              person={person}
              isSelf={person.user_id === selfUserId}
              canEdit={canEdit}
              signInReadFailed={signInReadFailed}
              now={now}
              onRole={async (role) => changeRole(person, role)}
              onResend={async () => resend(person)}
              onConfirm={(kind) => {
                setConfirming({ kind, person });
              }}
            />
          ))}
          {arriving.map((invite) => (
            <li
              key={invite.email}
              data-staff-email={invite.email}
              className="settings-table-row is-new"
            >
              <PersonCell pending name={invite.email} line={invitedLabel(now, now)} />
              <span>
                <span className="settings-role-pill">{ROLE_NAMES[invite.role]}</span>
              </span>
              <span className="text-[0.8125rem] text-(--wgi-muted-ink)">Invite sent</span>
              <span />
            </li>
          ))}
        </ul>
      </div>
      {canEdit && inviting ? (
        <InviteDialog
          onLeave={leaveInvite}
          onSent={(invite) => {
            setSent((current) => [...current, invite]);
            reportDelivery(invite.email, invite.result, false);
            leaveInvite();
            router.refresh();
          }}
        />
      ) : null}
      {confirming === null ? null : (
        <ConfirmStaffDialog
          confirming={confirming}
          onClose={() => {
            setConfirming(null);
          }}
          onDone={() => {
            /* A cancelled invite's setup link no longer works. */
            if (fallback?.email === confirming.person.email) setFallback(null);
            setConfirming(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PersonCell({
  pending,
  name,
  line,
}: Readonly<{ pending: boolean; name: string; line: string }>) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {pending ? (
        <span aria-hidden="true" className="settings-avatar is-pending">
          <Mail className="size-4" />
        </span>
      ) : (
        <span aria-hidden="true" className="settings-avatar">
          {initialsOf(name)}
        </span>
      )}
      <span className="min-w-0">
        <span data-ui-redact className="settings-table-name block truncate">
          {name}
        </span>
        <span
          data-ui-redact={pending ? undefined : true}
          className="block truncate text-[0.8125rem] leading-[1.125rem] text-(--wgi-muted-ink)"
        >
          {line}
        </span>
      </span>
    </span>
  );
}

function StaffRowView({
  person,
  isSelf,
  canEdit,
  signInReadFailed,
  now,
  onRole,
  onResend,
  onConfirm,
}: Readonly<{
  person: StaffMember;
  isSelf: boolean;
  canEdit: boolean;
  signInReadFailed: boolean;
  now: string;
  onRole: (role: StaffRole) => Promise<void>;
  onResend: () => Promise<void>;
  onConfirm: (kind: Confirming["kind"]) => void;
}>) {
  const pending = person.onboarded_at === null;
  const name = pending ? person.email : person.display_name;
  const signedIn = lastSignedIn(person, { isSelf, signInReadFailed, now });

  return (
    <li
      data-staff-email={person.email}
      data-testid="staff-row"
      className={cn("settings-table-row", pending && "is-pending")}
    >
      <PersonCell
        pending={pending}
        name={name}
        line={pending ? invitedLabel(person.created_at, now) : person.email}
      />
      <RoleCell person={person} name={name} isSelf={isSelf} canEdit={canEdit} onRole={onRole} />
      <SignInCell person={person} canEdit={canEdit} signedIn={signedIn} onResend={onResend} />
      <span className="flex items-center justify-center">
        {canEdit && !isSelf ? (
          <Menu>
            <MenuTrigger className="settings-row-more" aria-label={`More for ${name}`}>
              <Ellipsis aria-hidden="true" width={15} height={15} />
            </MenuTrigger>
            <MenuContent align="end" className="min-w-56">
              <MenuGroup>
                <MenuItem
                  data-action="deactivate"
                  onClick={() => {
                    onConfirm(pending ? "cancel-invite" : "deactivate");
                  }}
                >
                  {pending ? "Cancel invite" : "Deactivate"}
                </MenuItem>
              </MenuGroup>
            </MenuContent>
          </Menu>
        ) : null}
      </span>
    </li>
  );
}

function RoleCell({
  person,
  name,
  isSelf,
  canEdit,
  onRole,
}: Readonly<{
  person: StaffMember;
  name: string;
  isSelf: boolean;
  canEdit: boolean;
  onRole: (role: StaffRole) => Promise<void>;
}>) {
  /* The pill shows the new role at once; the server's answer settles it. */
  const [role, setRole] = useState(person.role);
  const [seenRole, setSeenRole] = useState(person.role);
  if (seenRole !== person.role) {
    setSeenRole(person.role);
    setRole(person.role);
  }
  return (
    <span>
      {canEdit && !isSelf ? (
        <Menu>
          <MenuTrigger
            className="settings-role-pill is-menu"
            aria-label={`Role for ${name}: ${ROLE_NAMES[role]}`}
          >
            {ROLE_NAMES[role]}
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </MenuTrigger>
          <MenuContent align="start" className="min-w-48">
            <MenuRadioGroup
              value={role}
              onValueChange={(value: string) => {
                const next = parseStaffRole(value);
                if (next === null) return;
                setRole(next);
                void onRole(next).finally(() => {
                  setRole(person.role);
                });
              }}
            >
              {ROLES.map((each) => (
                <MenuRadioItem key={each} value={each}>
                  {ROLE_NAMES[each]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      ) : (
        <span className="settings-role-pill">{ROLE_NAMES[person.role]}</span>
      )}
    </span>
  );
}

function SignInCell({
  person,
  canEdit,
  signedIn,
  onResend,
}: Readonly<{
  person: StaffMember;
  canEdit: boolean;
  signedIn: string;
  onResend: () => Promise<void>;
}>) {
  const [resending, setResending] = useState(false);
  const pending = person.onboarded_at === null;
  return (
    <span
      data-testid="staff-last-sign-in"
      className="truncate text-[0.8125rem] text-(--wgi-muted-ink)"
    >
      {pending ? (
        <>
          Invite sent
          {canEdit ? (
            <>
              {" · "}
              <button
                type="button"
                data-action="resend-invite"
                disabled={resending}
                aria-label={`Resend the invite to ${person.email}`}
                className="settings-text-command"
                onClick={() => {
                  setResending(true);
                  void onResend().finally(() => {
                    setResending(false);
                  });
                }}
              >
                {resending ? "Sending…" : "Resend"}
              </button>
            </>
          ) : null}
        </>
      ) : (
        signedIn
      )}
    </span>
  );
}

function lastSignedIn(
  person: Readonly<StaffMember>,
  {
    isSelf,
    signInReadFailed,
    now,
  }: Readonly<{ isSelf: boolean; signInReadFailed: boolean; now: string }>,
): string {
  if (signInReadFailed) return "Not available";
  if (isSelf) return "Now · you";
  return person.lastSignInAt === null ? "Not yet" : signedInLabel(person.lastSignInAt, now);
}

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"),
  );
  const first = controls.at(0);
  const last = controls.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* Deactivating and cancelling an invite have no Undo, so they ask first,
   Cancel focused. */
function ConfirmStaffDialog({
  confirming,
  onClose,
  onDone,
}: Readonly<{
  confirming: Confirming;
  onClose: () => void;
  onDone: () => void;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { person } = confirming;
  const deactivating = confirming.kind === "deactivate";
  const name = deactivating ? person.display_name : person.email;

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await deactivateStaff({ id: person.user_id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(deactivating ? `${name} is deactivated` : `Invite to ${name} cancelled`);
      onDone();
    } catch {
      setError("That didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={(dialog) => {
        if (dialog !== null && !dialog.open) showModalWithInitialFocus(dialog);
      }}
      aria-modal="true"
      aria-labelledby="confirm-staff-title"
      aria-describedby="confirm-staff-copy"
      data-testid="confirm-staff-dialog"
      className="portal-confirm-dialog"
      onKeyDown={keepFocusInDialog}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!pending) onClose();
      }}
    >
      <div className="portal-confirm-dialog-body">
        <div className="portal-confirm-dialog-heading">
          <h2 id="confirm-staff-title" className="portal-confirm-dialog-title">
            {deactivating ? (
              <>
                Deactivate <span data-ui-redact>{name}</span>?
              </>
            ) : (
              <>
                Cancel the invite to <span data-ui-redact>{name}</span>?
              </>
            )}
          </h2>
          <button
            type="button"
            disabled={pending}
            className="portal-confirm-dialog-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p id="confirm-staff-copy">
          {deactivating
            ? "They lose access to the portal at once. Only the software maintainer can restore it."
            : "The link in their invite email stops working."}
        </p>
        {error === null ? null : (
          <p role="alert" className="settings-notice">
            {error}
          </p>
        )}
      </div>
      <div className="portal-confirm-dialog-actions">
        <Button type="button" data-initial-focus disabled={pending} onClick={onClose}>
          {deactivating ? "Keep access" : "Keep invite"}
        </Button>
        <button
          type="button"
          data-action="confirm"
          disabled={pending}
          onClick={() => {
            void confirm();
          }}
          className="portal-confirm-dialog-destructive min-h-11 disabled:opacity-60"
        >
          {pending ? "Working…" : deactivating ? "Deactivate" : "Cancel invite"}
        </button>
      </div>
    </dialog>
  );
}
