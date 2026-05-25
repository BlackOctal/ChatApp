-- ============================================================
-- FULL DATABASE RESET + REBUILD
-- ============================================================
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query
-- Steps:
--   1. Go to supabase.com → your project → SQL Editor → New query
--   2. Paste this entire file
--   3. Click Run
-- WARNING: Deletes ALL chat data. Auth user accounts are kept.
-- After running, re-open the app and log in — your profile
-- will be recreated automatically.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- STEP 1 — DROP EVERYTHING
-- ════════════════════════════════════════════════════════════

-- Auth trigger must be dropped before the function it calls
drop trigger if exists on_auth_user_created on auth.users;

-- Views
drop view if exists public.conversation_list cascade;

-- Tables (leaf → root order so CASCADE is cleaner)
drop table if exists public.typing_indicators        cascade;
drop table if exists public.notifications            cascade;
drop table if exists public.call_participants        cascade;
drop table if exists public.calls                   cascade;
drop table if exists public.attachments             cascade;
drop table if exists public.message_reads           cascade;
drop table if exists public.messages                cascade;
drop table if exists public.group_members           cascade;
drop table if exists public.groups                  cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations           cascade;
drop table if exists public.users                   cascade;

-- Functions (CASCADE drops dependent triggers automatically)
drop function if exists public.handle_new_user()                       cascade;
drop function if exists public.update_conversation_timestamp()         cascade;
drop function if exists public.get_or_create_direct_conversation(uuid) cascade;
drop function if exists public.expire_old_media()                      cascade;
drop function if exists public.is_conversation_participant(uuid)       cascade;
drop function if exists public.update_updated_at_column()              cascade;
drop function if exists public.upsert_my_profile(text,text,text,text)  cascade;


-- ════════════════════════════════════════════════════════════
-- STEP 2 — EXTENSIONS
-- ════════════════════════════════════════════════════════════
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";


-- ════════════════════════════════════════════════════════════
-- STEP 3 — TABLES
-- ════════════════════════════════════════════════════════════

-- ── USERS ────────────────────────────────────────────────────
create table public.users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null unique,
  username    text        not null unique,
  full_name   text        not null,
  avatar_url  text,
  about       text        default 'Hey there! I am using ChatApp.',
  presence    text        not null default 'offline'
                            check (presence in ('online','offline','away')),
  last_seen   timestamptz not null default now(),
  fcm_token   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index users_username_trgm  on public.users using gin (username  gin_trgm_ops);
create index users_full_name_trgm on public.users using gin (full_name gin_trgm_ops);

-- ── CONVERSATIONS ─────────────────────────────────────────────
-- group_id FK added after groups table is created (circular ref)
create table public.conversations (
  id              uuid        primary key default uuid_generate_v4(),
  type            text        not null check (type in ('direct','group')),
  group_id        uuid,
  created_by      uuid        not null references public.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz
);

create index conversations_last_message_at
  on public.conversations (last_message_at desc nulls last);

