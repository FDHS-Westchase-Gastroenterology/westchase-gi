"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getMaintainerViewState } from "@/lib/portal/maintainer-view";

// The staff-facing surface for "who can change the website". This component
// owns presentation and confirmation only; every decision that matters
// (authorization, target resolution, auditing, re-reading the provider)
// happens server-side behind the `MaintainerActions` contract below.
//
// The clinic never "works in GitHub" here: rows are people, the one place
// GitHub is named is the invite field, because the username is the only
// credential a maintainer has.

export type Maintainer = {
  /** GitHub numeric user ID — the value revoke submits. */
  userId: number;
  login: string;
};

export type PendingInvitation = {
  /** GitHub numeric invitation ID — the value cancel submits. */
  invitationId: number;
  login: string;
};

export type MaintainerManagementState =
  /** Installation still covers all repositories; owner must narrow it. */
  | "restrict_installation"
  /** Installation lacks administration write; owner must approve it. */
  | "permission_upgrade_required"
  | "ready";

export type MaintainerAccessModel =
  | { state: "not_configured" }
  | { state: "unavailable" }
  | {
      state: "connected";
      ownerLogin: string;
      management: MaintainerManagementState;
      /** null = this deployment cannot read the list yet (never stale data). */
      maintainers: Maintainer[] | null;
      invitations: PendingInvitation[] | null;
    };

export type MaintainerActionResult =
  | { ok: true }
  | {
      ok: false;
      code?:
        | "invalid"
        | "not_found"
        | "conflict"
        | "forbidden"
        | "limit"
        | "unconfirmed"
        | "unavailable";
    };

// The exact server contract the backend pass must fulfil (three narrow
// commands, no permission selector, numeric IDs from rendered records).
export type MaintainerActions = {
  inviteMaintainer: (input: { username: string }) => Promise<MaintainerActionResult>;
  cancelMaintainerInvite: (input: {
    invitationId: number;
  }) => Promise<MaintainerActionResult>;
  revokeMaintainer: (input: { userId: number }) => Promise<MaintainerActionResult>;
};

const FAILURE_COPY: Record<string, string> = {
  invalid: "That doesn't look like a GitHub username — check it and try again.",
  not_found:
    "GitHub doesn't recognize that username. Check the exact spelling with the person you're adding.",
  conflict: "That person already has access or a pending invitation.",
  forbidden:
    "That change isn't allowed right now. Try again later, or ask your website maintainer to check the connection.",
  limit:
    "Invitations are temporarily limited. Wait a day before sending more.",
  unconfirmed:
    "We couldn't confirm whether that change went through. The list below is the latest confirmed state — check it before trying again.",
  unavailable: "Something went wrong making the change. Try again.",
};

function failureMessage(result: MaintainerActionResult): string {
  if (result.ok) return "";
  return FAILURE_COPY[result.code ?? "unavailable"] ?? FAILURE_COPY.unavailable;
}

const STATUS_LABEL: Record<string, string> = {
  not_configured: "Not configured",
  unavailable: "Connection unavailable",
  connected: "Connected",
};

function StatusPill({ state }: { state: MaintainerAccessModel["state"] }) {
  return (
    <span
      data-testid="integration-status"
      className="rounded-full bg-[var(--color-line)] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[var(--color-muted)]"
    >
      {STATUS_LABEL[state]}
    </span>
  );
}

