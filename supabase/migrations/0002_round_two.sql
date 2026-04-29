-- =====================================================================
-- Quest Board — round 2 schema
-- Adds: time-limited tasks, penalties, customizable sections,
--       photo proof, cash-out shop items.
-- Idempotent; safe to re-run.
-- =====================================================================

-- ---------- Sections (customizable per household) ----------
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  icon text default '📁',
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_sections_household on sections(household_id);

alter table sections enable row level security;

drop policy if exists "members see sections" on sections;
create policy "members see sections"
  on sections for select using (is_household_member(household_id));

drop policy if exists "parents manage sections" on sections;
create policy "parents manage sections"
  on sections for all using (is_household_parent(household_id))
  with check (is_household_parent(household_id));

-- ---------- Quests: time-limited, penalties, sections, photo proof ----------
alter table quests add column if not exists section_id uuid references sections(id) on delete set null;
alter table quests add column if not exists due_at timestamptz;
alter table quests add column if not exists penalty_xp integer default 0;
alter table quests add column if not exists penalty_gold integer default 0;
alter table quests add column if not exists penalty_money numeric(10,2) default 0;
alter table quests add column if not exists penalty_mode text default 'manual';
alter table quests add column if not exists penalty_applied boolean default false;
alter table quests add column if not exists proof_url text default '';

do $$ begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where constraint_name = 'quests_penalty_mode_check'
  ) then
    alter table quests add constraint quests_penalty_mode_check
      check (penalty_mode in ('manual', 'auto'));
  end if;
end $$;

create index if not exists idx_quests_due_at on quests(due_at) where due_at is not null;
create index if not exists idx_quests_section on quests(section_id);

-- ---------- Shop items: money_value (for cash-out) ----------
alter table shop_items add column if not exists money_value numeric(10,2) default 0;

-- ---------- Purchases: money_value snapshot ----------
alter table purchases add column if not exists money_value numeric(10,2) default 0;

-- ---------- History: support 'penalty' type, photo proof ----------
alter table history add column if not exists proof_url text default '';

alter table history drop constraint if exists history_type_check;
alter table history add constraint history_type_check
  check (type in ('quest', 'purchase', 'penalty'));

-- ---------- Default sections for existing households ----------
do $$
declare h record;
begin
  for h in select id from households loop
    if not exists (select 1 from sections where household_id = h.id) then
      insert into sections (household_id, name, icon, sort_order) values
        (h.id, 'School', '📚', 1),
        (h.id, 'Home', '🏠', 2);
    end if;
  end loop;
end $$;

-- ---------- Backfill existing quests into Home section ----------
do $$
declare h record; home_id uuid;
begin
  for h in select id from households loop
    select id into home_id from sections
      where household_id = h.id and name = 'Home'
      order by sort_order limit 1;
    if home_id is not null then
      update quests set section_id = home_id
        where household_id = h.id and section_id is null;
    end if;
  end loop;
end $$;

-- ---------- Updated RPC: create_household (also seeds default sections) ----------
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
  insert into sections (household_id, name, icon, sort_order) values
    (new_h, 'School', '📚', 1),
    (new_h, 'Home', '🏠', 2);
  household_id := new_h; member_id := new_m; invite_code := new_code;
  return next;
end $$;

-- ---------- New RPC: submit_quest with optional photo proof ----------
create or replace function submit_quest(quest_id uuid, proof_note text default '', proof_url text default '')
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
    proof_note = submit_quest.proof_note,
    proof_url = submit_quest.proof_url
  where id = quest_id;
end $$;

-- ---------- Updated approve_quest: snapshot proof_url to history ----------
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
      proof_url = '',
      penalty_applied = false,
      parent_note = approve_quest.parent_note
    where id = quest_id;
  else
    update quests set
      status = 'approved',
      approved_at = now(),
      parent_note = approve_quest.parent_note
    where id = quest_id;
  end if;

  insert into history (household_id, hero_member_id, type, title, icon, xp, gold, money, proof_url)
    values (q.household_id, q.hero_member_id, 'quest', q.title, q.icon, q.xp, q.gold, q.money, q.proof_url);
end $$;