-- ── CONVERSATION PARTICIPANTS ─────────────────────────────────
create table public.conversation_participants (
  id              uuid        primary key default uuid_generate_v4(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  is_admin        boolean     not null default false,
  muted_until     timestamptz,
  unique (conversation_id, user_id)
);

create index cp_user_id         on public.conversation_participants (user_id);
create index cp_conversation_id on public.conversation_participants (conversation_id);

-- ── GROUPS ────────────────────────────────────────────────────
create table public.groups (
  id              uuid        primary key default uuid_generate_v4(),
  name            text        not null,
  description     text,
  image_url       text,
  created_by      uuid        not null references public.users(id) on delete cascade,
  conversation_id uuid        references public.conversations(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index groups_name_trgm on public.groups using gin (name gin_trgm_ops);

-- Resolve circular FK: conversations ↔ groups
alter table public.conversations
  add constraint fk_conversations_group
  foreign key (group_id) references public.groups(id) on delete cascade;

-- ── GROUP MEMBERS ─────────────────────────────────────────────
create table public.group_members (
  id          uuid        primary key default uuid_generate_v4(),
  group_id    uuid        not null references public.groups(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  is_admin    boolean     not null default false,
  joined_at   timestamptz not null default now(),
  added_by    uuid        not null references public.users(id) on delete cascade,
  unique (group_id, user_id)
);

create index gm_group_id on public.group_members (group_id);
create index gm_user_id  on public.group_members (user_id);

-- ── MESSAGES ──────────────────────────────────────────────────
create table public.messages (
  id                   uuid        primary key default uuid_generate_v4(),
  conversation_id      uuid        not null references public.conversations(id) on delete cascade,
  sender_id            uuid        not null references public.users(id) on delete cascade,
  content              text,
  type                 text        not null default 'text'
                         check (type in ('text','image','video','audio','voice','file','link','system')),
  reply_to_id          uuid        references public.messages(id) on delete set null,
  metadata             jsonb,
  deleted_for_everyone boolean     not null default false,
  deleted_for_sender   boolean     not null default false,
  is_pinned            boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index messages_conversation_id on public.messages (conversation_id, created_at desc);
create index messages_sender_id       on public.messages (sender_id);
create index messages_content_trgm    on public.messages using gin (content gin_trgm_ops)
  where content is not null and deleted_for_everyone = false;

-- ── MESSAGE READS ─────────────────────────────────────────────
create table public.message_reads (
  message_id  uuid        not null references public.messages(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  read_at     timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index mr_user_id on public.message_reads (user_id);

-- ── ATTACHMENTS ───────────────────────────────────────────────
create table public.attachments (
  id               uuid        primary key default uuid_generate_v4(),
  message_id       uuid        not null references public.messages(id) on delete cascade,
  storage_path     text        not null,
  preview_path     text,
  mime_type        text        not null,
  file_name        text        not null,
  file_size        bigint      not null,
  width            int,
  height           int,
  duration_seconds float,
  status           text        not null default 'active'
                     check (status in ('active','expired')),
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now()
);

create index attachments_expires_at
  on public.attachments (expires_at) where status = 'active';

-- ── CALLS ─────────────────────────────────────────────────────
create table public.calls (
  id               uuid        primary key default uuid_generate_v4(),
  type             text        not null check (type in ('voice','video')),
  conversation_id  uuid        not null references public.conversations(id) on delete cascade,
  initiator_id     uuid        not null references public.users(id) on delete cascade,
  status           text        not null default 'ringing'
                     check (status in ('ringing','active','ended','missed','rejected')),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds int,
  created_at       timestamptz not null default now()
);

create index calls_conversation_id on public.calls (conversation_id, started_at desc);

-- ── CALL PARTICIPANTS ─────────────────────────────────────────
create table public.call_participants (
  id        uuid        primary key default uuid_generate_v4(),
  call_id   uuid        not null references public.calls(id) on delete cascade,
  user_id   uuid        not null references public.users(id) on delete cascade,
  joined_at timestamptz,
  left_at   timestamptz,
  is_muted  boolean     not null default false,
  unique (call_id, user_id)
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
create table public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  type       text        not null
               check (type in ('message','call','mention','group_invite')),
  title      text        not null,
  body       text        not null,
  data       jsonb,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id on public.notifications (user_id, created_at desc);

-- ── TYPING INDICATORS ─────────────────────────────────────────
create table public.typing_indicators (
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,
  started_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);


-- ════════════════════════════════════════════════════════════
-- STEP 4 — VIEW
-- ════════════════════════════════════════════════════════════
create view public.conversation_list as
select
  c.id,
  c.type,
  c.group_id,
  c.created_by,
  c.created_at,
  c.updated_at,
  c.last_message_at,
  cp.user_id      as participant_user_id,
  cp.last_read_at,
  cp.is_admin,
  cp.muted_until,
  (
    select count(*) from messages m
    where m.conversation_id = c.id
      and m.created_at > coalesce(cp.last_read_at, '1970-01-01')
      and m.sender_id    != cp.user_id
      and m.deleted_for_everyone = false
  ) as unread_count,
  (
    select row_to_json(m.*) from messages m
    where m.conversation_id = c.id
      and m.deleted_for_everyone = false
    order by m.created_at desc
    limit 1
  ) as last_message
from conversations c
join conversation_participants cp on cp.conversation_id = c.id;


-- ════════════════════════════════════════════════════════════
-- STEP 5 — FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════

-- updated_at helper
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at_column();

create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.update_updated_at_column();

create trigger messages_updated_at
  before update on public.messages
  for each row execute function public.update_updated_at_column();

-- Auto-create public.users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
begin
  uname := lower(split_part(new.email, '@', 1));
  -- Ensure username is unique
  if exists (select 1 from public.users where username = uname) then
    uname := uname || '_' || substr(new.id::text, 1, 6);
  end if;
  insert into public.users (id, email, username, full_name, avatar_url)
  values (
    new.id,
    new.email,
    uname,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      uname
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update conversation.last_message_at when a message is sent
create or replace function public.update_conversation_timestamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at      = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.update_conversation_timestamp();

-- Get or create a direct conversation between two users
create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  conv_id uuid;
  me      uuid := auth.uid();
begin
  select c.id into conv_id
  from conversations c
  join conversation_participants cp1 on cp1.conversation_id = c.id and cp1.user_id = me
  join conversation_participants cp2 on cp2.conversation_id = c.id and cp2.user_id = other_user_id
  where c.type = 'direct'
  limit 1;

  if conv_id is null then
    insert into conversations (type, created_by)
    values ('direct', me)
    returning id into conv_id;

    insert into conversation_participants (conversation_id, user_id)
    values (conv_id, me), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$;

-- Mark old attachment records as expired
create or replace function public.expire_old_media()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.attachments
  set status = 'expired'
  where status = 'active' and expires_at < now();
end;
$$;

-- RLS helper — runs as postgres (security definer) to avoid
-- recursive policy evaluation when checking participation.
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
  );
$$;

-- Called by the client on every login to ensure a profile row exists.
-- Runs as postgres (security definer) so no INSERT RLS policy is needed.
create or replace function public.upsert_my_profile(
  p_email     text,
  p_username  text,
  p_full_name text,
  p_avatar    text default null
)
returns public.users
language plpgsql security definer set search_path = public as $$
declare
  uname  text := p_username;
  result public.users;
begin
  -- Unique username if taken by someone else
  if exists (select 1 from public.users where username = uname and id <> auth.uid()) then
    uname := uname || '_' || substr(auth.uid()::text, 1, 6);
  end if;

  insert into public.users (id, email, username, full_name, avatar_url)
  values (auth.uid(), p_email, uname, p_full_name, p_avatar)
  on conflict (id) do nothing;

  select * into result from public.users where id = auth.uid();
  return result;
end;
$$;


-- ════════════════════════════════════════════════════════════
-- STEP 6 — GRANTS
-- ════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated, service_role;
grant all on public.users                     to authenticated, service_role;
grant select, insert, update, delete on public.conversations             to authenticated;
grant select, insert, update, delete on public.conversation_participants to authenticated;
grant select, insert, update, delete on public.groups                    to authenticated;
grant select, insert, update, delete on public.group_members             to authenticated;
grant select, insert, update, delete on public.messages                  to authenticated;
grant select, insert, update, delete on public.message_reads             to authenticated;
grant select, insert, update, delete on public.attachments               to authenticated;
grant select, insert, update, delete on public.calls                     to authenticated;
grant select, insert, update, delete on public.call_participants         to authenticated;
grant select, insert, update, delete on public.notifications             to authenticated;
grant select, insert, update, delete on public.typing_indicators         to authenticated;
grant execute on function public.upsert_my_profile(text,text,text,text)  to authenticated;
grant execute on function public.is_conversation_participant(uuid)        to authenticated;


-- ════════════════════════════════════════════════════════════
-- STEP 7 — ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
alter table public.users                     enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.groups                    enable row level security;
alter table public.group_members             enable row level security;
alter table public.messages                  enable row level security;
alter table public.message_reads             enable row level security;
alter table public.attachments               enable row level security;
alter table public.calls                     enable row level security;
alter table public.call_participants         enable row level security;
alter table public.notifications             enable row level security;
alter table public.typing_indicators         enable row level security;

-- USERS
create policy "users_select" on public.users
  for select to authenticated using (true);

create policy "users_insert" on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy "users_update" on public.users
  for update to authenticated using (id = auth.uid());

-- CONVERSATIONS
-- KEY: creator can read immediately after INSERT, before being
-- added to conversation_participants (fixes 403 on group creation).
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (
    created_by = auth.uid()
    or is_conversation_participant(id)
  );

create policy "conversations_insert" on public.conversations
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "conversations_update" on public.conversations
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = id
        and cp.user_id = auth.uid()
        and cp.is_admin = true
    )
  );

-- CONVERSATION PARTICIPANTS
-- Short-circuit own rows first to avoid any recursion risk.
create policy "cp_select" on public.conversation_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_conversation_participant(conversation_id)
  );

-- Conversation creator can insert all participant rows during setup.
create policy "cp_insert" on public.conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from conversation_participants admins
      where admins.conversation_id = conversation_participants.conversation_id
        and admins.user_id = auth.uid()
        and admins.is_admin = true
    )
    or exists (
      select 1 from conversations c
      where c.id = conversation_participants.conversation_id
        and c.created_by = auth.uid()
    )
  );

create policy "cp_update" on public.conversation_participants
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from conversation_participants admins
      where admins.conversation_id = conversation_id
        and admins.user_id = auth.uid()
        and admins.is_admin = true
    )
  );

-- GROUPS
create policy "groups_select" on public.groups
  for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from group_members
      where group_id = id and user_id = auth.uid()
    )
  );

