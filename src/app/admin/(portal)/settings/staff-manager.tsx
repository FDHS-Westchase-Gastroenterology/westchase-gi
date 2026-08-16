"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatReceived } from "@/app/admin/(portal)/requests/format";

import { changeStaffRole, deactivateStaff, inviteStaff, resendStaffInvite } from "./actions";

export interface StaffRow {
  user_id: string;
  email: string;
  display_name: string;
  role: "admin" | "staff";
  active: boolean;
  onboarded_at: string | null;
  lastSignInAt?: string | null;
}

interface MutationOutcome {
  ok: boolean;
  code?: string;
  delivery?: "accepted" | "failed";
  fallbackSetupUrl?: string;
}

type StaffFailureCode = "invalid" | "conflict" | "not_found" | "unavailable";

const FAILURE_COPY = {
  invalid: "Check the email and name — one of them isn't valid.",
  conflict: "That person already has portal access.",
  not_found: "That account no longer exists — the list has been refreshed.",
  unavailable: "Something went wrong saving the change. Try again.",
} as const satisfies Record<StaffFailureCode, string>;

function isStaffFailureCode(value: string): value is StaffFailureCode {
  return value in FAILURE_COPY;
}

function failureMessage(result: Readonly<MutationOutcome>): string {
  const code = result.code ?? "unavailable";
  return isStaffFailureCode(code) ? FAILURE_COPY[code] : FAILURE_COPY.unavailable;
}

