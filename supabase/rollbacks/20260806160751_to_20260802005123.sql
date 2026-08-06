-- Manual rollback for 20260806160751_preview_schema_readiness.
-- Run only with the pre-migration application deployment ready.

drop function public.portal_preview_schema_readiness();