create policy "groups_insert" on public.groups
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "groups_update" on public.groups
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from group_members
      where group_id = id and user_id = auth.uid() and is_admin = true
    )
  );

-- GROUP MEMBERS
create policy "gm_select" on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members gm2
      where gm2.group_id = group_id and gm2.user_id = auth.uid()
    )
  );

create policy "gm_insert" on public.group_members
  for insert to authenticated
  with check (
    added_by = auth.uid()
    and (
      exists (
        select 1 from groups g
        where g.id = group_id and g.created_by = auth.uid()
      )
      or exists (
        select 1 from group_members admins
        where admins.group_id    = group_id
          and admins.user_id    = auth.uid()
          and admins.is_admin   = true
      )
    )
  );

create policy "gm_delete" on public.group_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members admins
      where admins.group_id  = group_id
        and admins.user_id  = auth.uid()
        and admins.is_admin = true
    )
  );

-- MESSAGES
create policy "messages_select" on public.messages
  for select to authenticated
  using (is_conversation_participant(conversation_id));

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_conversation_participant(conversation_id)
  );

create policy "messages_update" on public.messages
  for update to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_id
        and cp.user_id = auth.uid()
        and cp.is_admin = true
    )
  );

-- MESSAGE READS
create policy "mr_select" on public.message_reads
  for select to authenticated
  using (
    exists (
      select 1 from messages m
      where m.id = message_id
        and is_conversation_participant(m.conversation_id)
    )
  );

