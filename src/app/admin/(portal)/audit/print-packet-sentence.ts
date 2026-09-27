/* The Recent work sentence for one print packet's audit row
   (`requests.print_new`). Every packet writes `row_count`; a status packet
   writes its `status_filter`, and a packet of chosen requests writes a null
   filter and its `request_ids`. Rows written before packets named their
   requests read as they always have. */

import { STATUS_LABELS } from "@/app/admin/(portal)/requests/format";
import { asJsonNumber, asJsonString } from "@/lib/json";
import type { JsonObject } from "@/lib/json";
import { formatStatusList, parsePrintStatusSelection } from "@/lib/portal/print-selection";

function requestCount(count: number): string {
  return `${count} ${count === 1 ? "request" : "requests"}`;
}

export function printPacketSentence(detail: JsonObject): string {
  const count = asJsonNumber(detail.row_count);
  const filter = asJsonString(detail.status_filter);
  const requestIds = detail.request_ids;
  if (filter === null && Array.isArray(requestIds))
    return `prepared a print packet of ${requestCount(count ?? requestIds.length)}`;

  const countText = count === null ? "" : ` (${requestCount(count)})`;
  const selection = parsePrintStatusSelection(filter ?? undefined);
  if (
    selection === "default" ||
    (Array.isArray(selection) && selection.length === 1 && selection[0] === "new")
  )
    return `prepared the New-request print packet${countText}`;
  if (Array.isArray(selection))
    return `prepared a print packet of ${formatStatusList(selection, STATUS_LABELS)}${countText}`;
  return `prepared a request print packet${countText}`;
}
