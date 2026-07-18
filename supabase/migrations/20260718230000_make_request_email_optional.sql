-- Email becomes optional on patient appointment requests: many patients 65+
-- have no email address, and phone (still required) is what the scheduling
-- coordinator actually uses to call back. Written idempotently so applying
-- the same SQL directly to an environment ahead of `db push` stays safe.

alter table public.requests
  drop constraint if exists requests_email_not_blank;

alter table public.requests
  alter column email drop not null;
