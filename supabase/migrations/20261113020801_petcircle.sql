create schema petcircle_private;
revoke all on schema petcircle_private from public, anon, authenticated;
grant usage on schema petcircle_private to authenticated;
alter default privileges in schema petcircle_private revoke execute on functions from public;

create table petcircle_private.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table petcircle_private.pets (
  circle_id uuid not null references petcircle_private.circles on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (circle_id, id)
);

create table petcircle_private.members (
  circle_id uuid not null references petcircle_private.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  role text not null check (role in ('owner', 'family', 'sitter')),
  pet_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id),
  foreign key (circle_id, pet_id) references petcircle_private.pets on delete cascade,
  check ((role = 'sitter' and expires_at is not null and pet_id is not null)
    or (role <> 'sitter' and expires_at is null and pet_id is null))
);

create index petcircle_members_user on petcircle_private.members (user_id, circle_id);
create index petcircle_members_pet on petcircle_private.members (circle_id, pet_id) where pet_id is not null;

create table petcircle_private.invites (
  circle_id uuid not null references petcircle_private.circles on delete cascade,
  id text not null,
  code text not null unique,
  role text not null check (role in ('family', 'sitter')),
  pet_id text,
  expires_at timestamptz not null,
  claimed_by uuid references auth.users on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (circle_id, id),
  foreign key (circle_id, pet_id) references petcircle_private.pets on delete cascade,
  check ((role = 'sitter') = (pet_id is not null))
);

create index petcircle_invites_pet on petcircle_private.invites (circle_id, pet_id) where pet_id is not null;
create index petcircle_invites_claimed_by on petcircle_private.invites (claimed_by) where claimed_by is not null;

create table petcircle_private.records (
  circle_id uuid not null,
  id text not null,
  pet_id text not null,
  category text not null check (category in ('routine', 'entry', 'health', 'reminder')),
  data jsonb not null,
  routine_id text,
  scheduled_date date,
  created_at timestamptz not null default now(),
  primary key (circle_id, category, id),
  foreign key (circle_id, pet_id) references petcircle_private.pets on delete cascade,
  check ((routine_id is null and scheduled_date is null)
    or (category = 'entry' and routine_id is not null and scheduled_date is not null))
);

create index petcircle_records_pet on petcircle_private.records (circle_id, pet_id, category, created_at desc);
create unique index petcircle_daily_completion
  on petcircle_private.records (circle_id, routine_id, scheduled_date)
  where routine_id is not null;

-- Realtime clients see only their own opaque refresh marker. Care data is
-- fetched separately and filtered against the current membership on each read.
create table public.petcircle_updates (
  user_id uuid primary key references auth.users on delete cascade,
  marker uuid not null default gen_random_uuid()
);

alter table petcircle_private.circles enable row level security;
alter table petcircle_private.pets enable row level security;
alter table petcircle_private.members enable row level security;
alter table petcircle_private.invites enable row level security;
alter table petcircle_private.records enable row level security;
alter table public.petcircle_updates enable row level security;
revoke all on all tables in schema petcircle_private from public, anon, authenticated;
revoke all on public.petcircle_updates from public, anon, authenticated;
grant select on public.petcircle_updates to authenticated;
create policy petcircle_read_own_updates on public.petcircle_updates
  for select to authenticated using (user_id = (select auth.uid()));

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.petcircle_updates;
  end if;
end;
$$;

create function petcircle_private.actor() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Sign in to open a circle.' using errcode = '42501';
  end if;
  return actor_id;
end;
$$;

create function petcircle_private.field(source jsonb, key text, max_size integer, required boolean default false)
returns text language plpgsql immutable set search_path = '' as $$
declare
  value text := btrim(coalesce(source ->> key, ''));
begin
  if (source ? key and jsonb_typeof(source -> key) <> 'string')
      or char_length(value) > max_size or (required and value = '') then
    raise exception 'Check the % field.', key using errcode = '22023';
  end if;
  return value;
end;
$$;

