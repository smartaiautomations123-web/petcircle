begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.petcircle_create('Milo’s circle', 'Alex') as circle_id \gset
select set_config('test.circle_id', :'circle_id', true);

select public.petcircle_apply(:'circle_id', '{"type":"savePet","pet":{"id":"milo","name":"Milo","species":"Dog","microchip":"1234","insurer":"Private","policyNumber":"XYZ","vetPhone":"01234"}}');
select public.petcircle_apply(:'circle_id', '{"type":"savePet","pet":{"id":"bea","name":"Bea","species":"Cat"}}');
select public.petcircle_apply(:'circle_id', '{"type":"saveRoutine","routine":{"id":"meal","petId":"milo","kind":"feed","title":"Breakfast","time":"08:00","details":"One scoop","escalateMinutes":30}}');
select public.petcircle_apply(:'circle_id', jsonb_build_object('type', 'invite', 'invite', jsonb_build_object(
  'id', 'temp-1', 'code', '77777777-0000-4000-8000-000000000001', 'role', 'sitter', 'petId', 'milo', 'expiresAt', now() + interval '1 day')));
select public.petcircle_apply(:'circle_id', jsonb_build_object('type', 'invite', 'invite', jsonb_build_object(
  'id', 'family-1', 'code', '77777777-0000-4000-8000-000000000002', 'role', 'family', 'expiresAt', now() + interval '7 days')));

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.petcircle_join('77777777-0000-4000-8000-000000000001', 'Jess');
do $$
declare snapshot jsonb := public.petcircle_load() -> 0;
begin
  assert snapshot ->> 'role' = 'sitter';
  assert jsonb_array_length(snapshot -> 'pets') = 1;
  assert snapshot #>> '{pets,0,id}' = 'milo';
  assert snapshot #>> '{pets,0,vetPhone}' = '01234';
  assert coalesce(snapshot #>> '{pets,0,microchip}', '') = '';
  assert coalesce(snapshot #>> '{pets,0,insurer}', '') = '';
  assert coalesce(snapshot #>> '{pets,0,policyNumber}', '') = '';
  assert jsonb_array_length(snapshot -> 'invites') = 0;
  begin
    perform count(*) from petcircle_private.pets;
    raise exception 'sitter queried private tables directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.petcircle_apply(current_setting('test.circle_id')::uuid, '{"type":"savePet","pet":{"id":"milo","name":"Edited","species":"Dog"}}');
    raise exception 'sitter edited pet';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.petcircle_apply(current_setting('test.circle_id')::uuid, '{"type":"log","entry":{"id":"blocked","petId":"bea","kind":"feed","title":"Feeding"}}');
    raise exception 'sitter logged on another pet';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select public.petcircle_apply(:'circle_id', '{"type":"log","entry":{"id":"log-1","petId":"milo","routineId":"meal","kind":"med","title":"Spoof","by":"Alex"}}');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select public.petcircle_join('77777777-0000-4000-8000-000000000002', 'Sam');
select public.petcircle_apply(:'circle_id', '{"type":"log","entry":{"id":"log-2","petId":"milo","routineId":"meal","kind":"feed","title":"Breakfast"}}');
do $$
declare snapshot jsonb := public.petcircle_load() -> 0;
begin
  assert snapshot ->> 'role' = 'family';
  assert jsonb_array_length(snapshot -> 'pets') = 2;
  assert jsonb_array_length(snapshot -> 'entries') = 1;
  assert snapshot #>> '{entries,0,kind}' = 'feed';
  assert snapshot #>> '{entries,0,title}' = 'Breakfast';
  assert snapshot #>> '{entries,0,by}' = 'Jess';
  assert snapshot #>> '{entries,0,scheduledDate}' = to_char(now() at time zone 'Europe/London', 'YYYY-MM-DD');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
do $$
begin
  assert jsonb_array_length(public.petcircle_load()) = 0;
  assert (select count(*) from public.petcircle_updates) = 0;
  begin
    perform public.petcircle_join('77777777-0000-4000-8000-000000000001', 'Uninvited');
    raise exception 'used invitation accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Expiry is enforced at read and write time even without an app or worker.
reset role;
update petcircle_private.members
  set expires_at = clock_timestamp() - interval '1 second'
  where user_id = '00000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  assert jsonb_array_length(public.petcircle_load()) = 0;
  begin
    perform public.petcircle_apply(current_setting('test.circle_id')::uuid, '{"type":"log","entry":{"id":"expired","petId":"milo","kind":"note","title":"Expired"}}');
    raise exception 'expired sitter retained write access';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.petcircle_apply(:'circle_id', '{"type":"revokeMember","id":"00000000-0000-4000-8000-000000000002"}');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  assert jsonb_array_length(public.petcircle_load()) = 0;
  assert (select count(*) from public.petcircle_updates) = 1;
  begin
    perform public.petcircle_apply(current_setting('test.circle_id')::uuid, '{"type":"log","entry":{"id":"revoked","petId":"milo","kind":"note","title":"Revoked"}}');
    raise exception 'revoked sitter retained write access';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.petcircle_load();
    raise exception 'anonymous role invoked private RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
