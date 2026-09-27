import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Usage: node scripts/summarize-portal-performance.mjs input.json output.json");
const source = JSON.parse(readFileSync(input, "utf8"));
const groups = new Map();
for (const row of source.observations) {
  if (row.phase !== "measured") continue;
  if (!Number.isFinite(row.duration_ms) || row.duration_ms < 0) throw new Error("Invalid timing");
  const key = `${row.operation}:${row.ok ? "success" : "failure"}`;
  if (!groups.has(key))
    groups.set(key, {
      operation: row.operation,
      outcome: row.ok ? "success" : "failure",
      durations: [],
      backend: [],
      upstream: [],
      calls: [],
    });
  const group = groups.get(key);
  group.durations.push(row.duration_ms);
  if (Number.isFinite(row.backend_ms)) group.backend.push(row.backend_ms);
  if (Number.isFinite(row.upstream_headers_ms)) group.upstream.push(row.upstream_headers_ms);
  if (Number.isInteger(row.upstream_calls)) group.calls.push(row.upstream_calls);
}
const round = (n) => Math.round(n * 100) / 100;
const operations = [...groups.values()]
  .map(({ operation, outcome, durations, backend, upstream, calls }) => {
    durations.sort((a, b) => a - b);
    const n = durations.length;
    const diagnostic =
      backend.length === n && upstream.length === n && calls.length === n
        ? {
            backend_mean_ms: round(backend.reduce((a, b) => a + b, 0) / n),
            upstream_headers_mean_ms: round(upstream.reduce((a, b) => a + b, 0) / n),
            upstream_calls_min: Math.min(...calls),
            upstream_calls_max: Math.max(...calls),
          }
        : {};
    return {
      operation,
      outcome,
      samples: n,
      ...diagnostic,
      mean_ms: round(durations.reduce((a, b) => a + b, 0) / n),
      median_ms: round((durations[Math.floor((n - 1) / 2)] + durations[Math.floor(n / 2)]) / 2),
      p95_ms: durations[Math.ceil(n * 0.95) - 1],
      min_ms: durations[0],
      max_ms: durations.at(-1),
    };
  })
  .sort((a, b) => a.operation.localeCompare(b.operation));
writeFileSync(output, JSON.stringify({ metadata: source.metadata, operations }, null, 2) + "\n");
console.log(
  JSON.stringify({
    operations: operations.length,
    measuredSamples: operations.reduce((n, op) => n + op.samples, 0),
  }),
);
