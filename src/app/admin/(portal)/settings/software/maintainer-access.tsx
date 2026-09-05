"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type {
  MaintainerFailureCode,
  MaintainerManagementState,
  MaintainerMutationResult,
} from "@/lib/portal/maintainer-operation";
import { getMaintainerViewState } from "@/lib/portal/maintainer-view";
import type { MaintainerAccessModel } from "@/lib/portal/maintainer-view";

// The staff-facing surface for "who can change the website". This component
// Owns presentation and confirmation only; every decision that matters
// (authorization, target resolution, auditing, re-reading the provider)
// Happens server-side behind the `MaintainerActions` contract below.
//
// The clinic never "works in GitHub" here: rows are people, the one place
// GitHub is named is the invite field, because the username is the only
// Credential a maintainer has.

// The exact server contract the backend pass must fulfil (three narrow
// Commands, no permission selector, numeric IDs from rendered records).
export interface MaintainerActions {
  inviteMaintainer: (input: Readonly<{ username: string }>) => Promise<MaintainerMutationResult>;
  cancelMaintainerInvite: (
    input: Readonly<{
      invitationId: number;
    }>,
  ) => Promise<MaintainerMutationResult>;
  revokeMaintainer: (input: Readonly<{ userId: number }>) => Promise<MaintainerMutationResult>;
}

const FAILURE_COPY = {
  invalid: "That doesn't look like a GitHub username — check it and try again.",
  not_found:
    "GitHub doesn't recognize that username. Check the exact spelling with the person you're adding.",
  conflict: "That person already has access or a pending invitation.",
  forbidden:
    "That change isn't allowed right now. Try again later, or ask your website maintainer to check the connection.",
  limit: "Invitations are temporarily limited. Wait a day before sending more.",
  unconfirmed:
    "We couldn't confirm whether that change went through. The list below is the latest confirmed state — check it before trying again.",
  unavailable: "Something went wrong making the change. Try again.",
} as const satisfies Record<MaintainerFailureCode, string>;

function failureMessage(code: MaintainerFailureCode): string {
  return FAILURE_COPY[code];
}

const STATUS_LABEL = {
  not_configured: "Not configured",
  unavailable: "Connection unavailable",
  connected: "Connected",
} as const satisfies Record<MaintainerAccessModel["state"], string>;

function StatusPill({ state }: Readonly<{ state: MaintainerAccessModel["state"] }>) {
  return (
    <span
      data-testid="integration-status"
      className="rounded-full bg-[var(--color-line)] px-2.5 py-1 text-[0.72rem] font-bold tracking-[0.05em] text-[var(--color-muted-ink)] uppercase"
    >
      {STATUS_LABEL[state]}
    </span>
  );
}

function RolePill({
  tone,
  children,
}: Readonly<{
  tone: "owner" | "maintainer" | "invited";
  children: React.ReactNode;
}>) {
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

function SetupNotice({ management }: Readonly<{ management: MaintainerManagementState }>) {
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
        Until then, nothing here can be changed — only viewed. The step is a one-time action for the
        practice owner (your website maintainer can walk through it with you): {ownerStep}
      </p>
    </div>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function MaintainerAccess({
  model,
  isAdmin,
  actions,
}: Readonly<{
  model: MaintainerAccessModel;
  isAdmin: boolean;
  /** Wired by the server page once the mutation seam exists; controls render
   *  only when management is "ready" AND actions are provided. */
  actions?: MaintainerActions;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function run(action: () => Promise<MaintainerMutationResult>, onSuccess: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(failureMessage(result.code));
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
        <h3 className="text-[0.82rem] font-bold tracking-[0.06em] text-[var(--color-muted-ink)] uppercase">
          Who can change the website
        </h3>
        <StatusPill state={model.state} />
      </div>

      {model.state === "not_configured" && (
        <p className="mt-3 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
          The website itself is unaffected — this page just hasn&rsquo;t been connected to the
          account that manages it yet. Once your website maintainer completes the connection,
          everyone with permission to change the website is listed here.
        </p>
      )}

      {model.state === "unavailable" && (
        <p className="mt-3 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
          We can&rsquo;t reach the website&rsquo;s account service right now, so the access list
          can&rsquo;t be shown and changes are paused rather than risk acting on out-of-date
          information. The website itself is unaffected. Try again in a few minutes.
        </p>
      )}

      {model.state === "connected" && (
        <>
          <p className="mt-2 max-w-[70ch] text-[0.9rem] leading-relaxed text-[var(--color-muted-ink)]">
            Everyone listed here can edit and publish the practice&rsquo;s website. Administrators
            can add a maintainer or remove one — for example, when the practice changes maintainers.
          </p>

          {error !== null && error !== "" && (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
            >
              {error}
            </p>
          )}
          {notice !== null && notice !== "" && (
            <p
              role="status"
              className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
            >
              {notice}
            </p>
          )}

          <ul data-testid="maintainer-list" className="mt-4 divide-y divide-[var(--color-line)]">
            <li className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--color-ink)]">Westchase GI</p>
                <p className="truncate text-[0.85rem] text-[var(--color-muted-ink)]">
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
                    {maintainer.login === "ASTXRTYS" ? "Jason M." : maintainer.login}
                  </p>
                  <p className="truncate text-[0.85rem] text-[var(--color-muted-ink)]">
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
                            async () =>
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
                  <p className="truncate font-bold text-[var(--color-ink)]">{invitation.login}</p>
                  <p className="truncate text-[0.85rem] text-[var(--color-muted-ink)]">
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
                            async () =>
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
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted-ink)]">
              The full list of maintainers appears here once setup is complete.
            </p>
          )}
          {view.showInvitationDisclosure && (
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted-ink)]">
              Pending invitations appear here once the practice owner approves repository
              administration access.
            </p>
          )}
          {view.showEmptyState && (
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted-ink)]">
              No one besides the practice&rsquo;s own account can change the website right now.
            </p>
          )}

          {view.showSetup && <SetupNotice management={model.management} />}

          {canManage && actions && (
            <form
              className="mt-5 border-t border-[var(--color-line)] pt-5"
              action={(formData: FormData) => {
                const rawUsername = formData.get("username");
                const username =
                  rawUsername === null || rawUsername instanceof File ? "" : rawUsername.trim();
                if (username === "") return;
                run(
                  async () => actions.inviteMaintainer({ username }),
                  `Invitation sent to ${username}. They stay listed as invited until they accept.`,
                );
              }}
            >
              <h4 className="text-sm font-bold text-[var(--color-ink)]">Add a maintainer</h4>
              <p className="mt-1 max-w-[65ch] text-[0.85rem] leading-relaxed text-[var(--color-muted-ink)]">
                Ask the person for their exact GitHub username — it&rsquo;s the one account detail
                this needs. Once they accept, Write access lets them change code and merge changes
                that publish the website.
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
                    className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)]"
                  />
                </div>
                <Button type="submit" disabled={pending} className="disabled:opacity-60">
                  {pending ? "Sending…" : "Send invitation"}
                </Button>
              </div>
            </form>
          )}

          {!isAdmin && (
            <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[0.9rem] text-[var(--color-muted-ink)]">
              Adding or removing a maintainer needs an administrator.
            </p>
          )}
        </>
      )}
    </div>
  );
}