-- ---------- New RPC: mark_quest_missed (apply penalty) ----------
create or replace function mark_quest_missed(quest_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare q record;
begin
  select * into q from quests where id = quest_id;
  if not found then raise exception 'quest not found'; end if;
  if not is_household_parent(q.household_id) then raise exception 'not authorized'; end if;
  if q.penalty_applied then return; end if;
  if q.hero_member_id is null then return; end if;

  update heroes set
    xp = greatest(0, xp - coalesce(q.penalty_xp, 0)),
    gold = greatest(0, gold - coalesce(q.penalty_gold, 0)),
    money = greatest(0, money - coalesce(q.penalty_money, 0)),
    streak = 0
  where member_id = q.hero_member_id;

  if q.recurring is not null then
    update quests set
      penalty_applied = true,
      status = 'available',
      last_completed = now(),
      proof_note = '',
      proof_url = '',
      parent_note = 'Missed — penalty applied'
    where id = quest_id;
  else
    update quests set
      penalty_applied = true,
      status = 'approved',
      parent_note = 'Missed — penalty applied'
    where id = quest_id;
  end if;

  insert into history (household_id, hero_member_id, type, title, icon, xp, gold, money)
    values (q.household_id, q.hero_member_id, 'penalty',
            'Missed: ' || q.title, '⚠️',
            -coalesce(q.penalty_xp, 0),
            -coalesce(q.penalty_gold, 0),
            -coalesce(q.penalty_money, 0));
end $$;

-- ---------- Updated purchase_shop_item: snapshot money_value ----------
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
  insert into purchases (household_id, hero_member_id, shop_item_id, name, icon, cost, money_value)
    values (item.household_id, hero_m_id, item.id, item.name, item.icon, item.cost,
            coalesce(item.money_value, 0))
    returning id into pid;
  return pid;
end $$;

-- ---------- Updated approve_purchase: credit money for cash-out items ----------
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

  if coalesce(p.money_value, 0) > 0 then
    update heroes set money = money + p.money_value where member_id = p.hero_member_id;
  end if;

  insert into history (household_id, hero_member_id, type, title, icon, cost, money)
    values (p.household_id, p.hero_member_id, 'purchase',
            case when coalesce(p.money_value, 0) > 0
              then 'Cashed out: ' || p.name
              else 'Redeemed: ' || p.name
            end,
            p.icon, p.cost, coalesce(p.money_value, 0));
end $$;

-- ---------- Sweep: auto-apply penalties on overdue auto-mode quests ----------
-- Call this from a cron (Supabase scheduled function) or anytime data is fetched.
create or replace function sweep_overdue_penalties()
returns void
language plpgsql security definer set search_path = public
as $$
declare q record;
begin
  for q in
    select id from quests
    where penalty_mode = 'auto'
      and penalty_applied = false
      and due_at is not null
      and due_at < now()
      and status in ('available', 'submitted')
      and hero_member_id is not null
  loop
    perform mark_quest_missed(q.id);
  end loop;
end $$;

-- ---------- Storage: bucket for quest proof photos ----------
-- Create the bucket (private; access controlled via RLS)
insert into storage.buckets (id, name, public)
  values ('quest-proofs', 'quest-proofs', false)
  on conflict (id) do nothing;

-- RLS: only members of the household (whose UUID is the first folder segment)
-- can upload or read.
drop policy if exists "members read household quest proofs" on storage.objects;
create policy "members read household quest proofs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'quest-proofs'
    and is_household_member(((string_to_array(name, '/'))[1])::uuid)
  );

drop policy if exists "members upload household quest proofs" on storage.objects;
create policy "members upload household quest proofs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quest-proofs'
    and is_household_member(((string_to_array(name, '/'))[1])::uuid)
  );

drop policy if exists "members delete own quest proofs" on storage.objects;
create policy "members delete own quest proofs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quest-proofs'
    and is_household_member(((string_to_array(name, '/'))[1])::uuid)
  );

-- ---------- Updated seed_starter_data: route quests into School/Home ----------
create or replace function seed_starter_data(p_household_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  hero_id uuid;
  school_id uuid;
  home_id uuid;
begin
  if not is_household_parent(p_household_id) then
    raise exception 'only parents can seed';
  end if;
  select id into hero_id from household_members
    where household_id = p_household_id and role = 'hero'
    order by created_at limit 1;

  select id into school_id from sections
    where household_id = p_household_id and name = 'School' order by sort_order limit 1;
  select id into home_id from sections
    where household_id = p_household_id and name = 'Home' order by sort_order limit 1;

  insert into quests (household_id, hero_member_id, section_id, title, icon, category, xp, gold, money, recurring) values
    (p_household_id, hero_id, home_id,   'Make bed',                       '🛏️', 'Self Care', 10, 3,  0,    'daily'),
    (p_household_id, hero_id, home_id,   'Brush teeth (morning + night)',  '🦷', 'Self Care', 5,  2,  0,    'daily'),
    (p_household_id, hero_id, school_id, 'Homework done',                  '📚', 'School',    25, 10, 0.5,  'daily'),
    (p_household_id, hero_id, school_id, 'Read for 20 minutes',            '📖', 'Reading',   15, 5,  0,    'daily'),
    (p_household_id, hero_id, school_id, 'Practice instrument',            '🎵', 'Music',     20, 8,  0,    'daily'),
    (p_household_id, hero_id, home_id,   'Tidy room',                      '🧹', 'Chores',    15, 6,  0,    'weekly'),
    (p_household_id, hero_id, home_id,   'Help with dishes',               '🍳', 'Chores',    10, 5,  0,    'daily'),
    (p_household_id, hero_id, home_id,   'Feed pet',                       '🐶', 'Pets',      8,  3,  0,    'daily'),
    (p_household_id, hero_id, home_id,   '30 min of exercise',             '🏃‍♀️','Sports',    15, 5,  0,    'daily');

  insert into shop_items (household_id, name, icon, cost) values
    (p_household_id, '30 min extra screen time', '📱', 30),
    (p_household_id, 'Pick the family movie',    '📺', 50),
    (p_household_id, 'Ice cream trip',           '🍦', 75),
    (p_household_id, 'Stay up 30 min late',      '🌙', 60),
    (p_household_id, 'Friend sleepover',         '🛏️', 200),
    (p_household_id, 'Small treat / candy',      '🍪', 20);

  -- Cash-out items: 100 gold = $1
  insert into shop_items (household_id, name, icon, cost, money_value) values
    (p_household_id, 'Cash out: $1',  '💵', 100,  1.00),
    (p_household_id, 'Cash out: $5',  '💵', 500,  5.00),
    (p_household_id, 'Cash out: $10', '💵', 1000, 10.00);
end $$;

-- ---------- Realtime publication: add sections ----------
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sections';
  if not found then alter publication supabase_realtime add table sections; end if;
end $$;
