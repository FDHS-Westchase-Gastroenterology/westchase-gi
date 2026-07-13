"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStaffRole, deactivateStaff, inviteStaff } from "./actions";

export type StaffRow = {
  user_id: string;
  email: string;
  display_name: string;
  role: "admin" | "staff";
  active: boolean;
};

type MutationOutcome = { ok: boolean; code?: string };

const FAILURE_COPY: Record<string, string> = {
  invalid: "Check the email and name — one of them isn't valid.",
  conflict: "That person already has portal access.",
  not_found: "That account no longer exists — the list has been refreshed.",
  unavailable: "Something went wrong saving the change. Try again.",
};

function failureMessage(result: MutationOutcome): string {
  return FAILURE_COPY[result.code ?? "unavailable"] ?? FAILURE_COPY.unavailable;
}

export function StaffManager({
  staff,
  isAdmin,
  selfUserId,
}: {
  staff: StaffRow[];
  isAdmin: boolean;
  selfUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The one-time credential panel: email + password + copied, one unit.
  const [issued, setIssued] = useState<{
    email: string;
    tempPassword: string;
    copied: boolean;
  } | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "admin" | "staff">>(
    {},
  );

  function run(action: () => Promise<MutationOutcome>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(failureMessage(result));
        return;
      }
      router.refresh();
    });
  }

  function inviteFromForm(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const role =
      String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";
    if (!email || !displayName) return;

    setError(null);
    startTransition(async () => {
      const result = await inviteStaff({ email, displayName, role });
      if (!result.ok) {
        setError(failureMessage(result));
        return;
      }
      if ("tempPassword" in result) {
        setIssued({ email, tempPassword: result.tempPassword, copied: false });
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid="staff-manager"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        Staff access
      </h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Everyone who can open this portal. Administrators can invite
        people, change roles, and deactivate accounts; deactivated staff
        are locked out immediately.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          {error}
        </p>
      )}

      {issued && (
        <div
          data-testid="temp-password-panel"
          className="mt-4 rounded-[var(--radius)] border border-[var(--color-teal-ink)] bg-[var(--color-mint)] p-4"
        >
          <p className="text-sm font-bold text-[var(--color-ink)]">
            One-time password for {issued.email}
          </p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-body)]">
            Share it securely (in person or by phone — not email). It is
            shown only this once; they should sign in and keep it safe.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code
              data-testid="temp-password"
              className="rounded-[var(--radius-sm)] bg-white px-3 py-2 font-mono text-[0.95rem] text-[var(--color-ink)]"
            >
              {issued.tempPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(issued.tempPassword)
                  .then(() =>
                    setIssued((current) =>
                      current ? { ...current, copied: true } : current,
                    ),
                  );
              }}
              className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)]"
            >
              {issued.copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setIssued(null)}
              className="flex min-h-10 items-center rounded-[var(--radius-sm)] px-3.5 text-[0.85rem] font-bold text-[var(--color-muted)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <ul data-testid="staff-list" className="mt-5 divide-y divide-[var(--color-line)]">
        {staff.map((person) => {
          const isSelf = person.user_id === selfUserId;
          const draft = roleDrafts[person.user_id] ?? person.role;
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
                    <span className="ml-2 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[var(--color-teal-ink)]">
                      You
                    </span>
                  )}
                </p>
                <p className="truncate text-[0.85rem] text-[var(--color-muted)]">
                  {person.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!person.active ? (
                  <span className="flex min-h-10 items-center rounded-full bg-[var(--color-line)] px-3.5 text-[0.85rem] font-bold text-[var(--color-muted)]">
                    Deactivated
                  </span>
                ) : isAdmin && !isSelf ? (
                  <>
                    <label className="sr-only" htmlFor={`role-${person.user_id}`}>
                      Role for {person.display_name}
                    </label>
                    <select
                      id={`role-${person.user_id}`}
                      value={draft}
                      disabled={pending}
                      onChange={(event) =>
                        setRoleDrafts((current) => ({
                          ...current,
                          [person.user_id]: event.target.value as
                            | "admin"
                            | "staff",
                        }))
                      }
                      className="min-h-10 rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-white px-2.5 text-[0.85rem] font-bold text-[var(--color-body)]"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    {draft !== person.role && (
                      <button
                        type="button"
                        data-action="apply-role"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            changeStaffRole({
                              userId: person.user_id,
                              role: draft,
                            }),
                          )
                        }
                        className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-teal-ink)] px-3.5 text-[0.85rem] font-bold text-[var(--color-teal-ink)] disabled:opacity-60"
                      >
                        Apply
                      </button>
                    )}
                    <button
                      type="button"
                      data-action="deactivate"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Deactivate ${person.display_name}? They are locked out immediately and this can only be undone by an engineer.`,
                          )
                        ) {
                          run(() => deactivateStaff({ id: person.user_id }));
                        }
                      }}
                      className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
                    >
                      Deactivate
                    </button>
                  </>
                ) : (
                  <span className="flex min-h-10 items-center rounded-full bg-[var(--color-mint)] px-3.5 text-[0.85rem] font-bold capitalize text-[var(--color-teal-ink)]">
                    {person.role}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isAdmin ? (
        <form
          className="mt-5 border-t border-[var(--color-line)] pt-5"
          action={inviteFromForm}
        >
          <h3 className="text-sm font-bold text-[var(--color-ink)]">
            Invite a staff member
          </h3>
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
                disabled={pending}
                className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
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
                disabled={pending}
                className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
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
                disabled={pending}
                className="min-h-11 rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3 text-[0.95rem] font-bold text-[var(--color-body)]"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="btn btn-navy min-h-11 disabled:opacity-60"
            >
              {pending ? "Inviting…" : "Invite"}
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