create policy "mr_insert" on public.message_reads
  for insert to authenticated
  with check (user_id = auth.uid());

-- ATTACHMENTS
create policy "attachments_select" on public.attachments
  for select to authenticated
  using (
    exists (
      select 1 from messages m
      where m.id = message_id
        and is_conversation_participant(m.conversation_id)
    )
  );

create policy "attachments_insert" on public.attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  );

-- CALLS
create policy "calls_select" on public.calls
  for select to authenticated
  using (is_conversation_participant(conversation_id));

create policy "calls_insert" on public.calls
  for insert to authenticated
  with check (
    initiator_id = auth.uid()
    and is_conversation_participant(conversation_id)
  );

create policy "calls_update" on public.calls
  for update to authenticated
  using (is_conversation_participant(conversation_id));

-- CALL PARTICIPANTS
create policy "callp_select" on public.call_participants
  for select to authenticated
  using (
    exists (
      select 1 from calls c
      where c.id = call_id
        and is_conversation_participant(c.conversation_id)
    )
  );

create policy "callp_insert" on public.call_participants
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "callp_update" on public.call_participants
  for update to authenticated
  using (user_id = auth.uid());

-- NOTIFICATIONS
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update to authenticated using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);

-- TYPING INDICATORS
create policy "typing_select" on public.typing_indicators
  for select to authenticated
  using (is_conversation_participant(conversation_id));

