-- =====================================================================
-- Quest Board — initial schema
-- Run this once in your Supabase project (SQL Editor → paste → run).
-- Idempotent where reasonable; safe to re-run after edits to functions.
-- =====================================================================

-- Extensions
create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin
  create type member_role as enum ('parent', 'hero');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quest_status as enum ('available', 'submitted', 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recurrence as enum ('daily', 'weekly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default substring(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamptz default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null,
  display_name text not null,
  avatar text default '🦄',
  created_at timestamptz default now(),
  unique (household_id, user_id)
);
create index if not exists idx_members_user on household_members(user_id);
create index if not exists idx_members_household on household_members(household_id);

create table if not exists heroes (
  member_id uuid primary key references household_members(id) on delete cascade,
  level integer not null default 1,
  xp integer not null default 0,
  gold integer not null default 0,
  money numeric(10,2) not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  total_completed integer not null default 0,
  last_active_date date,
  achievements_unlocked text[] not null default array[]::text[]
);

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  hero_member_id uuid references household_members(id) on delete set null,
  title text not null,
  description text default '',
  icon text default '⭐',
  category text default 'Other',
  xp integer not null default 10,
  gold integer not null default 5,
  money numeric(10,2) not null default 0,
  recurring recurrence,
  due_date date,
  status quest_status not null default 'available',
  last_completed timestamptz,
  completed_at timestamptz,
  approved_at timestamptz,
  proof_note text default '',
  parent_note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_quests_household on quests(household_id);
create index if not exists idx_quests_hero on quests(hero_member_id);
create index if not exists idx_quests_status on quests(status);

create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  description text default '',
  icon text default '🎁',
  cost integer not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_shop_household on shop_items(household_id);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  hero_member_id uuid not null references household_members(id) on delete cascade,
  shop_item_id uuid references shop_items(id) on delete set null,
  name text not null,
  icon text not null,
  cost integer not null,
  status purchase_status not null default 'pending',
  purchased_at timestamptz default now(),
  approved_at timestamptz
);
create index if not exists idx_purchases_household on purchases(household_id);
create index if not exists idx_purchases_status on purchases(status);

create table if not exists history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  hero_member_id uuid not null references household_members(id) on delete cascade,
  type text not null check (type in ('quest', 'purchase')),
  title text not null,
  icon text default '✨',
  xp integer default 0,
  gold integer default 0,
  money numeric(10,2) default 0,
  cost integer default 0,
  approved_at timestamptz default now()
);
create index if not exists idx_history_household on history(household_id);
create index if not exists idx_history_hero on history(hero_member_id);

