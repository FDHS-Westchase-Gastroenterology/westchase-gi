-- Rollback for 20260817164844_restrict_receipt_service_grant.sql.
-- Restores service_role to the full explicit ACL that Supabase assigns at
-- CREATE TABLE time (as left by migration 20260817153511).

revoke all on public.staff_request_receipts from service_role;
grant all on public.staff_request_receipts to service_role;
