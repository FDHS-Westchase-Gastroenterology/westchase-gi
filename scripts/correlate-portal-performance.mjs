/** Only for a dedicated serial local run, with no other clients using its server. */
import { readFileSync, writeFileSync } from "node:fs";

const [sampleFile, logFile] = process.argv.slice(2);
if (!sampleFile || !logFile)
  throw new Error(
    "Usage: node scripts/correlate-portal-performance.mjs api-samples.json runtime.log",
  );
const samples = JSON.parse(readFileSync(sampleFile, "utf8"));
if (!samples.metadata.completed) throw new Error("Only correlate a complete API benchmark");
const rows = readFileSync(logFile, "utf8")
  .split("\n")
  .filter((line) => line.startsWith('{"event":"portal.performance"'))
  .map((line) => JSON.parse(line));
const end = rows.findLastIndex(
  (row) => row.operation === "clinical.operation" && row.detail === "set_signer",
);
const matched = rows.slice(end - samples.observations.length + 1, end + 1);
if (matched.length !== samples.observations.length) throw new Error("Timing count mismatch");
for (let i = 0; i < matched.length; i += 1) {
  const sample = samples.observations[i];
  const row = matched[i];
  const [domain, kind] = sample.operation.split(".");
  let operation = sample.operation;
  let detail = null;
  if (
    domain === "patients" &&
    [
      "create",
      "update",
      "archive",
      "restore",
      "retire_fixture",
      "link_request",
      "unlink_request",
    ].includes(kind)
  ) {
    operation = "patients.command";
    detail = ["archive", "restore", "retire_fixture"].includes(kind) ? "set_archived" : kind;
  } else if (["scheduling", "billing", "clinical"].includes(domain)) {
    operation = `${domain}.operation`;
    detail = kind === "retire_booking" ? "cancel" : kind;
  }
  if (row.operation !== operation || row.detail !== detail)
    throw new Error(`Timing label mismatch at observation ${i}`);
  for (const field of ["duration_ms", "upstream_headers_ms", "upstream_calls"]) {
    if (!Number.isFinite(row[field]) || row[field] < 0) throw new Error("Invalid backend timing");
  }
  sample.backend_ms = row.duration_ms;
  sample.upstream_headers_ms = row.upstream_headers_ms;
  sample.upstream_calls = row.upstream_calls;
}
samples.metadata.backendCorrelation =
  "Serial dedicated server log sequence; every operation/detail label matched, including setup and retirement";
writeFileSync(sampleFile, JSON.stringify(samples, null, 2) + "\n");
console.log(JSON.stringify({ matched: matched.length }));