create policy "typing_insert" on public.typing_indicators
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_conversation_participant(conversation_id)
  );

create policy "typing_update" on public.typing_indicators
  for update to authenticated using (user_id = auth.uid());

create policy "typing_delete" on public.typing_indicators
  for delete to authenticated using (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════
-- STEP 8 — REALTIME
-- ════════════════════════════════════════════════════════════
-- REPLICA IDENTITY FULL is required so Supabase Realtime can
-- apply RLS checks on the old row for UPDATE/DELETE events.
-- Without it, events on RLS-enabled tables are silently dropped.
alter table public.conversations            replica identity full;
alter table public.messages                 replica identity full;
alter table public.conversation_participants replica identity full;
alter table public.users                    replica identity full;
alter table public.typing_indicators        replica identity full;
alter table public.calls                    replica identity full;
alter table public.call_participants        replica identity full;
alter table public.message_reads            replica identity full;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.typing_indicators;
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.call_participants;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.conversation_participants;
alter publication supabase_realtime add table public.message_reads;


-- ════════════════════════════════════════════════════════════
-- STEP 9 — STORAGE BUCKETS
-- ════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',      'avatars',      true,  5242880,   array['image/jpeg','image/png','image/webp','image/gif']),
  ('group-images', 'group-images', true,  5242880,   array['image/jpeg','image/png','image/webp']),
  ('media',        'media',        false, 104857600, null)
on conflict (id) do nothing;

-- Storage: avatars (public bucket)
drop policy if exists "Avatars public read"  on storage.objects;
drop policy if exists "Avatars user upload"  on storage.objects;
drop policy if exists "Avatars user update"  on storage.objects;
drop policy if exists "Avatars user delete"  on storage.objects;

create policy "Avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatars user upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars user update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars user delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage: group-images (public bucket)
drop policy if exists "Group images public read" on storage.objects;
drop policy if exists "Group images user upload" on storage.objects;
drop policy if exists "Group images user update" on storage.objects;

create policy "Group images public read"
  on storage.objects for select
  using (bucket_id = 'group-images');

create policy "Group images user upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'group-images');

create policy "Group images user update"
  on storage.objects for update to authenticated
  using (bucket_id = 'group-images');

-- Storage: media (private — voice, images, videos)
drop policy if exists "Media authenticated upload" on storage.objects;
drop policy if exists "Media authenticated read"   on storage.objects;
drop policy if exists "Media owner delete"         on storage.objects;

create policy "Media authenticated upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Media authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'media');

create policy "Media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════
-- STEP 10 — BACKFILL EXISTING AUTH USERS
-- ════════════════════════════════════════════════════════════
-- Creates a profile row for any auth account that doesn't have one.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
insert into public.users (id, email, username, full_name, avatar_url)
select
  au.id,
  au.email,
  lower(split_part(au.email, '@', 1)) || '_' || substr(au.id::text, 1, 8),
  coalesce(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    lower(split_part(au.email, '@', 1))
  ),
  au.raw_user_meta_data->>'avatar_url'
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
on conflict (id) do nothing;
