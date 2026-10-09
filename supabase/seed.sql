-- Auth and portal fixtures are seeded after local keys are generated.

-- Deterministic fictional workflow fixtures for Preview Branch review.
-- Local `npm run dev` replaces `/seed` rows with the random mix from
-- scripts/dev-patients.mjs.
insert into public.requests(id,name,phone,email,location,preferred_time,message,locale,source_path,status,created_at,follow_up_at,record_handoff_at,closed_at,closure_reason,legacy_review_required)
values
 ('10000000-0000-4000-8000-000000000001','Maria Santos','8135550101','maria_santos@mock.com','tampa','morning',null,'en','/seed','new',now()-interval '2 days',null,null,null,null,false),
 ('10000000-0000-4000-8000-000000000002','James Okonkwo','8135550102','james_okonkwo@mock.com','lutz','afternoon',null,'en','/seed','new',now()-interval '2 hours',null,null,null,null,false),
 ('10000000-0000-4000-8000-000000000003','Linh Tran','8135550103','linh_tran@mock.com','any','any',null,'en','/seed','contacted',now()-interval '3 days',now()-interval '1 hour',null,null,null,false),
 ('10000000-0000-4000-8000-000000000004','Rosa Alvarez','8135550104','rosa_alvarez@mock.com','tampa','morning',null,'en','/seed','contacted',now()-interval '5 days',null,null,null,null,false),
 ('10000000-0000-4000-8000-000000000005','David Kim','8135550105','david_kim@mock.com','lutz','afternoon',null,'en','/seed','booked',now()-interval '5 days',null,now()-interval '1 day',null,null,false),
 ('10000000-0000-4000-8000-000000000006','Priya Shah','8135550106','priya_shah@mock.com','any','any',null,'en','/seed','closed',now()-interval '5 days',null,null,now()-interval '1 day','not_actionable',false),
 ('10000000-0000-4000-8000-000000000007','Hassan Ibrahim','8135550107','hassan_ibrahim@mock.com','tampa','morning',null,'en','/seed','closed',now()-interval '5 days',null,null,now()-interval '1 day','wont_schedule',false),
 ('10000000-0000-4000-8000-000000000008','Elena Vargas','8135550108','elena_vargas@mock.com','lutz','afternoon',null,'en','/seed','closed',now()-interval '10 days',null,null,null,null,true);

insert into public.request_events(request_id,type,status,meta,created_at) values
 ('10000000-0000-4000-8000-000000000003','contact_attempt','recorded','{"outcome":"no_answer","author_email":"seed.staff@example.test"}',now()-interval '1 day'),
 ('10000000-0000-4000-8000-000000000003','note','recorded','{"text":"Fictional seed note.","author_email":"seed.staff@example.test"}',now()-interval '23 hours'),
 ('10000000-0000-4000-8000-000000000004','contact_attempt','recorded','{"outcome":"voicemail","author_email":"seed.staff@example.test"}',now()-interval '4 days');
