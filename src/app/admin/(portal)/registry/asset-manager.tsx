"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addRegistryGrant,
  archiveRegistryAsset,
  createRegistryAsset,
  deactivateRegistryGrant,
  updateRegistryAsset,
} from "./actions";

export type GrantRow = {
  id: string;
  asset_id: string;
  person: string;
  role: string;
  granted_via: string;
  active: boolean;
};

export type AssetWithGrants = {
  id: string;
  name: string;
  kind: string;
  repo: string | null;
  live_url: string | null;
  hosting: string | null;
  maintainer: string | null;
  status: string;
  notes: string | null;
  grants: GrantRow[];
};

type MutationOutcome = { ok: boolean; code?: string; error?: string };

const FAILURE_COPY: Record<string, string> = {
  invalid: "Something in the form isn't valid — check the fields.",
  conflict: "That name (or exact grant) already exists.",
  not_found: "That record no longer exists — the page has been refreshed.",
  unavailable: "Something went wrong saving the change. Try again.",
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]";

const FIELD_LABEL = "block text-[0.8rem] font-bold text-[var(--color-ink)]";

function failureMessage(result: MutationOutcome): string {
  return FAILURE_COPY[result.code ?? "unavailable"] ?? FAILURE_COPY.unavailable;
}

function statusChipClass(status: string): string {
  if (status === "archived") {
    return "bg-[var(--color-line)] text-[var(--color-muted)]";
  }
  if (status === "active") {
    return "bg-[var(--color-mint-2)] text-[var(--color-teal-ink)]";
  }
  return "bg-[var(--color-amber-soft)] text-[var(--color-ink)]";
}

function useMutationRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<MutationOutcome>,
    onSuccess?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(failureMessage(result));
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return { pending, error, run };
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)]"
    >
      {error}
    </p>
  );
}

function AssetFields({
  defaults,
}: {
  defaults?: Partial<AssetWithGrants>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-name">
          Name
        </label>
        <input
          id="asset-name"
          name="name"
          required
          maxLength={120}
          defaultValue={defaults?.name ?? ""}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-kind">
          Kind
        </label>
        <input
          id="asset-kind"
          name="kind"
          required
          maxLength={60}
          placeholder="Website, print tool, portal…"
          defaultValue={defaults?.kind ?? ""}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-repo">
          Code repository (optional)
        </label>
        <input
          id="asset-repo"
          name="repo"
          maxLength={160}
          defaultValue={defaults?.repo ?? ""}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-live-url">
          Live address (optional)
        </label>
        <input
          id="asset-live-url"
          name="liveUrl"
          type="url"
          maxLength={300}
          placeholder="https://…"
          defaultValue={defaults?.live_url ?? ""}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-hosting">
          Where it runs (optional)
        </label>
        <input
          id="asset-hosting"
          name="hosting"
          maxLength={160}
          placeholder="Vercel, office PC, vendor…"
          defaultValue={defaults?.hosting ?? ""}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-maintainer">
          Who maintains it
        </label>
        <input
          id="asset-maintainer"
          name="maintainer"
          required
          maxLength={120}
          defaultValue={defaults?.maintainer ?? ""}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="asset-status">
          Status
        </label>
        <input
          id="asset-status"
          name="status"
          required
          maxLength={40}
          placeholder="active, in development, paused…"
          defaultValue={defaults?.status ?? "active"}
          className={INPUT_CLASS}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={FIELD_LABEL} htmlFor="asset-notes">
          Notes (optional)
        </label>
        <textarea
          id="asset-notes"
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={defaults?.notes ?? ""}
          className="mt-0 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-2.5 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
        />
      </div>
    </div>
  );
}

function assetInputFromForm(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    name: text("name"),
    kind: text("kind"),
    repo: text("repo") || undefined,
    liveUrl: text("liveUrl") || undefined,
    hosting: text("hosting") || undefined,
    maintainer: text("maintainer"),
    status: text("status"),
    notes: text("notes") || undefined,
  };
}