function parseStaffRole(value: string): "admin" | "staff" | null {
  return value === "admin" || value === "staff" ? value : null;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function StaffList({
  staff,
  isAdmin,
  selfUserId,
  signInReadFailed,
  pendingKey,
  roleDrafts,
  onRoleDraft,
  run,
  resendFromRow,
}: Readonly<{
  staff: StaffRow[];
  isAdmin: boolean;
  selfUserId: string;
  signInReadFailed: boolean;
  pendingKey: string | null;
  roleDrafts: Record<string, "admin" | "staff">;
  onRoleDraft: (userId: string, role: "admin" | "staff") => void;
  run: (key: string, action: () => Promise<MutationOutcome>) => void;
  resendFromRow: (person: Readonly<StaffRow>) => void;
}>) {
  return (
    <ul data-testid="staff-list" className="mt-5 divide-y divide-[var(--color-line)]">
      {staff.map((person) => {
        const isSelf = person.user_id === selfUserId;
        const isPendingSetup = person.onboarded_at === null;
        const draft = roleDrafts[person.user_id] ?? person.role;
        const rowPending =
          pendingKey === `role:${person.user_id}` ||
          pendingKey === `deactivate:${person.user_id}` ||
          pendingKey === `resend:${person.user_id}`;
        return (
          <li
            key={person.user_id}
            data-staff-email={person.email}
            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-[var(--color-ink)]">
                {person.display_name}
                {isSelf && (
                  <span className="ml-2 text-[0.75rem] font-bold tracking-[0.06em] text-[var(--color-teal-ink)] uppercase">
                    You
                  </span>
                )}
              </p>
              <p className="truncate text-[0.85rem] text-[var(--color-muted)]">{person.email}</p>
              <p
                data-testid="staff-last-sign-in"
                className="mt-0.5 text-[0.8rem] text-[var(--color-muted)]"
              >
                {signInReadFailed
                  ? "Sign-in info unavailable"
                  : person.lastSignInAt !== undefined &&
                      person.lastSignInAt !== null &&
                      person.lastSignInAt !== ""
                    ? `Last sign in ${formatReceived(person.lastSignInAt)}`
                    : "No sign-ins yet"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPendingSetup ? (
                <>
                  <span className="flex min-h-10 items-center rounded-full bg-[var(--color-amber-soft)] px-3.5 text-[0.85rem] font-bold text-[var(--color-ink)]">
                    Pending setup
                  </span>
                  <span className="flex min-h-10 items-center rounded-full bg-[var(--color-mint)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] capitalize">
                    {person.role}
                  </span>
                  {isAdmin && !isSelf && (
                    <>
                      <button
                        type="button"
                        data-action="resend-invite"
                        disabled={rowPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Send ${person.display_name} a new setup link? Any earlier link will stop working.`,
                            )
                          ) {
                            resendFromRow(person);
                          }
                        }}
                        className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] disabled:opacity-60"
                      >
                        Resend invite
                      </button>
                      <button
                        type="button"
                        data-action="deactivate"
                        disabled={rowPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Cancel the pending invitation for ${person.display_name}? Their setup link will stop working.`,
                            )
                          ) {
                            run(`deactivate:${person.user_id}`, async () =>
                              deactivateStaff({ id: person.user_id }),
                            );
                          }
                        }}
                        className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
                      >
                        Deactivate
                      </button>
                    </>
                  )}
                </>
              ) : isAdmin && !isSelf ? (
                <>
                  <label className="sr-only" htmlFor={`role-${person.user_id}`}>
                    Role for {person.display_name}
                  </label>
                  <select
                    id={`role-${person.user_id}`}
                    value={draft}
                    disabled={rowPending}
                    onChange={(event) => {
                      const role = parseStaffRole(event.target.value);
                      if (role) onRoleDraft(person.user_id, role);
                    }}
                    className="min-h-10 rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-white px-2.5 text-[0.85rem] font-bold text-[var(--color-body)]"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {draft !== person.role && (
                    <button
                      type="button"
                      data-action="apply-role"
                      disabled={rowPending}
                      onClick={() => {
                        run(`role:${person.user_id}`, async () =>
                          changeStaffRole({
                            userId: person.user_id,
                            role: draft,
                          }),
                        );
                      }}
                      className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] disabled:opacity-60"
                    >
                      Apply
                    </button>
                  )}
                  <button
                    type="button"
                    data-action="deactivate"
                    disabled={rowPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deactivate ${person.display_name}? They are locked out immediately and this can only be undone by an engineer.`,
                        )
                      ) {
                        run(`deactivate:${person.user_id}`, async () =>
                          deactivateStaff({ id: person.user_id }),
                        );
                      }
                    }}
                    className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
                  >
                    Deactivate
                  </button>
                </>
              ) : (
                <span className="flex min-h-10 items-center rounded-full bg-[var(--color-mint)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] capitalize">
                  {person.role}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function StaffManager({
  staff,
  isAdmin,
  selfUserId,
  signInReadFailed = false,
}: Readonly<{
  staff: StaffRow[];
  isAdmin: boolean;
  selfUserId: string;
  signInReadFailed?: boolean;
}>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{
    email: string;
    delivery: "accepted" | "failed";
    fallbackSetupUrl?: string;
    copied: boolean;
  } | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "admin" | "staff">>({});

  function run(key: string, action: () => Promise<MutationOutcome>) {
    setError(null);
    setIssued(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await action();
      setPendingKey(null);
      if (!result.ok) {
        setError(failureMessage(result));
        return;
      }
      router.refresh();
    });
  }

  function showInviteResult(email: string, result: Readonly<MutationOutcome>): boolean {
    if (!result.ok) {
      setError(failureMessage(result));
      return false;
    }
    if (
      (result.delivery !== "accepted" && result.delivery !== "failed") ||
      (result.delivery === "failed" &&
        (result.fallbackSetupUrl === undefined || result.fallbackSetupUrl === ""))
    ) {
      setError(FAILURE_COPY.unavailable);
      return false;
    }

    setIssued({
      email,
      delivery: result.delivery,
      fallbackSetupUrl: result.fallbackSetupUrl,
      copied: false,
    });
    return true;
  }

  function inviteFromForm(formData: FormData) {
    const rawEmail = formData.get("email");
    const rawDisplayName = formData.get("displayName");
    const rawRole = formData.get("role");
    const email = rawEmail === null || rawEmail instanceof File ? "" : rawEmail.trim();
    const displayName =
      rawDisplayName === null || rawDisplayName instanceof File ? "" : rawDisplayName.trim();
    const roleValue = rawRole === null || rawRole instanceof File ? "staff" : rawRole;
    const role = roleValue === "admin" ? "admin" : "staff";
    if (!email || !displayName) return;

    setError(null);
    setIssued(null);
    setPendingKey("invite");
    startTransition(async () => {
      const result = await inviteStaff({ email, displayName, role });
      setPendingKey(null);
      if (showInviteResult(email, result)) router.refresh();
    });
  }

  function resendFromRow(person: Readonly<StaffRow>) {
    setError(null);
    setIssued(null);
    setPendingKey(`resend:${person.user_id}`);
    startTransition(async () => {
      const result = await resendStaffInvite({ id: person.user_id });
      setPendingKey(null);
      if (showInviteResult(person.email, result)) router.refresh();
    });
  }

  return (
    <div
      data-testid="staff-manager"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">Staff access</h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Everyone who can open this portal. Administrators can invite people, change roles, and
        deactivate accounts; deactivated staff are locked out immediately.
      </p>

      {error !== null && error !== "" && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {error}
        </p>
      )}

      {issued && (
        <div
          data-testid={
            issued.delivery === "accepted" ? "invite-delivery-panel" : "invite-fallback-panel"
          }
          className="mt-4 rounded-[var(--radius)] border border-[var(--color-teal-ink)] bg-[var(--color-mint)] p-4"
        >
          <div role="status">
            <p className="text-sm font-bold text-[var(--color-ink)]">
              {issued.delivery === "accepted"
                ? `Invitation accepted for delivery to ${issued.email}`
                : `Invitation created for ${issued.email}`}
            </p>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-body)]">
              {issued.delivery === "accepted"
                ? "They can use the one-time link in the email to choose their own password."
                : "Email delivery could not be confirmed. Share this one-time setup link securely if they do not receive the message; it is shown only this once."}
            </p>
          </div>
          {issued.delivery === "failed" &&
            issued.fallbackSetupUrl !== undefined &&
            issued.fallbackSetupUrl !== "" && (
              <code
                data-testid="fallback-setup-url"
                className="mt-3 block rounded-[var(--radius-sm)] bg-white px-3 py-2 font-mono text-[0.8rem] leading-relaxed break-all text-[var(--color-ink)]"
              >
                {issued.fallbackSetupUrl}
              </code>
            )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {issued.delivery === "failed" &&
              issued.fallbackSetupUrl !== undefined &&
              issued.fallbackSetupUrl !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(issued.fallbackSetupUrl ?? "")
                      .then(() => {
                        setIssued((current) =>
                          current !== null ? { ...current, copied: true } : current,
                        );
                      })
                      .catch(() => {
                        setError("Could not copy the setup link. Select and copy it manually.");
                      });
                  }}
                  className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)]"
                >
                  {issued.copied ? "Copied" : "Copy setup link"}
                </button>
              )}
            <button
              type="button"
              onClick={() => {
                setIssued(null);
              }}
              className="flex min-h-10 items-center rounded-[var(--radius-sm)] px-3.5 text-[0.85rem] font-bold text-[var(--color-muted)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <StaffList
        staff={staff}
        isAdmin={isAdmin}
        selfUserId={selfUserId}
        signInReadFailed={signInReadFailed}
        pendingKey={pendingKey}
        roleDrafts={roleDrafts}
        onRoleDraft={(userId, role) => {
          setRoleDrafts((current) => ({ ...current, [userId]: role }));
        }}
        run={run}
        resendFromRow={resendFromRow}
      />

      {isAdmin ? (
        <form className="mt-5 border-t border-[var(--color-line)] pt-5" action={inviteFromForm}>
          <h3 className="text-sm font-bold text-[var(--color-ink)]">Invite a staff member</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_1.3fr_auto_auto]">
            <div>
              <label htmlFor="invite-email" className="sr-only">
                Email address
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="person@example.com"
                disabled={pendingKey === "invite"}
                className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)]"
              />
            </div>
            <div>
              <label htmlFor="invite-name" className="sr-only">
                Display name
              </label>
              <input
                id="invite-name"
                name="displayName"
                type="text"
                required
                placeholder="Full name"
                disabled={pendingKey === "invite"}
                className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)]"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="sr-only">
                Role
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="staff"
                disabled={pendingKey === "invite"}
                className="min-h-11 rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3 text-[0.95rem] font-bold text-[var(--color-body)]"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={pendingKey === "invite"}
              className="btn btn-navy min-h-11 disabled:opacity-60"
            >
              {pendingKey === "invite" ? "Inviting…" : "Invite"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[0.9rem] text-[var(--color-muted)]">
          Inviting or deactivating staff needs an administrator.
        </p>
      )}
    </div>
  );
}
