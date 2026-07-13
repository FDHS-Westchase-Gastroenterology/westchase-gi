import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { formatReceived } from "../requests/format";

type AuditRow = {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  at: string;
};

const PAGE_SIZE = 100;

export default async function AdminAuditPage() {
  await requireRole("staff");

  const db = serviceClient();
  const [{ data: rows, error }, { count, error: countError }] =
    await Promise.all([
      db
        .from("audit_log")
        .select("id, actor_email, action, entity, entity_id, at")
        .order("at", { ascending: false })
        .limit(PAGE_SIZE),
      db.from("audit_log").select("id", { count: "exact", head: true }),
    ]);
  if (error || countError) {
    throw new Error(`Audit read failed: ${(error ?? countError)?.code}`);
  }

  const entries = (rows ?? []) as AuditRow[];
  const total = count ?? entries.length;

  return (
    <section aria-labelledby="audit-heading">
      <h1
        id="audit-heading"
        className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
      >
        Audit log
      </h1>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
        Every change made through the portal — who did it, what it touched,
        and when.
        {total > PAGE_SIZE
          ? ` Showing the latest ${PAGE_SIZE} of ${total} entries.`
          : ""}
      </p>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-8 text-center sm:p-12">
          <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
            Nothing recorded yet
          </h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[0.95rem] text-[var(--color-body)]">
            The first status change, note, recipient edit, or staff change
            will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white">
          <table data-testid="audit-table" className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[0.8rem] uppercase tracking-[0.06em] text-[var(--color-muted)]">
                <th scope="col" className="px-5 py-3.5 font-bold">
                  When
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Who
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Action
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Entity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {entries.map((entry) => (
                <tr key={entry.id} className="text-[0.9rem]">
                  <td className="whitespace-nowrap px-5 py-3 text-[var(--color-muted)]">
                    {formatReceived(entry.at, true)}
                  </td>
                  <td className="px-5 py-3 font-bold text-[var(--color-ink)]">
                    {entry.actor_email}
                  </td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-[var(--color-mint)] px-2 py-0.5 text-[0.85rem] text-[var(--color-teal-ink)]">
                      {entry.action}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-body)]">
                    {entry.entity}
                    {entry.entity_id ? (
                      <span className="ml-1.5 text-[0.8rem] text-[var(--color-muted)]">
                        {entry.entity_id.slice(0, 8)}…
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