export function AssetCard({
  asset,
  isAdmin,
}: {
  asset: AssetWithGrants;
  isAdmin: boolean;
}) {
  const { pending, error, run } = useMutationRunner();
  const [editing, setEditing] = useState(false);
  const [addingGrant, setAddingGrant] = useState(false);

  const facts: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Code repository",
      value: asset.repo || "—",
    },
    {
      label: "Live address",
      value: asset.live_url ? (
        <a
          href={asset.live_url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          {asset.live_url}
        </a>
      ) : (
        "—"
      ),
    },
    { label: "Where it runs", value: asset.hosting || "—" },
    { label: "Who maintains it", value: asset.maintainer || "—" },
  ];

  return (
    <article
      data-testid="registry-asset"
      data-asset-name={asset.name}
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
            {asset.name}
          </h2>
          <span className="rounded-full bg-[var(--color-mint)] px-2.5 py-1 text-[0.75rem] font-bold text-[var(--color-teal-ink)]">
            {asset.kind}
          </span>
          <span
            data-testid="asset-status"
            className={`rounded-full px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.05em] ${statusChipClass(asset.status)}`}
          >
            {asset.status}
          </span>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              data-action="edit-asset"
              disabled={pending}
              onClick={() => setEditing((current) => !current)}
              className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-navy)]"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            {asset.status !== "archived" && (
              <button
                type="button"
                data-action="archive-asset"
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Archive ${asset.name}? It stays in the ledger marked archived.`,
                    )
                  ) {
                    run(() => archiveRegistryAsset({ id: asset.id }));
                  }
                }}
                className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)]"
              >
                Archive
              </button>
            )}
          </div>
        )}
      </div>

      <ErrorNote error={error} />

      {editing && isAdmin ? (
        <form
          className="mt-5 border-t border-[var(--color-line)] pt-5"
          action={(formData) =>
            run(
              () =>
                updateRegistryAsset({
                  id: asset.id,
                  ...assetInputFromForm(formData),
                }),
              () => setEditing(false),
            )
          }
        >
          <AssetFields defaults={asset} />
          <button
            type="submit"
            disabled={pending}
            className="btn btn-navy mt-4 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : (
        <>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                  {fact.label}
                </dt>
                <dd className="mt-0.5 text-[0.95rem] text-[var(--color-ink)]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          {asset.notes && (
            <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--color-body)]">
              {asset.notes}
            </p>
          )}
        </>
      )}

      <div className="mt-5 border-t border-[var(--color-line)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[0.9rem] font-black text-[var(--color-ink)]">
            Who has access
          </h3>
          {isAdmin && (
            <button
              type="button"
              data-action="toggle-grant-form"
              disabled={pending}
              onClick={() => setAddingGrant((current) => !current)}
              className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] px-3.5 text-[0.85rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-navy)]"
            >
              {addingGrant ? "Cancel" : "Add access"}
            </button>
          )}
        </div>

        {asset.grants.length === 0 && !addingGrant ? (
          <p className="mt-3 text-[0.9rem] text-[var(--color-muted)]">
            No access recorded yet.
          </p>
        ) : (
          <ul data-testid="grant-list" className="mt-3 space-y-2">
            {asset.grants.map((grant) => (
              <li
                key={grant.id}
                data-grant-person={grant.person}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] bg-[var(--color-paper)] px-4 py-2.5"
              >
                <span className="text-[0.9rem] text-[var(--color-ink)]">
                  <span className="font-bold">{grant.person}</span>
                  <span className="text-[var(--color-muted)]">
                    {" "}
                    — {grant.role} · via {grant.granted_via}
                  </span>
                </span>
                {grant.active ? (
                  isAdmin ? (
                    <button
                      type="button"
                      data-action="deactivate-grant"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Mark ${grant.person}'s access as ended? The history stays in the ledger.`,
                          )
                        ) {
                          run(() => deactivateRegistryGrant({ id: grant.id }));
                        }
                      }}
                      className="flex min-h-9 items-center rounded-full border border-[var(--color-line-2)] px-3 text-[0.8rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-amber-deep)]"
                    >
                      End access
                    </button>
                  ) : (
                    <span className="rounded-full bg-[var(--color-mint)] px-3 py-1 text-[0.75rem] font-bold text-[var(--color-teal-ink)]">
                      Active
                    </span>
                  )
                ) : (
                  <span className="rounded-full bg-[var(--color-line)] px-3 py-1 text-[0.75rem] font-bold text-[var(--color-muted)]">
                    Ended
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {addingGrant && isAdmin && (
          <form
            className="mt-4"
            action={(formData) => {
              const text = (name: string) =>
                String(formData.get(name) ?? "").trim();
              run(
                () =>
                  addRegistryGrant({
                    assetId: asset.id,
                    person: text("person"),
                    role: text("role"),
                    grantedVia: text("grantedVia"),
                  }),
                () => setAddingGrant(false),
              );
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <label className="sr-only" htmlFor={`grant-person-${asset.id}`}>
                  Person
                </label>
                <input
                  id={`grant-person-${asset.id}`}
                  name="person"
                  required
                  maxLength={120}
                  placeholder="Person"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor={`grant-role-${asset.id}`}>
                  Role
                </label>
                <input
                  id={`grant-role-${asset.id}`}
                  name="role"
                  required
                  maxLength={80}
                  placeholder="Role (owner, admin…)"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor={`grant-via-${asset.id}`}>
                  Granted via
                </label>
                <input
                  id={`grant-via-${asset.id}`}
                  name="grantedVia"
                  required
                  maxLength={120}
                  placeholder="Via (GitHub, Vercel, portal…)"
                  className={INPUT_CLASS}
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="btn btn-navy min-h-11 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}

export function NewAssetForm() {
  const { pending, error, run } = useMutationRunner();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-6">
        <button
          type="button"
          data-action="open-new-asset"
          onClick={() => setOpen(true)}
          className="btn btn-navy"
        >
          Add an asset
        </button>
      </div>
    );
  }

  return (
    <form
      data-testid="new-asset-form"
      className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7"
      action={(formData) =>
        run(
          () => createRegistryAsset(assetInputFromForm(formData)),
          () => setOpen(false),
        )
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
          Add an asset
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex min-h-10 items-center rounded-[var(--radius-sm)] px-3.5 text-[0.85rem] font-bold text-[var(--color-muted)]"
        >
          Cancel
        </button>
      </div>
      <ErrorNote error={error} />
      <div className="mt-4">
        <AssetFields />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-navy mt-4 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add to the ledger"}
      </button>
    </form>
  );
}
