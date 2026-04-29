-- =====================================================================
-- Quest rewards no longer include money or penalty_money.
-- Money is earned exclusively via cash-out shop items.
--
-- Changes:
--   1. approve_quest stops crediting q.money
--   2. mark_quest_missed stops deducting q.penalty_money
--   3. Backfill: zero out money / penalty_money on all existing quests
--   4. seed_starter_data no longer sets money on quests
--
-- Schema columns are preserved (just kept at 0) so old history rows
-- with money values remain queryable.
-- =====================================================================

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

  -- NOTE: money is intentionally NOT incremented from quest rewards.
  update heroes set
    xp = new_xp,
    level = new_level,
    gold = gold + coalesce(q.gold, 0),
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
    values (q.household_id, q.hero_member_id, 'quest', q.title, q.icon, q.xp, q.gold, 0, q.proof_url);
end $$;

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

  -- NOTE: money is intentionally NOT decremented (quests don't touch money).
  update heroes set
    xp = greatest(0, xp - coalesce(q.penalty_xp, 0)),
    gold = greatest(0, gold - coalesce(q.penalty_gold, 0)),
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
            0);
end $$;

-- ---------- Zero out money / penalty_money on existing quests ----------
update quests set money = 0 where money <> 0;
update quests set penalty_money = 0 where penalty_money <> 0;

-- ---------- Updated seed_starter_data (no money on quests) ----------
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

  insert into quests (household_id, hero_member_id, section_id, title, icon, category, xp, gold, recurring) values
    (p_household_id, hero_id, home_id,   'Make bed',                       '🛏️',  'Self Care', 10, 3,  'daily'),
    (p_household_id, hero_id, home_id,   'Brush teeth (morning + night)',  '🦷',  'Self Care', 5,  2,  'daily'),
    (p_household_id, hero_id, school_id, 'Homework done',                  '📚',  'School',    25, 10, 'daily'),
    (p_household_id, hero_id, school_id, 'Read for 20 minutes',            '📖',  'Reading',   15, 5,  'daily'),
    (p_household_id, hero_id, school_id, 'Practice instrument',            '🎵',  'Music',     20, 8,  'daily'),
    (p_household_id, hero_id, home_id,   'Tidy room',                      '🧹',  'Chores',    15, 6,  'weekly'),
    (p_household_id, hero_id, home_id,   'Help with dishes',               '🍳',  'Chores',    10, 5,  'daily'),
    (p_household_id, hero_id, home_id,   'Feed pet',                       '🐶',  'Pets',      8,  3,  'daily'),
    (p_household_id, hero_id, home_id,   '30 min of exercise',             '🏃‍♀️','Sports',    15, 5,  'daily');

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
