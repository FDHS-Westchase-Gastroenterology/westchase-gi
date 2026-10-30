# Migration order and file dates

Companion to [`inventory.md`](inventory.md). Covers the second half of INIT-1 step 1: the
`supabase/migrations/` files must build a clean database from scratch, in the right order, and
keep working on the existing Supabase setup until the switch-over.

## Result

The 55 files build a clean database in the right order, and the 13 future-dated files now carry
their commit times. The rename kept the order, and the ledgers of the Supabase Preview databases
were updated in the same change, so the existing Supabase setup keeps working until the
switch-over.

## Proof: a fresh build from nothing

Run on 2026-10-13 against PR #224's head `cc46e59a`, and again after the rename.

1. Start an empty PostgreSQL 17.11 (Homebrew), the same major version as
   `supabase/config.toml` (`major_version = 17`).
2. Apply [`supabase-platform-shim.sql`](supabase-platform-shim.sql). It is the minimum Supabase
   provides before migrations run: the `anon`, `authenticated`, `service_role` and
   `authenticator` roles; an `extensions` schema with `pgcrypto` and `uuid-ossp`; an `auth`
   schema with `auth.users`, `auth.jwt()`, `auth.uid()` and `auth.role()`; and default
   privileges on `public`.
3. Apply all 55 files in `supabase/migrations/` in filename order, each in its own transaction
   (`psql --single-transaction -v ON_ERROR_STOP=1`), the way the Supabase CLI does.
4. Apply `supabase/seed.sql`.

Every file and the seed applied without error. The result matches the PR #224 Preview
database (`gqzwcvwyhykscuidcmlh`): 35 tables and 84 functions in `public` on both.

A schema-only `pg_dump` of `public` from both databases differs by 47 lines, none of them
from the migrations:

- the server version header (Supabase 17.6, local 17.11);
- `GRANT USAGE ON SCHEMA public TO postgres`;
- `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` and `FOR ROLE supabase_admin` grants to
  `postgres`, `anon`, `authenticated` and `service_role`, which the Supabase platform sets on
  every project.

The Preview database's ledger (`supabase_migrations.schema_migrations`) holds exactly the 55
versions in the filenames, so CI's lineage check (`scripts/verify-migration-lineage.mjs`)
agrees with the tree.

## The renamed files

None of these files are on `main`, so Production has never seen them; Production gets
migrations only by the separate promotion in CONTRIBUTING.md "Shipping to production". (On
2026-10-13 Production's ledger held 20 versions, ending at `20260729172311`; see
[inventory.md](inventory.md#production-is-20-migrations-behind).) Times are UTC. The commits are
squash merges, so the commit time is the latest a file can have been written; it is the new
version.

| Old version | New version | File |
| --- | --- | --- |
| `20261003120000` | `20261003075330` | `scheduling_settings` |
| `20261004120000` | `20261003114734` | `patient_search` |
| `20261005120000` | `20261003155157` | `activity_log` |
| `20261006120000` | `20261003173733` | `day_appointment_actions` |
| `20261007120000` | `20261003191741` | `provider_day_hours` |
| `20261008120000` | `20261003232044` | `staff_tours` |
| `20261008120100` | `20261003232045` | `drop_portal_tour_dismissed_at` |
| `20261008120200` | `20261003232046` | `close_request_from_booked` |
| `20261009120000` | `20261004171806` | `booking_interval` |
| `20261009120100` | `20261004171807` | `booked_visits_hold_interval` |
| `20261010120000` | `20261004191946` | `portal_reads_match_screens` |
| `20261011120000` | `20261004214429` | `openings_on_the_clock` |
| `20261012120000` | `20261004225532` | `settings_follow_the_clinic` |

Files committed together keep one-second steps so their order is unchanged. Every old stamp was
in the future when committed, by 4 hours to 7.5 days.

Left as they are, because they sort correctly and no file sorts between them and their commit:

- `20260806120000` was committed at 05:23 on Aug 6, about seven hours before its stamp.
- `20260716090000` was committed at 14:33 on Jul 16, after `20260716132839` (13:49) although it
  sorts first. It is on Production, and the fresh build proves the order works.
- `20260930230000`, `20261001160000` and `20261002120000` carry stamps earlier than their
  commits.

## What the rename touched

- **`supabase/migrations/`**: the 13 files, plus two header comments that name a sibling by
  version.
- **`supabase/rollbacks/`**: the 13 `<from>_to_<to>.sql` files, renamed on both sides of `_to_`,
  and their header comments. No rollback writes the ledger.
- **The Preview ledgers.** Supabase Branching treats a renamed file as a new, unapplied
  migration and runs it again. Several cannot run twice: `staff_tours` creates a table without
  `if not exists`, `drop_portal_tour_dismissed_at` drops a column that is already gone, and
  `booking_interval` creates a table and inserts its one row. So
  `supabase_migrations.schema_migrations` was updated in place on PR #224's Preview database
  (`gqzwcvwyhykscuidcmlh`) and on PR #402's own branch database, in the same window as the
  push. CI's lineage check (`scripts/verify-migration-lineage.mjs`) compares that table with
  the filenames.

```sql
begin;
update supabase_migrations.schema_migrations as m
set version = r.new_version
from (values
  ('20261003120000', '20261003075330'),
  ('20261004120000', '20261003114734'),
  ('20261005120000', '20261003155157'),
  ('20261006120000', '20261003173733'),
  ('20261007120000', '20261003191741'),
  ('20261008120000', '20261003232044'),
  ('20261008120100', '20261003232045'),
  ('20261008120200', '20261003232046'),
  ('20261009120000', '20261004171806'),
  ('20261009120100', '20261004171807'),
  ('20261010120000', '20261004191946'),
  ('20261011120000', '20261004214429'),
  ('20261012120000', '20261004225532')
) as r(old_version, new_version)
where m.version = r.old_version;
-- Exactly 13 rows; anything else rolls back.
commit;
```

A branch cut from PR #224 before the rename still carries the old names. Merge PR #224 into it
before its next push, or its lineage check fails and Supabase re-runs the files.

Production is untouched: none of these versions is in its ledger.

## Rerunning the proof

The proof needs no Supabase or AWS access. With Homebrew `postgresql@17` installed:

```bash
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
D=$(mktemp -d); initdb -D "$D/data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$D/data" -o "-p 54401 -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -w start
P() { psql -h 127.0.0.1 -p 54401 -U postgres -X -q -v ON_ERROR_STOP=1 "$@"; }
P -c "create database wgi_fresh"
P -d wgi_fresh -f docs/migration/supabase-platform-shim.sql
for f in supabase/migrations/*.sql; do P -d wgi_fresh --single-transaction -f "$f" || break; done
P -d wgi_fresh --single-transaction -f supabase/seed.sql
pg_ctl -D "$D/data" stop
```

`LC_ALL` matters on macOS: without it the postmaster refuses to start ("postmaster became
multithreaded"). The TCP-only socket setting avoids the 103-byte Unix socket path limit under
long temporary directories.
