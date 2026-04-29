-- =====================================================================
-- Hotfix: column reference ambiguity in join_household
-- The original join_household RPC's WHERE clause referenced household_id
-- without table qualifier; Postgres now treats this as ambiguous because
-- the function's RETURNS TABLE also has a household_id column.
-- =====================================================================

create or replace function join_household(code text, role member_role, display_name text, avatar text default '🦄')
returns table (household_id uuid, member_id uuid)
language plpgsql security definer set search_path = public
as $$
declare found_h uuid; new_m uuid;
begin
  if auth.uid() is null then raise exception 'must be authenticated'; end if;
  select id into found_h from households where households.invite_code = join_household.code;
  if found_h is null then raise exception 'invalid invite code'; end if;

  select hm.id into new_m
    from household_members hm
    where hm.household_id = found_h and hm.user_id = auth.uid();

  if new_m is null then
    insert into household_members (household_id, user_id, role, display_name, avatar)
      values (found_h, auth.uid(), join_household.role, join_household.display_name, join_household.avatar)
      returning id into new_m;
    if join_household.role = 'hero' then
      insert into heroes (member_id) values (new_m);
    end if;
  end if;

  household_id := found_h;
  member_id := new_m;
  return next;
end $$;
