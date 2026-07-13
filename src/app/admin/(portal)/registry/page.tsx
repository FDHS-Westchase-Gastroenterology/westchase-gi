import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { PORTAL_INTEGRATIONS } from "@/lib/portal/integrations";
import {
  AssetCard,
  NewAssetForm,
  type AssetWithGrants,
} from "./asset-manager";

export default async function AdminRegistryPage() {
  const session = await requireRole("staff");
  const isAdmin = session.role === "admin";

  const db = serviceClient();
  const [assetsResult, grantsResult] = await Promise.all([
    db
      .from("registry_assets")
      .select("id, name, kind, repo, live_url, hosting, maintainer, status, notes")
      .order("created_at", { ascending: true }),
    db
      .from("registry_grants")
      .select("id, asset_id, person, role, granted_via, active")
      .order("created_at", { ascending: true }),
  ]);
  if (assetsResult.error) {
    throw new Error(`Registry read failed: ${assetsResult.error.code}`);
  }
  if (grantsResult.error) {
    throw new Error(`Grants read failed: ${grantsResult.error.code}`);
  }

  const grants = grantsResult.data ?? [];
  const assets: AssetWithGrants[] = (assetsResult.data ?? []).map((asset) => ({
    ...asset,
    grants: grants.filter((grant) => grant.asset_id === asset.id),
  }));

  return (
    <section aria-labelledby="registry-heading">
      <h1
        id="registry-heading"
        className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
      >
        Software &amp; access registry
      </h1>
      <p className="mt-1.5 max-w-[65ch] text-[0.95rem] text-[var(--color-muted)]">
        Your software, and who can touch it. This ledger is the practice&apos;s
        own record of every digital asset it runs — so the knowledge survives
        staff turnover, vendor changes, and time.
      </p>

      <div className="mt-8 space-y-5">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} isAdmin={isAdmin} />
        ))}
      </div>

      {isAdmin && <NewAssetForm />}

      <section aria-labelledby="integrations-heading" className="mt-12">
        <h2
          id="integrations-heading"
          className="text-[1.2rem] font-black leading-tight text-[var(--color-ink)]"
        >
          Connections
        </h2>
        <p className="mt-1.5 max-w-[65ch] text-[0.9rem] text-[var(--color-muted)]">
          Where the website&apos;s code lives and runs. These connections
          activate after the practice takes ownership of its accounts —
          nothing here talks to any outside service today.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {PORTAL_INTEGRATIONS.map((provider) => {
            const status = provider.status();
            return (
              <div
                key={provider.id}
                data-testid={`integration-${provider.id}`}
                className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[1rem] font-black text-[var(--color-ink)]">
                    {provider.name}
                  </h3>
                  <span
                    data-testid="integration-status"
                    className="rounded-full bg-[var(--color-line)] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[var(--color-muted)]"
                  >
                    {status.connected
                      ? `Connected — ${status.account}`
                      : "Not connected — activates after ownership transfer"}
                  </span>
                </div>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[var(--color-body)]">
                  {provider.summary}
                </p>
                <h4 className="mt-4 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                  Once connected, it will manage
                </h4>
                <ul className="mt-2 space-y-1.5 text-[0.9rem] leading-relaxed text-[var(--color-body)]">
                  {provider.willManage.map((item) => (
                    <li key={item} className="flex gap-x-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 text-[var(--color-teal-ink)]"
                      >
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
