BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT jsonb_build_object(
'captured_at', now(), 'database_name', current_database(), 'collector_role', current_user,
'postgres_version', version(), 'postmaster_started_at', pg_postmaster_start_time(),
'database_bytes', pg_database_size(current_database()),
'settings', (SELECT jsonb_object_agg(name, setting) FROM pg_settings WHERE name IN ('pg_stat_statements.track','pg_stat_statements.track_planning','pg_stat_statements.max','track_io_timing','track_functions','shared_buffers','max_connections')),
'statement_stats_info', (SELECT to_jsonb(i) FROM extensions.pg_stat_statements_info i),
'database_stats', (SELECT to_jsonb(d) - 'datid' FROM pg_stat_database d WHERE datname=current_database()),
'migrations', (SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
'functions', (SELECT jsonb_agg(jsonb_build_object('name',p.proname,'identity_arguments',pg_get_function_identity_arguments(p.oid),'definition_md5',md5(pg_get_functiondef(p.oid))) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'),
'tables', (SELECT jsonb_agg(jsonb_build_object('schema',s.schemaname,'table',s.relname,'estimated_live_rows',s.n_live_tup,'estimated_dead_rows',s.n_dead_tup,'inserts',s.n_tup_ins,'updates',s.n_tup_upd,'deletes',s.n_tup_del,'seq_scan',s.seq_scan,'seq_tup_read',s.seq_tup_read,'idx_scan',s.idx_scan,'total_bytes',pg_total_relation_size(s.relid),'last_analyze',s.last_analyze,'last_autoanalyze',s.last_autoanalyze) ORDER BY s.relname) FROM pg_stat_user_tables s WHERE schemaname IN ('public','private')),
'connections', (SELECT jsonb_agg(x) FROM (SELECT usename,state,wait_event_type,count(*) AS connections FROM pg_stat_activity WHERE datname=current_database() GROUP BY usename,state,wait_event_type) x)
) AS baseline_context;
COMMIT;
