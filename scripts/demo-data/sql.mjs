/* Turns a generated dataset into one SQL script that replaces the branch's portal data in a single
   transaction. History tables (revisions, scheduling changes, the audit log) are derived inside
   the database from the inserted rows, the way each portal command writes them. */

const U = "uuid";
const TX = "text";
const TS = "timestamptz";
const I = "integer";
const B = "bigint";
const J = "jsonb";
const D = "date";
const BO = "boolean";

const CONFIG = [
  ["id", U],
  ["name", TX],
  ["active", BO],
  ["version", B],
  ["created_at", TS],
  ["updated_at", TS],
  ["created_by", U],
  ["updated_by", U],
];

/** Column definitions in insert order. Billing accounts precede their entries. */
const TABLES = [
  [
    "staff_profiles",
    [
      ["user_id", U],
      ["email", TX],
      ["display_name", TX],
      ["role", TX],
      ["active", BO],
      ["created_at", TS],
      ["updated_at", TS],
      ["onboarded_at", TS],
      ["portal_tour_dismissed_at", TS],
    ],
  ],
  [
    "clinical_signers",
    [
      ["user_id", U],
      ["enabled", BO],
      ["version", B],
      ["configured_by", U],
      ["configured_at", TS],
    ],
  ],
  [
    "scheduling_locations",
    [
      ...CONFIG,
      ["request_location", TX],
      ["street", TX],
      ["city", TX],
      ["region", TX],
      ["postal", TX],
      ["maps_query", TX],
    ],
  ],
  ["scheduling_providers", [...CONFIG, ["credentials", TX], ["bookable", BO], ["sort_order", I]]],
  [
    "appointment_types",
    [
      ...CONFIG,
      ["duration_minutes", I],
      ["buffer_before_minutes", I],
      ["buffer_after_minutes", I],
      ["sort_order", I],
      ["icon", TX],
      ["description", TX],
    ],
  ],
  [
    "appointment_type_providers",
    [
      ["appointment_type_id", U],
      ["provider_id", U],
    ],
  ],
  [
    "location_hours",
    [
      ["location_id", U],
      ["weekday", I],
      ["open_minute", I],
      ["close_minute", I],
    ],
  ],
  [
    "location_closures",
    [
      ["id", U],
      ["location_id", U],
      ["closed_on", D],
      ["note", TX],
      ["created_at", TS],
      ["created_by", U],
    ],
  ],
  [
    "provider_hours",
    [
      ["id", U],
      ["provider_id", U],
      ["location_id", U],
      ["weekday", I],
      ["open_minute", I],
      ["close_minute", I],
      ["valid_from", D],
    ],
  ],
  [
    "provider_time_exceptions",
    [
      ["id", U],
      ["provider_id", U],
      ["location_id", U],
      ["kind", TX],
      ["reason", TX],
      ["starts_at", TS],
      ["ends_at", TS],
    ],
  ],
  [
    "patients",
    [
      ["id", U],
      ["name", TX],
      ["date_of_birth", D],
      ["phone", TX],
      ["email", TX],
      ["version", B],
      ["created_at", TS],
      ["updated_at", TS],
      ["created_by", U],
      ["updated_by", U],
    ],
  ],
  [
    "requests",
    [
      ["id", U],
      ["name", TX],
      ["phone", TX],
      ["email", TX],
      ["location", TX],
      ["preferred_time", TX],
      ["message", TX],
      ["locale", TX],
      ["source_path", TX],
      ["status", TX],
      ["created_at", TS],
      ["updated_at", TS],
      ["follow_up_at", TS],
      ["record_handoff_at", TS],
      ["closed_at", TS],
      ["closure_reason", TX],
      ["appointment_at", TS],
      ["version", B],
    ],
  ],
  [
    "request_transitions",
    [
      ["id", U],
      ["request_id", U],
      ["from_state", TX],
      ["to_state", TX],
      ["command", TX],
      ["actor_email", TX],
      ["resulting_version", B],
      ["idempotency_key", U],
      ["occurred_at", TS],
      ["reason_code", TX],
      ["provenance", TX],
      ["prior_snapshot", J],
      ["call_again_at", TS],
      ["appointment_at", TS],
    ],
  ],
  [
    "request_events",
    [
      ["id", U],
      ["request_id", U],
      ["type", TX],
      ["status", TX],
      ["meta", J],
      ["created_at", TS],
      ["updated_at", TS],
    ],
  ],
  [
    "patient_request_links",
    [
      ["request_id", U],
      ["patient_id", U],
      ["linked_at", TS],
      ["linked_by", U],
    ],
  ],
  [
    "appointments",
    [
      ["id", U],
      ["patient_id", U],
      ["provider_id", U],
      ["location_id", U],
      ["appointment_type_id", U],
      ["source_request_id", U],
      ["starts_at", TS],
      ["ends_at", TS],
      ["duration_minutes", I],
      ["buffer_before_minutes", I],
      ["buffer_after_minutes", I],
      ["reserved_from", TS],
      ["reserved_until", TS],
      ["status", TX],
      ["reason", TX],
      ["version", B],
      ["created_at", TS],
      ["updated_at", TS],
      ["created_by", U],
      ["updated_by", U],
      ["request_workflow_managed", BO],
    ],
  ],
  [
    "patient_clinical_records",
    [
      ["id", U],
      ["patient_id", U],
      ["appointment_id", U],
      ["record_kind", TX],
      ["title", TX],
      ["service_date", D],
      ["note_text", TX],
      ["status", TX],
      ["version", B],
      ["author_id", U],
      ["author_email", TX],
      ["signed_by", U],
      ["signed_by_email", TX],
      ["signed_at", TS],
      ["created_at", TS],
      ["updated_at", TS],
      ["updated_by", U],
    ],
  ],
  [
    "patient_billing_accounts",
    [
      ["patient_id", U],
      ["currency", TX],
      ["balance_cents", B],
      ["version", B],
      ["created_at", TS],
      ["updated_at", TS],
    ],
  ],
  [
    "patient_billing_entries",
    [
      ["id", U],
      ["patient_id", U],
      ["appointment_id", U],
      ["kind", TX],
      ["amount_cents", B],
      ["resulting_balance_cents", B],
      ["version", B],
      ["description", TX],
      ["service_date", D],
      ["payment_method", TX],
      ["actor_id", U],
      ["actor_email", TX],
      ["occurred_at", TS],
    ],
  ],
];

