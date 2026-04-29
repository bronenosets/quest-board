-- =====================================================================
-- Push notifications + time-extension requests
-- Adds:
--   - push_subscriptions  (one row per device-per-user)
--   - extension_requests  (hero asks for more time on a quest)
--   - sent_reminders      (dedupe log for cron-driven deadline reminders)
--   - RPCs for the above flows
-- =====================================================================

-- ---------- Push subscriptions ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text default '',
  created_at timestamptz default now(),
  unique (member_id, endpoint)
);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);
create index if not exists idx_push_subs_member on push_subscriptions(member_id);

alter table push_subscriptions enable row level security;

drop policy if exists "users see own subs" on push_subscriptions;
create policy "users see own subs"
  on push_subscriptions for select using (user_id = auth.uid());

drop policy if exists "users insert own subs" on push_subscriptions;
create policy "users insert own subs"
  on push_subscriptions for insert with check (user_id = auth.uid());

drop policy if exists "users delete own subs" on push_subscriptions;
create policy "users delete own subs"
  on push_subscriptions for delete using (user_id = auth.uid());

-- ---------- Extension requests ----------
do $$ begin
  create type extension_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists extension_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  hero_member_id uuid not null references household_members(id) on delete cascade,
  extend_minutes int not null,
  reason text default '',
  status extension_status not null default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz
);
create index if not exists idx_ext_req_household on extension_requests(household_id);
create index if not exists idx_ext_req_quest on extension_requests(quest_id);
create index if not exists idx_ext_req_status on extension_requests(status);

alter table extension_requests enable row level security;

drop policy if exists "members see extension requests" on extension_requests;
create policy "members see extension requests"
  on extension_requests for select using (is_household_member(household_id));

-- ---------- Sent reminders (dedupe log) ----------
create table if not exists sent_reminders (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  threshold_minutes int not null,  -- 1440 (24h), 240 (4h), 60 (1h)
  due_at timestamptz not null,     -- snapshot of due_at at time of send
  sent_at timestamptz default now(),
  unique (quest_id, threshold_minutes, due_at)
);
create index if not exists idx_sent_reminders_quest on sent_reminders(quest_id);

-- (no RLS — only accessed via service role from cron)

-- ---------- RPC: request time extension ----------
create or replace function request_extension(quest_id uuid, extend_minutes int, reason text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  q record;
  my_member_id uuid;
  req_id uuid;
begin
  select * into q from quests where id = quest_id;
  if not found then raise exception 'quest not found'; end if;

  select hm.id into my_member_id
    from household_members hm
    where hm.user_id = auth.uid()
      and hm.household_id = q.household_id
      and hm.role = 'hero';
  if my_member_id is null then raise exception 'not authorized'; end if;
  if q.hero_member_id is not null and q.hero_member_id <> my_member_id then
    raise exception 'not authorized';
  end if;
  if extend_minutes <= 0 or extend_minutes > 60 * 24 * 7 then
    raise exception 'invalid extension amount';
  end if;

  insert into extension_requests (household_id, quest_id, hero_member_id, extend_minutes, reason)
    values (q.household_id, quest_id, my_member_id, extend_minutes, request_extension.reason)
    returning id into req_id;
  return req_id;
end $$;

-- ---------- RPC: approve extension ----------
create or replace function approve_extension(request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare r record; q record;
begin
  select * into r from extension_requests where id = request_id;
  if not found then raise exception 'request not found'; end if;
  if not is_household_parent(r.household_id) then raise exception 'not authorized'; end if;
  if r.status <> 'pending' then return; end if;

  select * into q from quests where id = r.quest_id;
  if not found then raise exception 'quest not found'; end if;

  -- Push due_at forward by the requested minutes (or set from now if missing)
  update quests
    set due_at = coalesce(due_at, now()) + (r.extend_minutes || ' minutes')::interval
    where id = r.quest_id;

  -- If the quest had already been auto-penalized but is recurring, allow another try
  -- (existing recurring-reset logic remains unchanged)

  update extension_requests
    set status = 'approved', resolved_at = now()
    where id = request_id;

  -- Wipe any sent_reminders for thresholds that may now be in the future again
  delete from sent_reminders
    where quest_id = r.quest_id;
end $$;

-- ---------- RPC: reject extension ----------
create or replace function reject_extension(request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  select * into r from extension_requests where id = request_id;
  if not found then raise exception 'request not found'; end if;
  if not is_household_parent(r.household_id) then raise exception 'not authorized'; end if;
  if r.status <> 'pending' then return; end if;
  update extension_requests
    set status = 'rejected', resolved_at = now()
    where id = request_id;
end $$;

-- ---------- Realtime: extension_requests ----------
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'extension_requests';
  if not found then alter publication supabase_realtime add table extension_requests; end if;
end $$;
