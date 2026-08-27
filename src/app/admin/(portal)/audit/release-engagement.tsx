import { formatReceived } from "@/app/admin/(portal)/requests/format";
import type {
  PortalReleaseEngagementResult,
  PortalReleaseEngagementRow,
} from "@/lib/portal/release-engagement";

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function SummaryValue({ row }: Readonly<{ row: PortalReleaseEngagementRow }>) {
  return (
    <>
      <strong className="block text-[var(--color-ink)]">{countLabel(row.viewCount, "view")}</strong>
      <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
        Last {formatReceived(row.lastViewedAt, true)}
      </span>
    </>
  );
}

function GuideValue({ row }: Readonly<{ row: PortalReleaseEngagementRow }>) {
  if (row.guideOpenCount === 0 || row.lastGuideOpenedAt === null) {
    return <span className="text-[var(--color-muted-ink)]">Not opened</span>;
  }
  return (
    <>
      <strong className="block text-[var(--color-ink)]">
        {countLabel(row.guideOpenCount, "open")}
      </strong>
      <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
        Last {formatReceived(row.lastGuideOpenedAt, true)}
      </span>
    </>
  );
}

function DismissalValue({ row }: Readonly<{ row: PortalReleaseEngagementRow }>) {
  if (row.dismissCount === 0 || row.lastDismissedAt === null) {
    return <span className="text-[var(--color-muted-ink)]">None</span>;
  }
  return (
    <>
      <strong className="block text-[var(--color-ink)]">{row.dismissCount}</strong>
      <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
        Last {formatReceived(row.lastDismissedAt, true)}
      </span>
    </>
  );
}

function ResponseValue({ row }: Readonly<{ row: PortalReleaseEngagementRow }>) {
  if (row.hiddenAt !== null && row.hiddenAt !== "") {
    return (
      <>
        <strong className="block text-[var(--color-ink)]">Hidden early</strong>
        <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
          {formatReceived(row.hiddenAt, true)}
        </span>
      </>
    );
  }
  if (row.acknowledgedAt !== null && row.acknowledgedAt !== "") {
    return (
      <>
        <strong className="block text-[var(--color-ink)]">Got it</strong>
        <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
          {formatReceived(row.acknowledgedAt, true)}
        </span>
      </>
    );
  }
  if (row.dismissCount > 0 && row.lastDismissedAt !== null && row.lastDismissedAt !== "") {
    return (
      <>
        <strong className="block text-[var(--color-ink)]">Dismissed</strong>
        <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
          {formatReceived(row.lastDismissedAt, true)}
        </span>
      </>
    );
  }
  return <span className="text-[var(--color-muted-ink)]">No response yet</span>;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function ReleaseEngagementSection({
  engagement,
}: Readonly<{
  engagement: PortalReleaseEngagementResult;
}>) {
  return (
    <section
      aria-labelledby="release-engagement-heading"
      className="mt-10"
      data-testid="release-engagement"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <h2
            id="release-engagement-heading"
            className="text-[1.05rem] font-black text-[var(--color-ink)]"
          >
            Release update engagement
          </h2>
          <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted-ink)]">
            Who opened the August 6 update, selected the guide, or dismissed it. This records
            release interactions only—never patient information.
          </p>
        </div>
      </div>

      {engagement.status === "unavailable" ? (
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-5 py-4">
          <p className="font-black text-[var(--color-ink)]">Engagement is unavailable</p>
          <p className="mt-1 text-[0.88rem] leading-relaxed text-[var(--color-muted-ink)]">
            The portal could not verify the release activity right now. The technical activity
            record below is still available.
          </p>
        </div>
      ) : engagement.rows.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-5 py-4">
          <p className="font-black text-[var(--color-ink)]">No one has opened this update yet</p>
          <p className="mt-1 text-[0.88rem] text-[var(--color-muted-ink)]">
            Staff will appear here after they deliberately open the summary.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white">
          <table
            data-testid="release-engagement-table"
            className="hidden w-full text-left md:table"
          >
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[0.78rem] tracking-[0.055em] text-[var(--color-muted-ink)] uppercase">
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Staff member
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Summary
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Guide
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Dismissals
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Response
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {engagement.rows.map((row) => (
                <tr key={row.staffUserId} className="align-top text-[0.88rem]">
                  <td className="px-5 py-4">
                    <strong className="block text-[var(--color-ink)]">{row.displayName}</strong>
                    <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
                      {row.email}
                      {!row.active ? " · Inactive" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--color-body)]">
                    <SummaryValue row={row} />
                  </td>
                  <td className="px-5 py-4 text-[var(--color-body)]">
                    <GuideValue row={row} />
                  </td>
                  <td className="px-5 py-4 text-[var(--color-body)]">
                    <DismissalValue row={row} />
                  </td>
                  <td className="px-5 py-4 text-[var(--color-body)]">
                    <ResponseValue row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul
            data-testid="release-engagement-cards"
            className="divide-y divide-[var(--color-line)] md:hidden"
          >
            {engagement.rows.map((row) => (
              <li key={row.staffUserId} className="px-5 py-5">
                <strong className="block text-[0.95rem] text-[var(--color-ink)]">
                  {row.displayName}
                </strong>
                <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
                  {row.email}
                  {!row.active ? " · Inactive" : ""}
                </span>
                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 text-[0.88rem] text-[var(--color-body)]">
                  <div>
                    <dt className="mb-1.5 text-[0.72rem] font-bold tracking-[0.055em] text-[var(--color-muted-ink)] uppercase">
                      Summary
                    </dt>
                    <dd>
                      <SummaryValue row={row} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1.5 text-[0.72rem] font-bold tracking-[0.055em] text-[var(--color-muted-ink)] uppercase">
                      Guide
                    </dt>
                    <dd>
                      <GuideValue row={row} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1.5 text-[0.72rem] font-bold tracking-[0.055em] text-[var(--color-muted-ink)] uppercase">
                      Dismissals
                    </dt>
                    <dd>
                      <DismissalValue row={row} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1.5 text-[0.72rem] font-bold tracking-[0.055em] text-[var(--color-muted-ink)] uppercase">
                      Response
                    </dt>
                    <dd>
                      <ResponseValue row={row} />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
