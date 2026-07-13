create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint requests_name_not_blank check (btrim(name) <> ''),
  phone text not null constraint requests_phone_not_blank check (btrim(phone) <> ''),
  email text not null constraint requests_email_not_blank check (btrim(email) <> ''),
  location text not null constraint requests_location_valid
    check (location in ('any', 'tampa', 'lutz')),
  preferred_time text not null constraint requests_preferred_time_valid
    check (preferred_time in ('any', 'morning', 'afternoon')),
  message text constraint requests_message_length
    check (message is null or char_length(message) <= 2000),
  locale text not null constraint requests_locale_valid
    check (locale in ('en', 'es', 'vi', 'ko', 'ar')),
  source_path text not null constraint requests_source_path_not_blank
    check (btrim(source_path) <> ''),
  status text not null default 'new' constraint requests_status_valid
    check (status in ('new', 'contacted', 'scheduled', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  type text not null constraint request_events_type_not_blank check (btrim(type) <> ''),
  recipient text,
  provider_message_id text,
  status text not null default 'recorded'
    constraint request_events_status_not_blank check (btrim(status) <> ''),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    constraint notification_recipients_email_not_blank check (btrim(email) <> ''),
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique
    constraint staff_profiles_email_not_blank check (btrim(email) <> ''),
  display_name text not null
    constraint staff_profiles_display_name_not_blank check (btrim(display_name) <> ''),
  role text not null constraint staff_profiles_role_valid
    check (role in ('admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registry_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    constraint registry_assets_name_not_blank check (btrim(name) <> ''),
  kind text not null constraint registry_assets_kind_not_blank check (btrim(kind) <> ''),
  repo text,
  live_url text,
  hosting text,
  maintainer text not null
    constraint registry_assets_maintainer_not_blank check (btrim(maintainer) <> ''),
  status text not null constraint registry_assets_status_not_blank check (btrim(status) <> ''),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registry_grants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.registry_assets(id) on delete cascade,
  person text not null constraint registry_grants_person_not_blank check (btrim(person) <> ''),
  role text not null constraint registry_grants_role_not_blank check (btrim(role) <> ''),
  granted_via text not null
    constraint registry_grants_granted_via_not_blank check (btrim(granted_via) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_grants_identity_unique unique (asset_id, person, role, granted_via)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null
    constraint audit_log_actor_email_not_blank check (btrim(actor_email) <> ''),
  action text not null constraint audit_log_action_not_blank check (btrim(action) <> ''),
  entity text not null constraint audit_log_entity_not_blank check (btrim(entity) <> ''),
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_created_at_idx on public.requests (created_at desc);
create index requests_open_status_idx
  on public.requests (status, created_at desc)
  where status <> 'closed';
create index request_events_request_id_idx
  on public.request_events (request_id, created_at);
create index notification_recipients_active_idx
  on public.notification_recipients (email)
  where active;
create index registry_grants_asset_id_idx
  on public.registry_grants (asset_id);
create index audit_log_at_idx on public.audit_log (at desc);

create trigger requests_set_updated_at
before update on public.requests
for each row execute function private.set_updated_at();

create trigger request_events_set_updated_at
before update on public.request_events
for each row execute function private.set_updated_at();

create trigger notification_recipients_set_updated_at
before update on public.notification_recipients
for each row execute function private.set_updated_at();

create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row execute function private.set_updated_at();

create trigger registry_assets_set_updated_at
before update on public.registry_assets
for each row execute function private.set_updated_at();

create trigger registry_grants_set_updated_at
before update on public.registry_grants
for each row execute function private.set_updated_at();

create trigger audit_log_set_updated_at
before update on public.audit_log
for each row execute function private.set_updated_at();

alter table public.requests enable row level security;
alter table public.request_events enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.registry_assets enable row level security;
alter table public.registry_grants enable row level security;
alter table public.audit_log enable row level security;

revoke all on table
  public.requests,
  public.request_events,
  public.notification_recipients,
  public.staff_profiles,
  public.registry_assets,
  public.registry_grants,
  public.audit_log
from public, anon, authenticated;

grant select on table
  public.requests,
  public.request_events,
  public.notification_recipients,
  public.staff_profiles,
  public.registry_assets,
  public.registry_grants,
  public.audit_log
to authenticated;

grant select, insert, update, delete on table
  public.requests,
  public.request_events,
  public.notification_recipients,
  public.staff_profiles,
  public.registry_assets,
  public.registry_grants,
  public.audit_log
to service_role;

create policy staff_profiles_self_read
on public.staff_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy staff_profiles_admin_read
on public.staff_profiles
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy requests_staff_read
on public.requests
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_profiles as sp
    where sp.user_id = (select auth.uid())
      and sp.active
  )
);

create policy request_events_staff_read
on public.request_events
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_profiles as sp
    where sp.user_id = (select auth.uid())
      and sp.active
  )
);

create policy notification_recipients_staff_read
on public.notification_recipients
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_profiles as sp
    where sp.user_id = (select auth.uid())
      and sp.active
  )
);

create policy audit_log_staff_read
on public.audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_profiles as sp
    where sp.user_id = (select auth.uid())
      and sp.active
  )
);

create policy registry_assets_portal_read
on public.registry_assets
for select
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff')
);

create policy registry_grants_portal_read
on public.registry_grants
for select
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'staff')
);