create function petcircle_private.identifier(value text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if value is null or value !~ '^[A-Za-z0-9_-]{1,80}$' then
    raise exception 'Invalid record identifier.' using errcode = '22023';
  end if;
  return value;
end;
$$;

create function petcircle_private.notify(circle uuid, extra_user uuid default null) returns void
language sql volatile set search_path = '' as $$
  insert into public.petcircle_updates (user_id, marker)
    select recipients.user_id, gen_random_uuid()
    from (
      select m.user_id from petcircle_private.members m
      where m.circle_id = circle and (m.expires_at is null or m.expires_at > statement_timestamp())
      union select extra_user where extra_user is not null
    ) recipients
    order by recipients.user_id
  on conflict (user_id) do update set marker = excluded.marker;
$$;

create function petcircle_private.create_circle(circle_name text, display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := petcircle_private.actor();
  new_circle_id uuid;
begin
  insert into petcircle_private.circles (name)
    values (petcircle_private.field(jsonb_build_object('name', circle_name), 'name', 80, true))
    returning id into new_circle_id;
  insert into petcircle_private.members (circle_id, user_id, name, role)
    values (new_circle_id, actor_id, petcircle_private.field(jsonb_build_object('name', display_name), 'name', 80, true), 'owner');
  perform petcircle_private.notify(new_circle_id);
  return new_circle_id;
end;
$$;

create function petcircle_private.join_circle(invite_code text, display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := petcircle_private.actor();
  normalized_code text := upper(btrim(coalesce(invite_code, '')));
  member_name text := petcircle_private.field(jsonb_build_object('name', display_name), 'name', 80, true);
  target_circle uuid;
  invitation petcircle_private.invites%rowtype;
  membership petcircle_private.members%rowtype;
begin
  if normalized_code ~ '^[A-Z0-9-]{12,64}$' then
    select i.circle_id into target_circle from petcircle_private.invites i where i.code = normalized_code;
  end if;
  if target_circle is null then
    raise exception 'This invitation is invalid, expired or already used.' using errcode = '22023';
  end if;

  perform 1 from petcircle_private.circles c where c.id = target_circle for update;
  select * into invitation from petcircle_private.invites i where i.circle_id = target_circle and i.code = normalized_code;
  select * into membership from petcircle_private.members m where m.circle_id = target_circle and m.user_id = actor_id;

  if invitation.claimed_by = actor_id and membership.user_id is not null
      and (membership.expires_at is null or membership.expires_at > clock_timestamp()) then
    return target_circle;
  end if;
  if invitation.id is null or invitation.claimed_at is not null or invitation.expires_at <= clock_timestamp() then
    raise exception 'This invitation is invalid, expired or already used.' using errcode = '22023';
  end if;
  if membership.user_id is not null and (membership.expires_at is null or membership.expires_at > clock_timestamp())
      and not (membership.role = 'sitter' and invitation.role = 'family') then
    raise exception 'You already have access to this circle.' using errcode = '22023';
  end if;

  insert into petcircle_private.members (circle_id, user_id, name, role, pet_id, expires_at)
    values (target_circle, actor_id, member_name, invitation.role, invitation.pet_id,
      case when invitation.role = 'sitter' then invitation.expires_at end)
    on conflict (circle_id, user_id) do update
      set name = excluded.name, role = excluded.role, pet_id = excluded.pet_id, expires_at = excluded.expires_at;
  update petcircle_private.invites set claimed_by = actor_id, claimed_at = clock_timestamp()
    where circle_id = target_circle and id = invitation.id;
  perform petcircle_private.notify(target_circle);
  return target_circle;
end;
$$;

create function petcircle_private.load_circles() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'role', m.role, 'person', m.name,
    'pets', coalesce((select jsonb_agg(
      case when m.role = 'sitter' then p.data || '{"microchip":"","insurer":"","policyNumber":""}'::jsonb else p.data end
      order by p.created_at, p.id)
      from petcircle_private.pets p where p.circle_id = c.id and (m.pet_id is null or p.id = m.pet_id)), '[]'),
    'routines', coalesce((select jsonb_agg(r.data order by r.data ->> 'time', r.id) from petcircle_private.records r
      where r.circle_id = c.id and r.category = 'routine' and (m.pet_id is null or r.pet_id = m.pet_id)), '[]'),
    'entries', coalesce((select jsonb_agg(r.data order by r.created_at desc, r.id) from petcircle_private.records r
      where r.circle_id = c.id and r.category = 'entry' and (m.pet_id is null or r.pet_id = m.pet_id)), '[]'),
    'health', coalesce((select jsonb_agg(r.data order by r.created_at desc, r.id) from petcircle_private.records r
      where r.circle_id = c.id and r.category = 'health' and m.role <> 'sitter'), '[]'),
    'reminders', coalesce((select jsonb_agg(r.data order by r.data ->> 'at', r.id) from petcircle_private.records r
      where r.circle_id = c.id and r.category = 'reminder' and (m.pet_id is null or r.pet_id = m.pet_id)), '[]'),
    'members', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', member.user_id, 'name', member.name, 'role', member.role, 'petId', member.pet_id, 'expiresAt', member.expires_at
    )) order by member.created_at, member.user_id) from petcircle_private.members member
      where member.circle_id = c.id and (m.role <> 'sitter' or member.user_id = m.user_id)), '[]'),
    'invites', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', i.id, 'code', i.code, 'role', i.role, 'petId', i.pet_id, 'expiresAt', i.expires_at, 'claimed', i.claimed_at is not null
    )) order by i.created_at desc, i.id) from petcircle_private.invites i
      where i.circle_id = c.id and m.role = 'owner'), '[]')
  ) order by c.created_at, c.id), '[]')
  from petcircle_private.members m join petcircle_private.circles c on c.id = m.circle_id
  where m.user_id = petcircle_private.actor() and (m.expires_at is null or m.expires_at > statement_timestamp());
