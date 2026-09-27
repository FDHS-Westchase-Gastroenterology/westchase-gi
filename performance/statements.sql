BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
WITH functions AS (
 SELECT p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'portal_%'
), relations AS (
 SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','v','m')
), classified AS (
 SELECT s.*, r.rolname AS role,
 ARRAY(SELECT name FROM functions f WHERE s.query ~ ('\m' || f.name || '\M') ORDER BY name) AS rpc_names,
 ARRAY(SELECT name FROM relations t WHERE s.query ~ ('\m' || t.name || '\M') ORDER BY name) AS relation_names
 FROM extensions.pg_stat_statements s JOIN pg_roles r ON r.oid=s.userid
 WHERE s.dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND s.toplevel
 AND r.rolname IN ('service_role','authenticator','anon','authenticated')
)
SELECT jsonb_build_object('captured_at',now(),'stats_info',(SELECT to_jsonb(i) FROM extensions.pg_stat_statements_info i),
'statements',coalesce(jsonb_agg(jsonb_build_object(
'queryid',queryid::text,'userid',userid,'dbid',dbid,'role',role,'toplevel',toplevel,
'rpc_names',rpc_names,'relation_names',relation_names,
'sql_kind',CASE WHEN cardinality(rpc_names)>0 THEN 'RPC' WHEN query ~* '\minsert\s+into\M' THEN 'INSERT' WHEN query ~* '\mupdate\s+"?(public|private|[a-z_]+)"?' THEN 'UPDATE' WHEN query ~* '\mdelete\s+from\M' THEN 'DELETE' WHEN query ~* '\mselect\M' THEN 'SELECT' ELSE 'OTHER' END,
'calls',calls,'rows',rows,'total_exec_time_ms',total_exec_time,'mean_exec_time_ms',mean_exec_time,
'min_exec_time_ms',min_exec_time,'max_exec_time_ms',max_exec_time,'stddev_exec_time_ms',stddev_exec_time,
'shared_blks_hit',shared_blks_hit,'shared_blks_read',shared_blks_read,'shared_blks_dirtied',shared_blks_dirtied,'shared_blks_written',shared_blks_written,
'temp_blks_read',temp_blks_read,'temp_blks_written',temp_blks_written,'wal_bytes',wal_bytes,
'stats_since',stats_since,'minmax_stats_since',minmax_stats_since
) ORDER BY total_exec_time DESC),'[]'::jsonb)) AS baseline_statements FROM classified;
COMMIT;
