import { formatReceived } from "@/app/admin/(portal)/requests/format";
import { displayNameOrEmail } from "@/lib/portal/staff-identity";
import type { HistoryEntry } from "@/lib/portal/workflow/contracts";

import { historyLine } from "./request-history";
import type { HistoryLine } from "./request-history";
import type { RequestNoteView } from "./request-notes";

export function requestHistoryViews(
  history: readonly Readonly<HistoryEntry>[],
  nameMap: ReadonlyMap<string, string>,
) {
  // Notes and history come from one composed read. Notes keep their own
  // Surface; every other evidence kind renders in Request history.
  const noteViews: RequestNoteView[] = [];
  const historyLines: HistoryLine[] = [];
  for (const entry of history) {
    if (entry.kind === "note") {
      noteViews.push({
        id: entry.id,
        text: entry.text,
        byline: `${displayNameOrEmail(nameMap, entry.actor)} · ${formatReceived(entry.at, true)}`,
      });
      continue;
    }
    const line = historyLine(entry);
    if (line !== null) historyLines.push(line);
  }
  return { noteViews, historyLines };
}
