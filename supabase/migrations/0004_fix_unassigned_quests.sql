-- =====================================================================
-- Hotfix: hero submitting an unassigned quest fails with "not authorized"
-- because submit_quest's check matched against q.hero_member_id which was
-- NULL when the parent seeded data before any hero joined.
--
-- Two changes:
--   1. submit_quest now allows submission on unassigned quests if caller
--      is a hero in the household, and auto-assigns the quest to them.
--   2. Backfill: for every household with exactly one hero, claim
--      unassigned quests for that hero.
-- =====================================================================

create or replace function submit_quest(quest_id uuid, proof_note text default '', proof_url text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  q record;
  my_member_id uuid;
begin
  select * into q from quests where id = quest_id;
  if not found then raise exception 'quest not found'; end if;

  -- Caller must be a hero in this household.
  select hm.id into my_member_id
    from household_members hm
    where hm.user_id = auth.uid()
      and hm.household_id = q.household_id
      and hm.role = 'hero';
  if my_member_id is null then
    raise exception 'not authorized';
  end if;

  -- If the quest is assigned to someone else, refuse.
  if q.hero_member_id is not null and q.hero_member_id <> my_member_id then
    raise exception 'not authorized';
  end if;

  -- Self-assign if previously unassigned.
  if q.hero_member_id is null then
    update quests set hero_member_id = my_member_id where id = quest_id;
  end if;

  update quests set
    status = 'submitted',
    completed_at = now(),
    proof_note = submit_quest.proof_note,
    proof_url = submit_quest.proof_url
  where id = quest_id;
end $$;

-- ---------- Backfill: claim unassigned quests for the lone hero in each household ----------
do $$
declare h record; lone_hero uuid; hero_count int;
begin
  for h in select id from households loop
    select count(*) into hero_count from household_members
      where household_id = h.id and role = 'hero';
    if hero_count = 1 then
      select id into lone_hero from household_members
        where household_id = h.id and role = 'hero' limit 1;
      update quests set hero_member_id = lone_hero
        where household_id = h.id and hero_member_id is null;
    end if;
  end loop;
end $$;
