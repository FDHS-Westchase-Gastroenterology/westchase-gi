-- What a Supabase project provides before the first migration runs.
--
-- The 55 files in supabase/migrations/ assume these roles, schemas, extensions and auth functions
-- already exist. On Supabase the platform creates them; on RDS (or any plain Postgres 17) this file
-- must run first. It is the minimum that let every migration and supabase/seed.sql apply on a
-- fresh Postgres 17.11 on 2026-10-13 (see docs/migration/migration-order.md). It is a stand-in
-- for a local proof, not the production design: on AWS the auth schema is replaced by Cognito
-- claims (INIT-1), and the roles become whatever the app's database users turn out to be.
--
-- Replace wgi_fresh with the target database name.

-- Minimal stand-in for what a Supabase project provides before any repo migration runs.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create schema extensions;
create extension pgcrypto with schema extensions;
create extension "uuid-ossp" with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as
$$ select auth.jwt() ->> 'role' $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter database wgi_fresh set search_path = "$user", public, extensions;
