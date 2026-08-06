-- Auth and portal fixtures are seeded after local keys are generated.

-- Fictional workflow fixtures for local/disposable review only.
insert into public.requests(id,name,phone,email,location,preferred_time,message,locale,source_path,status,created_at,follow_up_at,record_handoff_at,closed_at,closure_reason,legacy_review_required)
values
 ('10000000-0000-4000-8000-000000000001','Test Patient A','8135550101',null,'tampa','morning',null,'en','/seed','new',now()-interval '2 days',null,null,null,null,false),
 ('10000000-0000-4000-8000-000000000002','Test Patient B','8135550102',null,'lutz','afternoon',null,'en','/seed','new',now()-interval '2 hours',null,null,null,null,false),
 ('10000000-0000-4000-8000-000000000003','Test Patient C','8135550103',null,'any','any',null,'en','/seed','contacted',now()-interval '3 days',now()-interval '1 hour',null,null,null,false),
 ('10000000-0000-4000-8000-000000000004','Test Patient D','8135550104',null,'tampa','morning',null,'en','/seed','contacted',now()-interval '1 day',null,null,null,null,false),
 ('10000000-0000-4000-8000-000000000005','Test Patient E','8135550105',null,'lutz','afternoon',null,'en','/seed','booked',now()-interval '5 days',null,now()-interval '1 day',null,null,false),
 ('10000000-0000-4000-8000-000000000006','Test Patient F','8135550106',null,'any','any',null,'en','/seed','closed',now()-interval '5 days',null,null,now()-interval '1 day','not_actionable',false),
 ('10000000-0000-4000-8000-000000000007','Test Patient G','8135550107',null,'tampa','morning',null,'en','/seed','closed',now()-interval '5 days',null,null,now()-interval '1 day','wont_schedule',false),
 ('10000000-0000-4000-8000-000000000008','Test Patient H','8135550108',null,'lutz','afternoon',null,'en','/seed','closed',now()-interval '10 days',null,null,null,null,true);

insert into public.request_events(request_id,type,status,meta,created_at) values
 ('10000000-0000-4000-8000-000000000003','contact_attempt','recorded','{"outcome":"no_answer","author_email":"seed.staff@example.test"}',now()-interval '1 day'),
 ('10000000-0000-4000-8000-000000000003','note','recorded','{"text":"Fictional seed note.","author_email":"seed.staff@example.test"}',now()-interval '23 hours');
