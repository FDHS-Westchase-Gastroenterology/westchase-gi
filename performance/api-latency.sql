-- Supabase query_logs ClickHouse SQL. Supply explicit UTC start/end, at most 24 hours.
SELECT if(toString(log_attributes['request.path']) IN ('/rest/v1/rpc/portal_acknowledge_staff_release','/rest/v1/rpc/portal_add_request_note','/rest/v1/rpc/portal_check_intake_rate_limit','/rest/v1/rpc/portal_close_request','/rest/v1/rpc/portal_complete_staff_onboarding','/rest/v1/rpc/portal_delete_request_early','/rest/v1/rpc/portal_hide_staff_release','/rest/v1/rpc/portal_log_call_outcome','/rest/v1/rpc/portal_open_staff_release','/rest/v1/rpc/portal_preview_data_lifecycle','/rest/v1/rpc/portal_record_analytics_event','/rest/v1/rpc/portal_record_staff_password_reset','/rest/v1/rpc/portal_record_staff_release_dismiss','/rest/v1/rpc/portal_record_staff_release_guide_open','/rest/v1/rpc/portal_run_data_lifecycle','/rest/v1/rpc/portal_set_request_legal_hold','/rest/v1/rpc/portal_set_staff_tour_dismissed','/rest/v1/rpc/portal_undo_call_outcome','/rest/v1/rpc/portal_update_recipient_label','/rest/v1/rpc/portal_update_request_status','/rest/v1/audit_log','/rest/v1/notification_recipients','/rest/v1/portal_release_states','/rest/v1/request_events','/rest/v1/requests','/rest/v1/staff_profiles','/auth/v1/token','/auth/v1/user','/auth/v1/logout','/auth/v1/otp','/auth/v1/verify','/auth/v1/recover','/auth/v1/admin/users'), toString(log_attributes['request.path']), 'other') AS route,
toString(log_attributes['request.method']) AS method,
toString(log_attributes['response.status_code']) AS status,
count(*) AS requests,
countIf(isNotNull(toFloat64OrNull(toString(log_attributes['response.origin_time'])))) AS timed_requests,
avg(toFloat64OrNull(toString(log_attributes['response.origin_time']))) AS mean_origin_time,
quantileExact(0.50)(toFloat64OrNull(toString(log_attributes['response.origin_time']))) AS p50_origin_time,
quantileExact(0.95)(toFloat64OrNull(toString(log_attributes['response.origin_time']))) AS p95_origin_time,
max(toFloat64OrNull(toString(log_attributes['response.origin_time']))) AS max_origin_time
FROM logs WHERE source='edge_logs' GROUP BY route,method,status ORDER BY requests DESC;