/** Portal data tables in delete order. Staff profiles and the audit log are handled separately. */
export const PORTAL_TABLES = [
  "patient_billing_receipts",
  "patient_billing_entries",
  "patient_billing_accounts",
  "clinical_command_receipts",
  "patient_clinical_revisions",
  "patient_clinical_records",
  "clinical_signers",
  "scheduling_command_receipts",
  "scheduling_changes",
  "appointments",
  "staff_schedule_preferences",
  "provider_time_exceptions",
  "provider_hours",
  "appointment_type_providers",
  "location_closures",
  "location_hours",
  "scheduling_providers",
  "scheduling_locations",
  "appointment_types",
  "patient_request_links",
  "patient_command_receipts",
  "patient_revisions",
  "patients",
  "request_command_receipts",
  "staff_request_receipts",
  "request_events",
  "request_transitions",
  "requests",
];

function json(value) {
  const text = JSON.stringify(value);
  if (text.includes("$j$")) throw new Error("Demo data contains the SQL payload delimiter");
  return `$j$${text}$j$::jsonb`;
}

const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;

function insert(table, defs, rows) {
  if (!rows.length) return "";
  const cols = defs.map(([c]) => c).join(",");
  const recordset = defs.map(([c, t]) => `${c} ${t}`).join(",");
  return `insert into public.${table} (${cols})\n  select ${cols} from jsonb_to_recordset(${json(rows)}) as x(${recordset});\n`;
}

const audit = (select) =>
  `insert into public.audit_log (actor_email,action,entity,entity_id,source,correlation_id,detail,at,created_at,updated_at)
  select actor_email,action,entity,entity_id,'staff',gen_random_uuid(),detail,at,at,at
  from (${select}) q(actor_email,action,entity,entity_id,detail,at);\n`;

/**
 * Wipes the portal's patient, request, scheduling, clinical and billing data, then inserts the
 * dataset. Keeps every admin profile outside @example.test and the operator; removes other staff
 * profiles (clinicians are re-inserted from the roster). Raises before touching anything if the
 * operator is not an active admin.
 */
