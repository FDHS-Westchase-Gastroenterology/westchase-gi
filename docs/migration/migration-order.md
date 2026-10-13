# Migration order and file dates

Companion to [`inventory.md`](inventory.md). Covers the second half of INIT-1 step 1: the
`supabase/migrations/` files must build a clean database from scratch, in the right order, and
keep working on the existing Supabase setup until the switch-over.

## Result

The current files already build a clean database in the right order. The thirteen
future-dated names are cosmetic: they sort in the same order the files were written, and no
other migration sorts between them. Renaming them is optional, and it has a cost on the live
Preview database. That choice is Jason's ([Decision](#decision-for-jason)).

## Proof: a fresh build from nothing

Run on 2026-10-13 against the tree at `cc46e59a` (PR #224 head).

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

## Which names are wrong

None of these files are on `main`, so Production has never seen them; Production gets
migrations only by the separate promotion in CONTRIBUTING.md "Shipping to production". (On
2026-10-13 Production's ledger held 20 versions, ending at `20260729172311`; see
[inventory.md](inventory.md#production-is-20-migrations-behind).) Times
are UTC. The commits are squash merges, so the commit time is the latest a file can have been
written, not its authoring time.

| File | First committed | Off by |
| --- | --- | --- |
| `20261003120000_scheduling_settings` | 2026-10-03 07:53 | +4 h |
| `20261004120000_patient_search` | 2026-10-03 11:47 | +1 day |
| `20261005120000_activity_log` | 2026-10-03 15:51 | +2 days |
| `20261006120000_day_appointment_actions` | 2026-10-03 17:37 | +3 days |
| `20261007120000_provider_day_hours` | 2026-10-03 19:17 | +4 days |
| `20261008120000_staff_tours` | 2026-10-03 23:20 | +4.5 days |
| `20261008120100_drop_portal_tour_dismissed_at` | 2026-10-03 23:20 | +4.5 days |
| `20261008120200_close_request_from_booked` | 2026-10-03 23:20 | +4.5 days |
| `20261009120000_booking_interval` | 2026-10-04 17:18 | +4.5 days |
| `20261009120100_booked_visits_hold_interval` | 2026-10-04 17:18 | +4.5 days |
| `20261010120000_portal_reads_match_screens` | 2026-10-04 19:19 | +5.5 days |
| `20261011120000_openings_on_the_clock` | 2026-10-04 21:44 | +6.5 days |
| `20261012120000_settings_follow_the_clinic` | 2026-10-04 22:55 | +7.5 days |

Every one of them was dated in the future when committed. Today is 2026-10-13, so none is
still in the future and any new migration sorts after all of them.

Two smaller slips, both harmless:

- `20260806120000` was committed at 05:23 on Aug 6, about seven hours before its stamp.
- `20260716090000` was committed at 14:33 on Jul 16, after `20260716132839` (13:49) although it
  sorts first. The fresh build proves the order works.

The early-October files around the tail are honest: `20260930230000` (committed Oct 1 15:01),
`20261001160000` (Oct 1 17:30) and `20261002120000` (Oct 3 02:08) all carry stamps earlier
than their commits.

## What a rename would touch

The version is the key in two places outside the filename:

- **The Preview database's ledger.** `supabase_migrations.schema_migrations` on
  `gqzwcvwyhykscuidcmlh` holds the 13 old versions. Supabase Branching treats a renamed file as
  a new, unapplied migration and runs it again on the next push. Several are not re-runnable:
  `20261008120000_staff_tours` creates a table without `if not exists`,
  `20261008120100_drop_portal_tour_dismissed_at` drops a column that is already gone, and
  `20261009120000_booking_interval` creates a table and inserts its one row. The push fails
  and the branch database stops following the PR, so the ledger rows have to change in the
  same window as the merge.
- **`supabase/rollbacks/`.** 13 rollback files carry the old versions in their names
  (`<from>_to_<to>.sql`), from `20261003120000_to_20261002120000.sql` to
  `20261012120000_to_20261011120000.sql`. None of them touch the ledger in their SQL, so a
  rename is a file move.

CI's lineage check fails on PR #224 and on every open child PR from the moment the files are
renamed until the ledger is reconciled, and again on any child branch that has not merged
the rename.

Nothing else in the repository names these versions: no script, test, workflow or document.
Production is untouched either way.

## Decision for Jason

**(a) Keep the names.** The order is proven correct, nothing breaks, and the dates are wrong only
in the sense of being a week early. Record it and move on.

**(b) Rename to the commit times.** The filenames then tell the truth, at the cost of one
coordinated window on the shared Preview database: freeze pushes to PR #224 and its children,
merge the rename, run the ledger update below, and re-run `supabase-integration`.

The rename map keeps today's order:

| Old version | New version |
| --- | --- |
| `20261003120000` | `20261003075330` |
| `20261004120000` | `20261003114734` |
| `20261005120000` | `20261003155157` |
| `20261006120000` | `20261003173733` |
| `20261007120000` | `20261003191741` |
| `20261008120000` | `20261003232044` |
| `20261008120100` | `20261003232045` |
| `20261008120200` | `20261003232046` |
| `20261009120000` | `20261004171806` |
| `20261009120100` | `20261004171807` |
| `20261010120000` | `20261004191946` |
| `20261011120000` | `20261004214429` |
| `20261012120000` | `20261004225532` |

The ledger update for (b), not yet run anywhere. Run it on the Preview database only, in the
coordination window, with the `wgi-supabase-branching` skill loaded:

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
-- Expect exactly 13 rows; roll back on anything else.
select count(*) from supabase_migrations.schema_migrations where version like '202610%';
commit;
```

The rollback files are renamed with the same map, both sides of `_to_`.

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