function RolePill({
  tone,
  children,
}: {
  tone: "owner" | "maintainer" | "invited";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "invited"
      ? "bg-[var(--color-amber-soft)] text-[var(--color-ink)]"
      : "bg-[var(--color-mint)] text-[var(--color-teal-ink)]";
  return (
    <span
      className={`flex min-h-10 items-center rounded-full px-3.5 text-[0.85rem] font-bold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function SetupNotice({ management }: { management: MaintainerManagementState }) {
  const [headline, ownerStep] =
    management === "restrict_installation"
      ? [
          "Managing access from this page needs one more setup step.",
          "In the practice's GitHub account, open the wgi-portal app's settings and change its repository access from \u201cAll repositories\u201d to \u201cOnly select repositories\u201d, selecting westchase-gi.",
        ]
      : [
          "Managing access from this page is waiting on the practice owner's approval.",
          "In the practice's GitHub account, approve the wgi-portal app's updated permission request (repository administration).",
        ];
  return (
    <div
      data-testid="maintainer-setup-notice"
      className="mt-4 rounded-[var(--radius)] border border-[var(--color-line-2)] bg-[var(--color-amber-soft)] p-4"
    >
      <p className="text-sm font-bold text-[var(--color-ink)]">{headline}</p>
      <p className="mt-1.5 max-w-[70ch] text-[0.85rem] leading-relaxed text-[var(--color-body)]">
        Until then, nothing here can be changed — only viewed. The step is a
        one-time action for the practice owner (your website maintainer can
        walk through it with you): {ownerStep}
      </p>
    </div>
  );
}

export function MaintainerAccess({
  model,
  isAdmin,
  actions,
}: {
  model: MaintainerAccessModel;
  isAdmin: boolean;
  /** Wired by the server page once the mutation seam exists; controls render
   *  only when management is "ready" AND actions are provided. */
  actions?: MaintainerActions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function run(action: () => Promise<MaintainerActionResult>, onSuccess: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(failureMessage(result));
        router.refresh();
        return;
      }
      setNotice(onSuccess);
      router.refresh();
    });
  }

  const view = getMaintainerViewState(model, isAdmin, Boolean(actions));
  const canManage = view.canManage;

  return (
    <div data-testid="maintainer-access">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
          Who can change the website
        </h3>
        <StatusPill state={model.state} />
      </div>

      {model.state === "not_configured" && (
        <p className="mt-3 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
          The website itself is unaffected — this page just hasn&rsquo;t been
          connected to the account that manages it yet. Once your website
          maintainer completes the connection, everyone with permission to
          change the website is listed here.
        </p>
      )}

      {model.state === "unavailable" && (
        <p className="mt-3 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
          We can&rsquo;t reach the website&rsquo;s account service right now,
          so the access list can&rsquo;t be shown and changes are paused
          rather than risk acting on out-of-date information. The website
          itself is unaffected. Try again in a few minutes.
        </p>
      )}

      {model.state === "connected" && (
        <>
          <p className="mt-2 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
            Everyone listed here can edit and publish the practice&rsquo;s
            website. Administrators can add a maintainer or remove one — for
            example, when the practice changes developers.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
            >
              {notice}
            </p>
          )}

          <ul
            data-testid="maintainer-list"
            className="mt-4 divide-y divide-[var(--color-line)]"
          >
            <li className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--color-ink)]">
                  Westchase GI
                </p>
                <p className="truncate text-[0.85rem] text-[var(--color-muted)]">
                  {`${model.ownerLogin} — the practice\u2019s own account`}
                </p>
              </div>
              <RolePill tone="owner">Owner</RolePill>
            </li>

            {model.maintainers?.map((maintainer) => (
              <li
                key={maintainer.userId}
                data-maintainer-login={maintainer.login}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--color-ink)]">
                    {maintainer.login}
                  </p>
                  <p className="truncate text-[0.85rem] text-[var(--color-muted)]">
                    Can edit and publish the website — Write access
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RolePill tone="maintainer">Maintainer</RolePill>
                  {canManage && actions && (
                    <button
                      type="button"
                      data-action="revoke-maintainer"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${maintainer.login}'s access? They will no longer be able to edit or publish the website. This takes effect immediately.`,
                          )
                        ) {
                          run(
                            () =>
                              actions.revokeMaintainer({
                                userId: maintainer.userId,
                              }),
                            `${maintainer.login} no longer has access.`,
                          );
                        }
                      }}
                      className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
                    >
                      Remove access
                    </button>
                  )}
                </div>
              </li>
            ))}

            {model.invitations?.map((invitation) => (
              <li
                key={invitation.invitationId}
                data-invitation-login={invitation.login}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--color-ink)]">
                    {invitation.login}
                  </p>
                  <p className="truncate text-[0.85rem] text-[var(--color-muted)]">
                    Invited — no access until they accept
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RolePill tone="invited">Invitation sent</RolePill>
                  {canManage && actions && (
                    <button
                      type="button"
                      data-action="cancel-invitation"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Cancel the invitation for ${invitation.login}? Their invitation link will stop working.`,
                          )
                        ) {
                          run(
                            () =>
                              actions.cancelMaintainerInvite({
                                invitationId: invitation.invitationId,
                              }),
                            `The invitation for ${invitation.login} was cancelled.`,
                          );
                        }
                      }}
                      className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)] disabled:opacity-60"
                    >
                      Cancel invitation
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {model.maintainers === null && (
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
              The full list of maintainers appears here once setup is
              complete.
            </p>
          )}
          {view.showInvitationDisclosure && (
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
              Pending invitations appear here once the practice owner approves
              repository administration access.
            </p>
          )}
          {view.showEmptyState && (
              <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
                No one besides the practice&rsquo;s own account can change the
                website right now.
              </p>
            )}

          {view.showSetup && (
            <SetupNotice management={model.management} />
          )}

          {canManage && actions && (
            <form
              className="mt-5 border-t border-[var(--color-line)] pt-5"
              action={(formData: FormData) => {
                const username = String(formData.get("username") ?? "").trim();
                if (!username) return;
                run(
                  () => actions.inviteMaintainer({ username }),
                  `Invitation sent to ${username}. They stay listed as invited until they accept.`,
                );
              }}
            >
              <h4 className="text-sm font-bold text-[var(--color-ink)]">
                Add a maintainer
              </h4>
              <p className="mt-1 max-w-[65ch] text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
                Ask the person for their exact GitHub username — it&rsquo;s
                the one account detail this needs. Once they accept, Write
                access lets them change code and merge changes that publish
                the website.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="min-w-0 flex-1 basis-64">
                  <label htmlFor="maintainer-username" className="sr-only">
                    GitHub username
                  </label>
                  <input
                    id="maintainer-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="GitHub username"
                    disabled={pending}
                    className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-navy min-h-11 disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send invitation"}
                </button>
              </div>
            </form>
          )}

          {!isAdmin && (
            <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[0.9rem] text-[var(--color-muted)]">
              Adding or removing a maintainer needs an administrator.
            </p>
          )}
        </>
      )}
    </div>
  );
}