export function resetSql(data) {
  const { rows, history, staff, meta } = data;
  const operator = literal(staff.operator.id);
  const clinicianIds = staff.clinicians.map((c) => literal(c.id)).join(",");
  let sql = `-- Demo data reset (seed ${meta.seed}, now ${meta.now}). Generated by scripts/demo-data-cli.mjs.\n`;
  sql += `do $demo$\nbegin\n`;
  sql += `if not exists (select 1 from public.staff_profiles where user_id = ${operator} and role = 'admin' and active) then
  raise exception 'The demo operator must be an active admin staff profile';
end if;\n`;
  for (const table of PORTAL_TABLES) sql += `delete from public.${table};\n`;
  sql += `delete from public.audit_log where source is not null;\n`;
  sql += `delete from public.staff_profiles where user_id <> ${operator} and (role <> 'admin' or email like '%@example.test');\n`;

  for (const [table, defs] of TABLES) {
    // Inserting providers and types pairs every provider with every type; the dataset's own
    // pairs replace those defaults.
    if (table === "appointment_type_providers") sql += `delete from public.${table};\n`;
    sql += insert(table, defs, rows[table]);
  }
  // Explicit booking orders leave the identity sequences behind; a new row takes the next position.
  for (const table of ["scheduling_providers", "appointment_types"])
    sql += `perform setval(pg_get_serial_sequence('public.${table}','sort_order'),coalesce((select max(sort_order) from public.${table}),0)+1,false);\n`;

  sql += `insert into public.patient_revisions (id,patient_id,version,command,before_record,after_record,request_id,actor_id,actor_email,occurred_at)
  select gen_random_uuid(), p.id, 1, 'create', null, to_jsonb(p) - 'search_text', x.request_id, p.created_by, s.email, p.created_at
  from public.patients p join public.staff_profiles s on s.user_id = p.created_by
  left join jsonb_to_recordset(${json(history.patientRequests)}) as x(patient_id uuid, request_id uuid) on x.patient_id = p.id;\n`;

  // Each scheduling change records the appointment as it stood at that version.
  sql += `insert into public.scheduling_changes (id,entity,entity_id,appointment_id,version,command,before_record,after_record,actor_id,actor_email,occurred_at,request_id,request_before,request_after_version,request_transition_id)
  select gen_random_uuid(),'appointment',x.appointment_id,x.appointment_id,x.version,x.command,
    lag(r.rec) over (partition by x.appointment_id order by x.version), r.rec, x.actor_id,x.actor_email,x.occurred_at,x.request_id,x.request_before,x.request_after_version,x.request_transition_id
  from jsonb_to_recordset(${json(history.appointmentSteps)}) as x(appointment_id uuid,version bigint,command text,actor_id uuid,actor_email text,occurred_at timestamptz,patch jsonb,request_id uuid,request_before jsonb,request_after_version bigint,request_transition_id uuid)
  join public.appointments a on a.id = x.appointment_id
  cross join lateral (select to_jsonb(a) || x.patch as rec) r;\n`;

  sql += `insert into public.patient_clinical_revisions (id,record_id,version,command,before_record,after_record,actor_id,actor_email,occurred_at)
  select gen_random_uuid(), c.id, v.version, v.command, v.before_record, v.after_record, c.author_id, c.author_email, v.occurred_at
  from public.patient_clinical_records c
  cross join lateral (select to_jsonb(c) || jsonb_build_object('status','draft','version',1,'signed_by',null,'signed_by_email',null,'signed_at',null,'updated_at',to_jsonb(c.created_at)) as draft) d
  cross join lateral (
    select 1::bigint as version, 'create'::text as command, null::jsonb as before_record, d.draft as after_record, c.created_at as occurred_at
    union all
    select 2, 'sign', d.draft, to_jsonb(c), c.signed_at where c.status = 'signed'
  ) v;\n`;

  sql += audit(
    `select s.email,'clinical.signer_permission_changed','clinical_signers',c.user_id,jsonb_build_object('enabled',true,'version',1),c.configured_at from public.clinical_signers c join public.staff_profiles s on s.user_id=c.configured_by where c.user_id in (${clinicianIds})`,
  );
  sql += audit(
    `select actor_email,'patient.create','patients',patient_id,jsonb_build_object('version',1,'request_id',request_id),occurred_at from public.patient_revisions`,
  );
  sql += audit(
    `select r.creator_email,'request.create','requests',r.id,jsonb_build_object('origin','staff'),r.created_at from jsonb_to_recordset(${json(history.staffRequests)}) as r(id uuid, creator_email text, created_at timestamptz)`,
  );
  sql += audit(
    `select actor_email,'request.workflow_command','requests',request_id,jsonb_build_object('command',command,'from',from_state,'to',to_state,'resulting_version',resulting_version),occurred_at from public.request_transitions`,
  );
  sql += audit(
    `select meta->>'author_email','request.note','requests',request_id,jsonb_build_object('length',char_length(meta->>'text')),created_at from public.request_events where type='note'`,
  );
  sql += audit(
    `select actor_email,'appointment.'||command,'appointments',appointment_id,jsonb_build_object('version',version,'status',after_record->>'status','compensates_change_id',null),occurred_at from public.scheduling_changes where entity='appointment'`,
  );
  sql += audit(
    `select actor_email,'clinical.'||command,'patient_clinical_records',record_id,jsonb_build_object('version',version,'status',after_record->>'status','amends_id',null),occurred_at from public.patient_clinical_revisions`,
  );
  sql += audit(
    `select actor_email,'billing.'||kind,'patient_billing',patient_id,jsonb_build_object('entry_id',id,'version',version),occurred_at from public.patient_billing_entries`,
  );
  sql += `end\n$demo$;\n`;
  return sql;
}

/** Row counts for every table the reset writes, plus the audit rows it derives. */
export const COUNTS_SQL = `select json_build_object(${[
  ...TABLES.map(([t]) => t),
  "patient_revisions",
  "scheduling_changes",
  "patient_clinical_revisions",
]
  .map((t) => `'${t}', (select count(*) from public.${t})`)
  .join(
    ", ",
  )}, 'audit_log', (select count(*) from public.audit_log where source is not null)) as counts`;