-- ---------- Helper functions (security definer; bypass RLS) ----------
create or replace function is_household_member(hid uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function is_household_parent(hid uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid() and role = 'parent'
  );
$$;

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists quests_updated_at on quests;
create trigger quests_updated_at before update on quests
  for each row execute function set_updated_at();

-- ---------- RLS ----------
alter table households enable row level security;
alter table household_members enable row level security;
alter table heroes enable row level security;
alter table quests enable row level security;
alter table shop_items enable row level security;
alter table purchases enable row level security;
alter table history enable row level security;

-- households
drop policy if exists "members see their households" on households;
create policy "members see their households"
  on households for select using (is_household_member(id));

drop policy if exists "parents update household" on households;
create policy "parents update household"
  on households for update using (is_household_parent(id));

-- household_members
drop policy if exists "members see fellow members" on household_members;
create policy "members see fellow members"
  on household_members for select using (is_household_member(household_id));

drop policy if exists "parents update members" on household_members;
create policy "parents update members"
  on household_members for update using (is_household_parent(household_id));

drop policy if exists "self-update display profile" on household_members;
create policy "self-update display profile"
  on household_members for update using (user_id = auth.uid());

drop policy if exists "leave or kick" on household_members;
create policy "leave or kick"
  on household_members for delete using (
    is_household_parent(household_id) or user_id = auth.uid()
  );

-- heroes
drop policy if exists "members see heroes" on heroes;
create policy "members see heroes"
  on heroes for select using (
    exists (select 1 from household_members hm
            where hm.id = heroes.member_id and is_household_member(hm.household_id))
  );

drop policy if exists "hero updates own row" on heroes;
create policy "hero updates own row"
  on heroes for update using (
    exists (select 1 from household_members hm
            where hm.id = heroes.member_id and hm.user_id = auth.uid())
  );

-- quests
drop policy if exists "members see quests" on quests;
create policy "members see quests"
  on quests for select using (is_household_member(household_id));

drop policy if exists "parents manage quests" on quests;
create policy "parents manage quests"
  on quests for all using (is_household_parent(household_id))
  with check (is_household_parent(household_id));

-- (submission/approval go through RPCs; no direct hero update policy)

-- shop_items
drop policy if exists "members see shop" on shop_items;
create policy "members see shop"
  on shop_items for select using (is_household_member(household_id));

drop policy if exists "parents manage shop" on shop_items;
create policy "parents manage shop"
  on shop_items for all using (is_household_parent(household_id))
  with check (is_household_parent(household_id));

-- purchases
drop policy if exists "members see purchases" on purchases;
create policy "members see purchases"
  on purchases for select using (is_household_member(household_id));

-- (purchases created/updated through RPCs)

-- history
drop policy if exists "members see history" on history;
create policy "members see history"
  on history for select using (is_household_member(household_id));

-- ---------- RPCs ----------
create or replace function create_household(name text, display_name text, avatar text default '👤')
returns table (household_id uuid, member_id uuid, invite_code text)
language plpgsql security definer set search_path = public
as $$
declare new_h uuid; new_m uuid; new_code text;
begin
  if auth.uid() is null then raise exception 'must be authenticated'; end if;
  insert into households (name) values (create_household.name)
    returning id, households.invite_code into new_h, new_code;
  insert into household_members (household_id, user_id, role, display_name, avatar)
    values (new_h, auth.uid(), 'parent', create_household.display_name, create_household.avatar)
    returning id into new_m;
  household_id := new_h; member_id := new_m; invite_code := new_code;
  return next;
end $$;

create or replace function join_household(code text, role member_role, display_name text, avatar text default '🦄')
returns table (household_id uuid, member_id uuid)
language plpgsql security definer set search_path = public
as $$
declare found_h uuid; new_m uuid;
begin
  if auth.uid() is null then raise exception 'must be authenticated'; end if;
  select id into found_h from households where households.invite_code = join_household.code;
  if found_h is null then raise exception 'invalid invite code'; end if;
  select id into new_m from household_members
    where household_id = found_h and user_id = auth.uid();
  if new_m is null then
    insert into household_members (household_id, user_id, role, display_name, avatar)
      values (found_h, auth.uid(), join_household.role, join_household.display_name, join_household.avatar)
      returning id into new_m;
    if join_household.role = 'hero' then
      insert into heroes (member_id) values (new_m);
    end if;
  end if;
  household_id := found_h; member_id := new_m;
  return next;
end $$;

create or replace function add_hero_record(p_member_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from heroes where member_id = p_member_id) then
    insert into heroes (member_id) values (p_member_id);
  end if;
end $$;

create or replace function submit_quest(quest_id uuid, proof_note text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare q record; allowed boolean;
begin
  select * into q from quests where id = quest_id;
  if not found then raise exception 'quest not found'; end if;
  select exists(select 1 from household_members hm
                where hm.id = q.hero_member_id and hm.user_id = auth.uid()) into allowed;
  if not allowed then raise exception 'not authorized'; end if;
  update quests set
    status = 'submitted',
    completed_at = now(),
    proof_note = submit_quest.proof_note
  where id = quest_id;
end $$;

create or replace function approve_quest(quest_id uuid, parent_note text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  q record; h record;
  new_xp int; new_level int; needed int;
  new_streak int; new_best int;
  today_d date := current_date;
begin
  select * into q from quests where id = quest_id;
  if not found then raise exception 'quest not found'; end if;
  if not is_household_parent(q.household_id) then raise exception 'not authorized'; end if;
  if q.hero_member_id is null then raise exception 'quest has no assigned hero'; end if;
  select * into h from heroes where member_id = q.hero_member_id;
  if not found then raise exception 'hero record missing'; end if;

  new_xp := h.xp + coalesce(q.xp, 0);
  new_level := h.level;
  needed := new_level * 100;
  while new_xp >= needed loop
    new_xp := new_xp - needed;
    new_level := new_level + 1;
    needed := new_level * 100;
  end loop;

  if h.last_active_date is null then
    new_streak := 1;
  elsif h.last_active_date = today_d then
    new_streak := h.streak;
  elsif h.last_active_date = today_d - 1 then
    new_streak := h.streak + 1;
  else
    new_streak := 1;
  end if;
  new_best := greatest(h.best_streak, new_streak);

  update heroes set
    xp = new_xp,
    level = new_level,
    gold = gold + coalesce(q.gold, 0),
    money = money + coalesce(q.money, 0),
    total_completed = total_completed + 1,
    streak = new_streak,
    best_streak = new_best,
    last_active_date = today_d
  where member_id = q.hero_member_id;

  if q.recurring is not null then
    update quests set
      status = 'available',
      last_completed = now(),
      approved_at = now(),
      completed_at = null,
      proof_note = '',
      parent_note = approve_quest.parent_note
    where id = quest_id;
  else
    update quests set
      status = 'approved',
      approved_at = now(),
      parent_note = approve_quest.parent_note
    where id = quest_id;
  end if;

  insert into history (household_id, hero_member_id, type, title, icon, xp, gold, money)
    values (q.household_id, q.hero_member_id, 'quest', q.title, q.icon, q.xp, q.gold, q.money);
end $$;

create or replace function reject_quest(quest_id uuid, parent_note text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare q record;
begin
  select * into q from quests where id = quest_id;
  if not found then raise exception 'quest not found'; end if;
  if not is_household_parent(q.household_id) then raise exception 'not authorized'; end if;
  update quests set
    status = 'available',
    completed_at = null,
    proof_note = '',
    parent_note = reject_quest.parent_note
  where id = quest_id;
end $$;

create or replace function purchase_shop_item(item_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  item record; hero_m_id uuid; hero_gold int; pid uuid;
begin
  select * into item from shop_items where id = item_id;
  if not found then raise exception 'item not found'; end if;
  select hm.id, h.gold into hero_m_id, hero_gold
    from household_members hm
    join heroes h on h.member_id = hm.id
    where hm.user_id = auth.uid()
      and hm.household_id = item.household_id
      and hm.role = 'hero';
  if hero_m_id is null then raise exception 'no hero account in this household'; end if;
  if hero_gold < item.cost then raise exception 'not enough gold'; end if;
  update heroes set gold = gold - item.cost where member_id = hero_m_id;
  insert into purchases (household_id, hero_member_id, shop_item_id, name, icon, cost)
    values (item.household_id, hero_m_id, item.id, item.name, item.icon, item.cost)
    returning id into pid;
  return pid;
end $$;

create or replace function approve_purchase(purchase_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare p record;
begin
  select * into p from purchases where id = purchase_id;
  if not found then raise exception 'purchase not found'; end if;
  if not is_household_parent(p.household_id) then raise exception 'not authorized'; end if;
  if p.status <> 'pending' then return; end if;
  update purchases set status = 'approved', approved_at = now() where id = purchase_id;
  insert into history (household_id, hero_member_id, type, title, icon, cost)
    values (p.household_id, p.hero_member_id, 'purchase', 'Redeemed: ' || p.name, p.icon, p.cost);
end $$;

create or replace function reject_purchase(purchase_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare p record;
begin
  select * into p from purchases where id = purchase_id;
  if not found then raise exception 'purchase not found'; end if;
  if not is_household_parent(p.household_id) then raise exception 'not authorized'; end if;
  if p.status <> 'pending' then return; end if;
  update heroes set gold = gold + p.cost where member_id = p.hero_member_id;
  update purchases set status = 'rejected' where id = purchase_id;
end $$;

create or replace function unlock_achievement(p_member_id uuid, ach text)
returns void
language plpgsql security definer set search_path = public
as $$
declare hm record;
begin
  select * into hm from household_members where id = p_member_id;
  if not found then raise exception 'member not found'; end if;
  if hm.user_id <> auth.uid() and not is_household_parent(hm.household_id) then
    raise exception 'not authorized';
  end if;
  update heroes
    set achievements_unlocked = array(select distinct unnest(achievements_unlocked || array[ach]))
    where member_id = p_member_id;
end $$;

-- ---------- Seed (called by parent after household creation, optional) ----------
create or replace function seed_starter_data(p_household_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare hero_id uuid;
begin
  if not is_household_parent(p_household_id) then
    raise exception 'only parents can seed';
  end if;
  select id into hero_id from household_members
    where household_id = p_household_id and role = 'hero'
    order by created_at limit 1;

  insert into quests (household_id, hero_member_id, title, icon, category, xp, gold, money, recurring) values
    (p_household_id, hero_id, 'Make bed', '🛏️', 'Self Care', 10, 3, 0, 'daily'),
    (p_household_id, hero_id, 'Brush teeth (morning + night)', '🦷', 'Self Care', 5, 2, 0, 'daily'),
    (p_household_id, hero_id, 'Homework done', '📚', 'School', 25, 10, 0.5, 'daily'),
    (p_household_id, hero_id, 'Read for 20 minutes', '📖', 'Reading', 15, 5, 0, 'daily'),
    (p_household_id, hero_id, 'Practice instrument', '🎵', 'Music', 20, 8, 0, 'daily'),
    (p_household_id, hero_id, 'Tidy room', '🧹', 'Chores', 15, 6, 0, 'weekly'),
    (p_household_id, hero_id, 'Help with dishes', '🍳', 'Chores', 10, 5, 0, 'daily'),
    (p_household_id, hero_id, 'Feed pet', '🐶', 'Pets', 8, 3, 0, 'daily'),
    (p_household_id, hero_id, '30 min of exercise', '🏃‍♀️', 'Sports', 15, 5, 0, 'daily');

  insert into shop_items (household_id, name, icon, cost) values
    (p_household_id, '30 min extra screen time', '📱', 30),
    (p_household_id, 'Pick the family movie', '📺', 50),
    (p_household_id, 'Ice cream trip', '🍦', 75),
    (p_household_id, 'Stay up 30 min late', '🌙', 60),
    (p_household_id, 'Friend sleepover', '🛏️', 200),
    (p_household_id, 'Small treat / candy', '🍪', 20);
end $$;

-- ---------- Realtime ----------
-- Enable realtime on tables we want to subscribe to.
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'quests';
  if not found then alter publication supabase_realtime add table quests; end if;
end $$;
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'purchases';
  if not found then alter publication supabase_realtime add table purchases; end if;
end $$;
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'heroes';
  if not found then alter publication supabase_realtime add table heroes; end if;
end $$;
