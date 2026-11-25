-- ============================================================================
-- fix_auth_links.sql — point an existing member row at an existing login
-- ============================================================================
-- WHEN YOU NEED THIS
--
-- Migration 0002 installs a trigger on auth.users. When an account is created
-- in Authentication -> Users, the trigger tries to attach it to a members row:
--
--   Case 1  a members row already has that email and no login yet  -> LINK it
--   Case 2  no members row matches                                 -> CREATE a
--           brand-new row with a generated slug ('maya2', 'mina_books', ...)
--
-- Case 2 is the trap. If the account is created BEFORE members.email is set,
-- the trigger has nothing to match on, so it invents a new member. That person
-- can sign in but resolves to an empty member with no club, no ratings and no
-- reviews — their real history stays attached to the original 'maya' row.
--
-- This script moves the login onto the right row. Run check_auth_links.sql
-- first and again afterwards.
--
-- ----------------------------------------------------------------------------
-- HOW TO USE
--
-- 1. Edit the two email addresses in the `values` list below. Use the exact
--    addresses the accounts were created with.
-- 2. Paste the WHOLE file into the Supabase SQL Editor and press Run.
-- 3. The table it prints at the end is the verification — read the `verdict`
--    column.
--
-- SAFE BY DESIGN: this script never deletes a row. It only ever UNLINKS a
-- stray auto-created member (clears its email and login) so the unique
-- indexes are free, then links the real row. Deleting the leftover empty rows
-- is a separate, deliberate step printed at the bottom of this file.
-- ============================================================================

do $$
declare
  r       record;
  v_auth  uuid;
  v_stray text;
begin
  for r in
    select * from (values

      -- ▼▼▼ EDIT THESE TWO LINES ▼▼▼
      ('maya', 'MAYA_EMAIL'),
      ('mina', 'MINA_EMAIL')
      -- ▲▲▲ EDIT THESE TWO LINES ▲▲▲

    ) as t(member_id, email)
  loop

    -- ---- The members row we WANT the login to land on must exist ---------
    if not exists (select 1 from members m where m.id = r.member_id) then
      raise exception 'No members row with id %. Check the slug.', r.member_id;
    end if;

    -- ---- The login must exist ------------------------------------------
    -- auth.users is the authoritative list of who can sign in. Looking it up
    -- here (rather than trusting whatever the trigger did) means this script
    -- repairs the same way no matter how the data got into this state.
    select u.id into v_auth
      from auth.users u
     where lower(u.email) = lower(r.email)
     limit 1;

    if v_auth is null then
      raise exception
        'No auth account for %. Create it under Authentication -> Users first (Add user -> Create new user, with Auto Confirm User ticked).',
        r.email;
    end if;

    -- ---- Already correct? Then this is a no-op ---------------------------
    -- Makes the script safe to re-run, which matters when you are halfway
    -- through a repair and are not sure what already applied.
    if exists (
      select 1 from members m
       where m.id = r.member_id and m.auth_user_id = v_auth
    ) then
      raise notice '% is already linked to %  (nothing to do)', r.member_id, r.email;
      continue;
    end if;

    -- ---- Free the unique indexes ----------------------------------------
    -- members has a unique index on auth_user_id and another on email (both
    -- partial, ignoring nulls). A stray row holding either value would make
    -- the update below fail, so unlink it first.
    for v_stray in
      select m.id from members m
       where m.id <> r.member_id
         and (m.auth_user_id = v_auth or lower(m.email) = lower(r.email))
    loop
      update members
         set auth_user_id = null,
             email        = null
       where id = v_stray;
      raise notice 'unlinked stray member row "%" (row kept, not deleted)', v_stray;
    end loop;

    -- ---- Link the real row ----------------------------------------------
    update members
       set auth_user_id = v_auth,
           email        = r.email
     where id = r.member_id;

    raise notice 'linked % -> %', r.member_id, r.email;

  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- Verification. The SQL Editor shows only the last statement's result, so
-- this is deliberately the last thing in the file.
-- ---------------------------------------------------------------------------
select
  m.id                                   as member_id,
  coalesce(m.email, '(no email)')        as email,
  case when m.auth_user_id is null
       then 'NO LOGIN'
       else 'can sign in' end            as login,
  (select count(*) from club_members cm
    where cm.member_id = m.id and cm.status = 'active') as active_clubs,
  (select count(*) from ratings r where r.member_id = m.id) as ratings,
  (select count(*) from reviews v where v.member_id = m.id) as reviews
from members m
order by (m.auth_user_id is null), m.id;


-- ============================================================================
-- OPTIONAL CLEANUP — only after the verification above looks right
-- ============================================================================
-- Any member row the trigger auto-created is now unlinked and empty. It is not
-- in club_members, so it does not appear anywhere in the app. If you want it
-- gone, run this on its own and read the list it prints BEFORE deleting:
--
--   select m.id, m.name, m.email, m.created_at
--     from members m
--    where m.auth_user_id is null
--      and not exists (select 1 from ratings  r where r.member_id = m.id)
--      and not exists (select 1 from reviews  v where v.member_id = m.id)
--      and not exists (select 1 from books    b where b.picked_by = m.id)
--      and not exists (select 1 from club_members cm where cm.member_id = m.id)
--      and m.id not in ('maya', 'mina', 'heenal');
--
-- Then, if and only if that list contains exactly the rows you expect, change
-- `select m.id, m.name, m.email, m.created_at` to `delete` and re-run:
--
--   delete from members m where ... (same where clause) ...
--
-- The guards matter: a member row is the anchor for years of ratings and
-- reviews, and members.id cascades. A row with history attached is never a
-- stray.
-- ============================================================================