$$;

create function petcircle_private.apply_action(circle uuid, action jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := petcircle_private.actor();
  membership petcircle_private.members%rowtype;
  action_type text := action ->> 'type';
  record_id text;
  pet text;
  category_name text;
  payload jsonb;
  details jsonb;
  routine text;
  routine_data jsonb;
  completed_date date;
  saved_at timestamptz;
  expires timestamptz;
  notify_user uuid;
  code text;
  kind text;
  photo text;
  deadline integer;
  title text;
begin
  perform 1 from petcircle_private.circles c where c.id = circle for update;
  select * into membership from petcircle_private.members m where m.circle_id = circle and m.user_id = actor_id;
  if membership.user_id is null or membership.expires_at <= clock_timestamp() then
    raise exception 'Your access to this circle has ended.' using errcode = '42501';
  end if;
  if membership.role = 'sitter' and action_type is distinct from 'log' then
    raise exception 'Only owners and family can edit care details.' using errcode = '42501';
  end if;
  if membership.role <> 'owner' and action_type in ('invite', 'revokeInvite', 'revokeMember') then
    raise exception 'Only the circle owner can manage access.' using errcode = '42501';
  end if;

  case action_type
    when 'savePet' then
      payload := action -> 'pet';
      record_id := petcircle_private.identifier(payload ->> 'id');
      photo := petcircle_private.field(payload, 'photoUrl', 400023);
      if photo <> '' and not ((photo ~ '^https://[^[:space:]<>]+$' and char_length(photo) <= 2048)
        or (left(photo, 23) = 'data:image/jpeg;base64,' and substring(photo from 24) ~ '^/9j/[A-Za-z0-9+/]*={0,2}$'
            and length(substring(photo from 24)) % 4 = 0)) then
        raise exception 'Use a JPEG photo under 300 KB.' using errcode = '22023';
      end if;
      details := jsonb_strip_nulls(jsonb_build_object(
        'id', record_id,
        'name', petcircle_private.field(payload, 'name', 80, true),
        'species', petcircle_private.field(payload, 'species', 80, true),
        'breed', petcircle_private.field(payload, 'breed', 100),
        'age', petcircle_private.field(payload, 'age', 40),
        'description', petcircle_private.field(payload, 'description', 3000),
        'vetName', petcircle_private.field(payload, 'vetName', 120),
        'vetPhone', petcircle_private.field(payload, 'vetPhone', 50),
        'emergencyPhone', petcircle_private.field(payload, 'emergencyPhone', 50),
        'microchip', petcircle_private.field(payload, 'microchip', 120),
        'insurer', petcircle_private.field(payload, 'insurer', 120),
        'policyNumber', petcircle_private.field(payload, 'policyNumber', 120),
        'instructions', petcircle_private.field(payload, 'instructions', 5000),
        'contactName', petcircle_private.field(payload, 'contactName', 120),
        'contactPhone', petcircle_private.field(payload, 'contactPhone', 50),
        'photoUrl', nullif(photo, '')
      ));
      insert into petcircle_private.pets (circle_id, id, data) values (circle, record_id, details)
        on conflict (circle_id, id) do update set data = excluded.data;

    when 'saveRoutine', 'log', 'addHealth', 'addReminder' then
      case action_type
        when 'saveRoutine' then category_name := 'routine'; payload := action -> 'routine';
        when 'log' then category_name := 'entry'; payload := action -> 'entry';
        when 'addHealth' then category_name := 'health'; payload := action -> 'entry';
        when 'addReminder' then category_name := 'reminder'; payload := action -> 'reminder';
      end case;
      record_id := petcircle_private.identifier(payload ->> 'id');
      pet := petcircle_private.identifier(payload ->> 'petId');
      if membership.pet_id is not null and membership.pet_id <> pet then
        raise exception 'This pet is outside your access.' using errcode = '42501';
      end if;
      if not exists (select 1 from petcircle_private.pets p where p.circle_id = circle and p.id = pet) then
        raise exception 'This pet is no longer available.' using errcode = '22023';
      end if;
      details := jsonb_build_object('id', record_id, 'petId', pet);
      kind := payload ->> 'kind';

      case category_name
        when 'routine' then
          deadline := (payload ->> 'escalateMinutes')::integer;
          if kind is null or kind not in ('feed', 'walk', 'med')
              or coalesce(payload ->> 'time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
              or deadline is null or deadline not between 0 and 1440 then
            raise exception 'Check the routine type, time and escalation delay.' using errcode = '22023';
          end if;
          if exists (select 1 from petcircle_private.records r
              where r.circle_id = circle and r.category = 'routine' and r.id = record_id and r.pet_id <> pet) then
            raise exception 'An existing routine belongs to another pet.' using errcode = '22023';
          end if;
          details := details || jsonb_build_object(
            'kind', kind, 'title', petcircle_private.field(payload, 'title', 120, true),
            'time', payload ->> 'time', 'details', petcircle_private.field(payload, 'details', 2000),
            'escalateMinutes', deadline);

        when 'entry' then
          saved_at := clock_timestamp();
          if payload ? 'routineId' then
            routine := petcircle_private.identifier(payload ->> 'routineId');
            select r.data into routine_data from petcircle_private.records r
              where r.circle_id = circle and r.category = 'routine' and r.id = routine and r.pet_id = pet;
            if routine_data is null then
              raise exception 'This routine is no longer available.' using errcode = '22023';
            end if;
            completed_date := (saved_at at time zone 'Europe/London')::date;
            if nullif(payload ->> 'scheduledDate', '') is not null and (payload ->> 'scheduledDate')::date <> completed_date then
              raise exception 'The care day has changed. Refresh the routine and try again.' using errcode = '22023';
            end if;
            kind := routine_data ->> 'kind';
            title := routine_data ->> 'title';
            details := details || jsonb_build_object('routineId', routine, 'scheduledDate', completed_date);
          else
            if kind is null or kind not in ('feed', 'walk', 'med', 'note') then
              raise exception 'Check the care entry type.' using errcode = '22023';
            end if;
            title := petcircle_private.field(payload, 'title', 120, true);
          end if;
          details := details || jsonb_build_object(
            'kind', kind, 'title', title, 'note', petcircle_private.field(payload, 'note', 2000),
            'at', saved_at, 'by', membership.name);

        when 'health' then
          title := petcircle_private.field(payload, 'value', 200, true);
          if kind is null or kind not in ('weight', 'symptom')
              or (kind = 'weight' and not (title ~ '^[0-9]{1,4}(\.[0-9]{1,3})?$' and title::numeric > 0)) then
            raise exception 'Check the health entry type and value.' using errcode = '22023';
          end if;
          saved_at := coalesce(nullif(payload ->> 'at', '')::timestamptz, clock_timestamp());
          if not isfinite(saved_at) then
            raise exception 'Check the health entry date.' using errcode = '22023';
          end if;
          details := details || jsonb_build_object('kind', kind, 'at', saved_at, 'value', title,
            'note', petcircle_private.field(payload, 'note', 2000));

        when 'reminder' then
          saved_at := nullif(payload ->> 'at', '')::timestamptz;
          if kind is null or kind not in ('vet', 'vaccine') or saved_at is null or not isfinite(saved_at) then
            raise exception 'Check the reminder type and date.' using errcode = '22023';
          end if;
          details := details || jsonb_build_object(
            'kind', kind, 'title', petcircle_private.field(payload, 'title', 120, true),
            'at', saved_at, 'note', petcircle_private.field(payload, 'note', 2000));
      end case;

      if category_name = 'routine' then
        insert into petcircle_private.records (circle_id, id, pet_id, category, data)
          values (circle, record_id, pet, category_name, details)
          on conflict (circle_id, category, id) do update set data = excluded.data;
      else
        insert into petcircle_private.records (circle_id, id, pet_id, category, data, routine_id, scheduled_date)
          values (circle, record_id, pet, category_name, details, routine, completed_date)
          on conflict do nothing;
      end if;

    when 'removeRoutine', 'removeReminder' then
      category_name := case when action_type = 'removeRoutine' then 'routine' else 'reminder' end;
      delete from petcircle_private.records r where r.circle_id = circle and r.category = category_name
        and r.id = petcircle_private.identifier(action ->> 'id');

    when 'invite' then
      payload := action -> 'invite';
      record_id := petcircle_private.identifier(payload ->> 'id');
      kind := payload ->> 'role';
      code := upper(petcircle_private.field(payload, 'code', 64, true));
      expires := nullif(payload ->> 'expiresAt', '')::timestamptz;
      if kind is null or kind not in ('family', 'sitter') or code !~ '^[A-Z0-9-]{12,64}$'
          or expires is null or expires <= clock_timestamp() or expires > clock_timestamp() + interval '31 days' then
        raise exception 'Check the invitation code, role and expiry.' using errcode = '22023';
      end if;
      if kind = 'sitter' then
        pet := petcircle_private.identifier(payload ->> 'petId');
        if not exists (select 1 from petcircle_private.pets p where p.circle_id = circle and p.id = pet) then
          raise exception 'Choose a pet for this invitation.' using errcode = '22023';
        end if;
      end if;
      insert into petcircle_private.invites (circle_id, id, role, pet_id, code, expires_at)
        values (circle, record_id, kind, pet, code, expires)
        on conflict (circle_id, id) do nothing;

    when 'revokeInvite' then
      delete from petcircle_private.invites i where i.circle_id = circle and i.id = petcircle_private.identifier(action ->> 'id');

    when 'revokeMember' then
      notify_user := (action ->> 'id')::uuid;
      delete from petcircle_private.members m where m.circle_id = circle and m.user_id = notify_user and m.role <> 'owner'
        returning m.user_id into notify_user;

    else
      raise exception 'This care action is unavailable.' using errcode = '22023';
  end case;

  perform petcircle_private.notify(circle, notify_user);
end;
$$;

-- Public RPCs are invoker wrappers. The private implementations validate the
-- signed-in user and execute with the database owner's privileges.
create function public.petcircle_create(circle_name text, display_name text) returns uuid
language sql set search_path = '' as $$
  select petcircle_private.create_circle(circle_name, display_name);
$$;

create function public.petcircle_join(invite_code text, display_name text) returns uuid
language sql set search_path = '' as $$
  select petcircle_private.join_circle(invite_code, display_name);
$$;

create function public.petcircle_load() returns jsonb
language sql stable set search_path = '' as $$
  select petcircle_private.load_circles();
$$;

create function public.petcircle_apply(circle uuid, action jsonb) returns void
language sql set search_path = '' as $$
  select petcircle_private.apply_action(circle, action);
$$;

revoke execute on all functions in schema petcircle_private from public, anon, authenticated;
revoke execute on function public.petcircle_create(text, text), public.petcircle_join(text, text),
  public.petcircle_load(), public.petcircle_apply(uuid, jsonb) from public, anon, authenticated;
grant execute on function petcircle_private.create_circle(text, text), petcircle_private.join_circle(text, text),
  petcircle_private.load_circles(), petcircle_private.apply_action(uuid, jsonb) to authenticated;
grant execute on function public.petcircle_create(text, text), public.petcircle_join(text, text),
  public.petcircle_load(), public.petcircle_apply(uuid, jsonb) to authenticated;
