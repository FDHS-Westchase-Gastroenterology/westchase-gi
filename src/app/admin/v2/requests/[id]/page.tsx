"use client";

// One request, one sheet: who they are, what the sheet wants next, the
// verbs, and the ledger of everything that ever happened — append-only,
// corrections struck through, never erased.

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { practiceToday, receivedLabel } from "../../prototype/format";
import { entryLine } from "../../prototype/lines";
import {
  LOCALE_FORM_LABELS,
  LOCATION_LABELS,
  TIME_LABELS,
} from "../../prototype/types";
import { useQueue, useStoreApi } from "../../prototype/store";
import { ActionDesk } from "./action-desk";

export default function RequestPage() {
  return (
    <Suspense fallback={null}>
      <RequestSheet />
    </Suspense>
  );
}

function RequestSheet() {
  const { id } = useParams<{ id: string }>();
  const from = useSearchParams().get("from");
  const { requests } = useQueue();
  const store = useStoreApi();
  const today = practiceToday(new Date());

  const request = requests.find((candidate) => candidate.id === id) ?? null;

  const back =
    from === "all"
      ? { href: "/admin/v2/requests", label: "All appointments" }
      : { href: "/admin/v2", label: "Today’s sheet" };

  if (!request) {
    return (
      <>
        <Link
          href={back.href}
          className="inline-flex min-h-11 items-center text-[0.92rem] font-bold text-[var(--ds-pen)] underline underline-offset-2"
        >
          ← {back.label}
        </Link>
        <div className="ds-sheet mt-4 px-6 py-10 text-center">
          <p className="text-[1.02rem] font-bold text-[var(--ds-ink)]">
            This request isn’t in the demo queue.
          </p>
          <p className="mt-1.5 text-[0.92rem] text-[var(--ds-faint)]">
            It may have been cleared by a demo reset.
          </p>
        </div>
      </>
    );
  }

  const entries = [...request.entries].reverse();

  return (
    <>
      <Link
        href={back.href}
        className="inline-flex min-h-11 items-center text-[0.92rem] font-bold text-[var(--ds-pen)] underline underline-offset-2"
      >
        ← {back.label}
      </Link>

      <div className="ds-sheet mt-4 px-4 py-6 sm:px-7 sm:py-7">
        {/* Who this is. The phone number is the job — it dials. */}
        <header className="border-b-2 border-[var(--ds-rule-strong)] pb-5">
          <h1 className="text-[1.5rem] font-bold tracking-tight text-[var(--ds-ink)]">
            {request.name}
          </h1>
          <p className="mt-1">
            <a
              href={`tel:${request.phone.replace(/[^+\d]/g, "")}`}
              className="ds-nums inline-flex min-h-11 items-center text-[1.25rem] font-bold text-[var(--ds-pen)] underline underline-offset-4"
            >
              {request.phone}
            </a>
          </p>
          <p className="text-[0.92rem] text-[var(--ds-faint)]">
            {request.email ?? "No email given"}
          </p>
          <p className="mt-3 text-[0.92rem] text-[var(--ds-body)]">
            Asked for{" "}
            {request.location === "any"
              ? "either office"
              : LOCATION_LABELS[request.location]}
            , {TIME_LABELS[request.preferredTime].toLowerCase()} · sent{" "}
            {LOCALE_FORM_LABELS[request.locale] ?? "the website form"} ·{" "}
            <span className="ds-nums">{receivedLabel(request.receivedAt)}</span>
          </p>
          {request.reason ? (
            <blockquote className="mt-3 max-w-[62ch] border-l-2 border-[var(--ds-rule-2)] pl-3 text-[0.95rem] italic leading-relaxed text-[var(--ds-body)]">
              “{request.reason}”
            </blockquote>
          ) : null}
        </header>

        <ActionDesk request={request} />

        {/* The ledger: every fact, newest first, corrections struck. */}
        <section aria-labelledby="history-head" className="mt-8">
          <h2 id="history-head" className="ds-head">
            Request history
          </h2>
          <ol className="ds-rows list-none">
            {entries.map((entry) => {
              const isNote = entry.body.t === "note";
              const faint =
                entry.body.t === "notification" || entry.body.t === "migrated";
              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-1 gap-x-4 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)]"
                >
                  <span className="ds-nums text-[0.82rem] leading-6 text-[var(--ds-faint)]">
                    {receivedLabel(entry.at)}
                  </span>
                  <span
                    className={`text-[0.92rem] leading-6 ${
                      entry.struck
                        ? "ds-struck"
                        : faint
                          ? "text-[var(--ds-faint)]"
                          : "text-[var(--ds-body)]"
                    }`}
                  >
                    {isNote ? (
                      <span className="italic">“{entryLine(entry, today)}”</span>
                    ) : (
                      entryLine(entry, today)
                    )}
                    {entry.actor ? (
                      <span className="text-[var(--ds-faint)]"> — {entry.actor}</span>
                    ) : null}
                    {entry.struck ? (
                      <span className="sr-only"> (corrected by an undo)</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* Prototype-only: stage the two-desks moment. */}
      <section
        aria-labelledby="proto-head"
        className="mt-6 rounded-[var(--ds-radius)] border border-dashed border-[var(--ds-rule-2)] px-4 py-3"
      >
        <h2
          id="proto-head"
          className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[var(--ds-faint)]"
        >
          Prototype controls
        </h2>
        <p className="mt-1 max-w-[64ch] text-[0.88rem] text-[var(--ds-body)]">
          To see the conflict guard: open a verb above, then have Maria G. act
          from her desk before you save.
        </p>
        <button
          type="button"
          onClick={() => store.simulateColleague(request.id)}
          className="ds-btn ds-btn-quiet mt-2 !min-h-9 px-3 text-[0.85rem]"
          disabled={request.snapshot.legacyReviewRequired}
        >
          Maria G. acts on this request
        </button>
      </section>
    </>
  );
}
