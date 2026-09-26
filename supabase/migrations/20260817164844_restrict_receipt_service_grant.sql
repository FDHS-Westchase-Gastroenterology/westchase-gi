-- Supabase grants service_role full table privileges at CREATE TABLE time by
-- default. Migration 20260817153511 revoked public/anon/authenticated access
-- but did not revoke the pre-existing service_role grant; its subsequent
-- GRANT SELECT, INSERT did not narrow the already-full service_role ACL.
--
-- This migration corrects that: it revokes all service_role privileges then
-- grants back only the SELECT and INSERT required for idempotency-receipt reads
-- and writes. No other table or managed role is altered.

revoke all on public.staff_request_receipts from service_role;
grant select, insert on public.staff_request_receipts to service_role;
