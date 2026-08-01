# Storage keeps the name closure_disposition

The domain term for how a closed appointment request ended was renamed from "closure
disposition" to "closure outcome" (plainer language, 2026-08-01), but the database layer
deliberately keeps `closure_disposition`: the `requests` column, RPC parameters
(`p_disposition`), the `requests_closure_disposition_valid` constraint, and the JSON keys
inside historical `request_events` snapshots that the Undo RPC validates. Migrations are
forward-only and audit history is never rewritten, so renaming storage would mean new
migrations plus rewriting recorded evidence — for a term staff never see. Code and tests
therefore use the storage name at the database boundary (column references, PostgREST
select strings, parsed audit-JSON keys) and "closure outcome" everywhere above it.
