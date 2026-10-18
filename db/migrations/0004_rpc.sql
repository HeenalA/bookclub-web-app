-- ============================================================================
-- Migration 0004 — the write API for membership (callable RPC functions)
-- ============================================================================
-- THE CENTRAL DESIGN DECISION OF THIS APP'S SECURITY MODEL
--
-- Reads are controlled by RLS policies (migration 0005). Privileged *writes*
-- are not. The `clubs`, `club_members` and `club_join_codes` tables get no
-- insert/update/delete policies at all — they are unwritable over the API —
-- and every state change goes through one of the functions below.
--
-- Why not just write clever RLS policies for the writes too? Because an RLS
-- `with check` expression sees the NEW row, not the old one. Expressing a rule
-- like "a member may set their own status to 'inactive' (leaving), but only an
-- admin may set someone's status to 'active' (approving)" in a policy means
-- reasoning about every combination of old and new values across three
-- columns, and getting one case wrong means someone can approve their own
-- pending membership. A function, by contrast, states the rule in one
-- readable place: check admin, then make the change.
--
-- So: RLS for reads, `security definer` functions for privileged writes.
-- Ordinary content (books, ratings, reviews, meetings, announcements) is
-- written directly under RLS, because for those the rule really is as simple
-- as "your own row, in a club you belong to".
--
-- Each function below starts by establishing who the caller is and refuses to
-- do anything if they are not signed in. Error messages are written to be
-- shown to a user, because PostgREST passes `raise exception` text straight
-- through to the client.
-- ============================================================================


-- ============================================================
-- Join code generation
-- ============================================================
create or replace function app.new_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  -- 32 characters: A-Z without I, L or O, and 1-9 without 0 — so there is no
  -- way to misread a code someone reads aloud or writes down.
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
  v_hex      text;
  v_code     text := '';
  i          integer;
begin
  -- LEARNING: `gen_random_uuid()` is built into Postgres and is backed by the
  -- OS cryptographic random source, so this needs no extensions. Taking two
  -- hex characters at a time gives a value 0-255, and 256 divides evenly by
  -- 32 — so `mod(.., 32)` maps onto the alphabet with no bias toward the
  -- earlier letters. (Using an alphabet whose size did not divide 256 would
  -- quietly make some characters more likely than others.)
  v_hex := replace(gen_random_uuid()::text, '-', '')
        || replace(gen_random_uuid()::text, '-', '');

  for i in 0..7 loop
    v_code := v_code || substr(
      v_alphabet,
      (get_byte(decode(substr(v_hex, i * 2 + 1, 2), 'hex'), 0) % 32) + 1,
      1
    );
  end loop;

  return v_code;
end;
$$;


-- ============================================================
-- Guard: a book's picker must belong to the book's club
-- ============================================================
-- RLS decides WHO may insert a book. It cannot easily express "and the person
-- you credited as the picker must themselves be in this club", because that is
-- a fact about a different table. A trigger can, and this keeps a club from
-- attributing picks to people who were never in it.
create or replace function app.check_book_picker()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.picked_by is not null and new.club_id is not null then
    if not exists (
      select 1 from club_members
       where club_id   = new.club_id
         and member_id = new.picked_by
         and status in ('active', 'inactive')  -- a past member's picks stay valid
    ) then
      raise exception 'That person is not a member of this book club.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists books_check_picker on books;
create trigger books_check_picker
  before insert or update of picked_by, club_id on books
  for each row execute function app.check_book_picker();


-- ============================================================
-- discover_clubs — browse and search clubs you are not in
-- ============================================================
-- This exists as a function rather than a read policy on `clubs` for two
-- reasons. First, `member_count` needs to count rows in `club_members` for a
-- club you are not in, which RLS correctly forbids you from reading directly.
-- Second, and more importantly: a read policy broad enough for discovery
-- would return whole club rows, and it is far easier to reason about a
-- function that returns a hand-written list of columns than about which
-- columns a policy might expose next year. The join code is in a separate
-- table and is not among the columns here, so there is no path by which
-- browsing can leak it.
create or replace function public.discover_clubs(
  p_search text    default null,
  p_limit  integer default 10,
  p_offset integer default 0
)
returns table (
  club_id      uuid,
  name         text,
  visibility   text,
  member_count bigint,
  founded_date date,
  my_status    text
)
language plpgsql
stable
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me    text    := app.current_member_id();
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 50);
begin
  if v_me is null then
    raise exception 'You must be signed in to browse book clubs.'
      using errcode = '42501';
  end if;

  return query
    select c.id,
           c.name,
           c.visibility,
           (select count(*) from club_members cm
             where cm.club_id = c.id and cm.status = 'active'),
           c.founded_date,
           mine.status
      from clubs c
      left join club_members mine
             on mine.club_id = c.id and mine.member_id = v_me
     where c.status = 'active'
       -- Clubs you are already active in belong under "Your book clubs", not
       -- in the browse list.
       and coalesce(mine.status, '') <> 'active'
       and (
         p_search is null
         or btrim(p_search) = ''
         -- LEARNING: `position(... in ...)` with both sides lowercased is a
         -- plain case-insensitive substring match. We avoid `like '%' || x ||
         -- '%'` here because the user's text would then be interpreted as a
         -- LIKE pattern — a '%' typed into the search box would match
         -- everything, and '_' would match any character.
         or position(lower(btrim(p_search)) in lower(c.name)) > 0
       )
     order by c.name
     limit v_limit offset greatest(coalesce(p_offset, 0), 0);
end;
$$;


-- ============================================================
-- create_club — creator becomes its first admin
-- ============================================================
create or replace function public.create_club(
  p_name       text,
  p_visibility text default 'private'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me   text := app.current_member_id();
  v_name text := btrim(coalesce(p_name, ''));
  v_club uuid;
begin
  if v_me is null then
    raise exception 'You must be signed in to create a book club.'
      using errcode = '42501';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'A club name must be between 2 and 60 characters.'
      using errcode = '22023';
  end if;

  if coalesce(p_visibility, '') not in ('public', 'private') then
    raise exception 'Visibility must be either public or private.'
      using errcode = '22023';
  end if;

  -- An abuse and cost control, not a product rule. Without a cap, one
  -- logged-in account can create clubs in a loop and fill a free-tier
  -- database. Ten is far more than this app's actual use (three or four
  -- clubs), and an admin can raise it in one line if that ever changes.
  if (select count(*) from clubs
       where created_by = v_me and status = 'active') >= 10 then
    raise exception 'You have reached the limit of 10 active book clubs.'
      using errcode = '53000';
  end if;

  if exists (select 1 from clubs
              where lower(btrim(name)) = lower(v_name) and status = 'active') then
    raise exception 'A book club with that name already exists.'
      using errcode = '23505';
  end if;

  insert into clubs (name, visibility, status, founded_date, created_by)
  values (v_name, p_visibility, 'active', current_date, v_me)
  returning id into v_club;

  -- The creator is immediately an active admin of their own club.
  insert into club_members (club_id, member_id, status, role, joined_at)
  values (v_club, v_me, 'active', 'admin', now());

  -- Private clubs get a join code straight away; public ones are joined by
  -- request-and-approve and have no code.
  if p_visibility = 'private' then
    insert into club_join_codes (club_id, code)
    values (v_club, app.new_join_code());
  end if;

  return v_club;
end;
$$;


-- ============================================================
-- request_to_join — public clubs only, lands as 'pending'
-- ============================================================
create or replace function public.request_to_join(p_club uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me     text := app.current_member_id();
  v_club   clubs;
  v_status text;
begin
  if v_me is null then
    raise exception 'You must be signed in to join a book club.'
      using errcode = '42501';
  end if;

  select * into v_club from clubs where id = p_club and status = 'active';
  if not found then
    raise exception 'That book club could not be found.' using errcode = '42704';
  end if;

  if v_club.visibility <> 'public' then
    raise exception 'This club is private — you need a join code from its admin.'
      using errcode = '42501';
  end if;

  select status into v_status from club_members
   where club_id = p_club and member_id = v_me;

  if v_status = 'active' then
    raise exception 'You are already a member of this club.' using errcode = '23505';
  end if;

  -- One row per member per club, ever: a fresh request and a re-request after
  -- leaving both land on the same row.
  insert into club_members (club_id, member_id, status, role, requested_at)
  values (p_club, v_me, 'pending', 'member', now())
  on conflict (club_id, member_id) do update
    set status       = 'pending',
        role         = 'member',
        requested_at = now(),
        left_at      = null;

  return 'pending';
end;
$$;


-- ============================================================
-- join_club_with_code — private clubs, the code IS the gate
-- ============================================================
-- Possession of the code is the approval, so this goes straight to 'active'
-- with no second step (see docs/DECISIONS.md).
create or replace function public.join_club_with_code(
  p_club uuid,
  p_code text
)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me     text := app.current_member_id();
  v_actual text;
  v_status text;
begin
  if v_me is null then
    raise exception 'You must be signed in to join a book club.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from clubs where id = p_club and status = 'active') then
    raise exception 'That book club could not be found.' using errcode = '42704';
  end if;

  select status into v_status from club_members
   where club_id = p_club and member_id = v_me;
  if v_status = 'active' then
    raise exception 'You are already a member of this club.' using errcode = '23505';
  end if;

  select code into v_actual from club_join_codes where club_id = p_club;

  -- Deliberately the same message whether the club has no code or the code is
  -- wrong: a different error for each would tell someone probing codes
  -- something about the club they are probing.
  if v_actual is null or upper(btrim(coalesce(p_code, ''))) <> upper(v_actual) then
    raise exception 'That join code is not correct.' using errcode = '42501';
  end if;

  insert into club_members (club_id, member_id, status, role, joined_at)
  values (p_club, v_me, 'active', 'member', now())
  on conflict (club_id, member_id) do update
    set status    = 'active',
        joined_at = now(),
        left_at   = null;

  return 'active';
end;
$$;


-- ============================================================
-- leave_club — soft delete, keeps your ratings and reviews
-- ============================================================
create or replace function public.leave_club(p_club uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me           text := app.current_member_id();
  v_role         text;
  v_other_admins integer;
  v_other_actives integer;
begin
  if v_me is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  select role into v_role from club_members
   where club_id = p_club and member_id = v_me and status = 'active';
  if not found then
    raise exception 'You are not an active member of this club.'
      using errcode = '42704';
  end if;

  select count(*) into v_other_actives from club_members
   where club_id = p_club and status = 'active' and member_id <> v_me;

  select count(*) into v_other_admins from club_members
   where club_id = p_club and status = 'active' and role = 'admin'
     and member_id <> v_me;

  -- A club with members but no admin can never approve anyone, change a join
  -- code, or promote a replacement — it would be permanently stuck. Blocking
  -- the last admin from leaving while others remain is what prevents that.
  if v_role = 'admin' and v_other_admins = 0 and v_other_actives > 0 then
    raise exception 'You are the only admin. Make someone else an admin before you leave.'
      using errcode = '42501';
  end if;

  update club_members
     set status = 'inactive', left_at = now()
   where club_id = p_club and member_id = v_me;

  -- The last person out deactivates the club, which also frees its name for
  -- reuse (see the partial unique index in migration 0001).
  if v_other_actives = 0 then
    update clubs set status = 'inactive' where id = p_club;
  end if;

  return 'inactive';
end;
$$;


-- ============================================================
-- rejoin_club — the "Rejoin" button on a club you left
-- ============================================================
create or replace function public.rejoin_club(p_club uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me   text := app.current_member_id();
  v_club clubs;
begin
  if v_me is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from club_members
     where club_id = p_club and member_id = v_me and status = 'inactive'
  ) then
    raise exception 'You do not have a past membership of this club to rejoin.'
      using errcode = '42704';
  end if;

  select * into v_club from clubs where id = p_club and status = 'active';
  if not found then
    raise exception 'That book club is no longer active.' using errcode = '42704';
  end if;

  -- Rejoining goes through the same gate as joining for the first time:
  -- approval for public clubs, the code for private ones. Having been a member
  -- before is not itself permission to come back.
  if v_club.visibility = 'private' then
    raise exception 'This club is private — rejoin with its join code.'
      using errcode = '42501';
  end if;

  update club_members
     set status = 'pending', requested_at = now(), left_at = null
   where club_id = p_club and member_id = v_me;

  return 'pending';
end;
$$;


-- ============================================================
-- Admin actions
-- ============================================================
-- Every one of these begins with the same admin check. That repetition is
-- intentional: each function is independently safe to call, so there is no
-- ordering or caller-discipline assumption that could be broken later.

create or replace function public.approve_member(p_club uuid, p_member text)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can approve members.'
      using errcode = '42501';
  end if;

  update club_members
     set status = 'active', joined_at = now(), left_at = null
   where club_id = p_club and member_id = p_member and status = 'pending';

  if not found then
    raise exception 'There is no pending request from that person.'
      using errcode = '42704';
  end if;

  return 'active';
end;
$$;


create or replace function public.deny_member(p_club uuid, p_member text)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can deny requests.'
      using errcode = '42501';
  end if;

  update club_members
     set status = 'inactive', left_at = now()
   where club_id = p_club and member_id = p_member and status = 'pending';

  if not found then
    raise exception 'There is no pending request from that person.'
      using errcode = '42704';
  end if;

  return 'inactive';
end;
$$;


create or replace function public.remove_member(p_club uuid, p_member text)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_me           text := app.current_member_id();
  v_other_admins integer;
  v_role         text;
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can remove members.'
      using errcode = '42501';
  end if;

  if p_member = v_me then
    raise exception 'Use "Leave club" to remove yourself.' using errcode = '42501';
  end if;

  select role into v_role from club_members
   where club_id = p_club and member_id = p_member and status = 'active';
  if not found then
    raise exception 'That person is not an active member of this club.'
      using errcode = '42704';
  end if;

  select count(*) into v_other_admins from club_members
   where club_id = p_club and status = 'active' and role = 'admin'
     and member_id <> p_member;

  if v_role = 'admin' and v_other_admins = 0 then
    raise exception 'You cannot remove the club''s only admin.'
      using errcode = '42501';
  end if;

  update club_members
     set status = 'inactive', left_at = now()
   where club_id = p_club and member_id = p_member;

  return 'inactive';
end;
$$;


create or replace function public.set_member_role(
  p_club   uuid,
  p_member text,
  p_role   text
)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_other_admins integer;
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can change roles.'
      using errcode = '42501';
  end if;

  if coalesce(p_role, '') not in ('member', 'admin') then
    raise exception 'A role must be either member or admin.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from club_members
     where club_id = p_club and member_id = p_member and status = 'active'
  ) then
    raise exception 'That person is not an active member of this club.'
      using errcode = '42704';
  end if;

  -- Same reasoning as leave_club: a club must always retain at least one
  -- admin, or nobody can ever administer it again.
  if p_role = 'member' then
    select count(*) into v_other_admins from club_members
     where club_id = p_club and status = 'active' and role = 'admin'
       and member_id <> p_member;

    if v_other_admins = 0 then
      raise exception 'A club needs at least one admin. Promote someone else first.'
        using errcode = '42501';
    end if;
  end if;

  update club_members set role = p_role
   where club_id = p_club and member_id = p_member;

  return p_role;
end;
$$;


create or replace function public.update_club_settings(
  p_club       uuid,
  p_name       text default null,
  p_visibility text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can change its settings.'
      using errcode = '42501';
  end if;

  if v_name is not null then
    if char_length(v_name) < 2 or char_length(v_name) > 60 then
      raise exception 'A club name must be between 2 and 60 characters.'
        using errcode = '22023';
    end if;
    if exists (
      select 1 from clubs
       where lower(btrim(name)) = lower(v_name)
         and status = 'active' and id <> p_club
    ) then
      raise exception 'A book club with that name already exists.'
        using errcode = '23505';
    end if;
    update clubs set name = v_name where id = p_club;
  end if;

  if p_visibility is not null then
    if p_visibility not in ('public', 'private') then
      raise exception 'Visibility must be either public or private.'
        using errcode = '22023';
    end if;
    update clubs set visibility = p_visibility where id = p_club;

    -- Going private requires a code to exist; going public retires it, so a
    -- code that was shared around while the club was private cannot be used
    -- to walk in later.
    if p_visibility = 'private' then
      insert into club_join_codes (club_id, code)
      values (p_club, app.new_join_code())
      on conflict (club_id) do nothing;
    else
      delete from club_join_codes where club_id = p_club;
    end if;
  end if;
end;
$$;


-- ============================================================
-- Join code access — the only two ways in or out of that table
-- ============================================================
create or replace function public.club_join_code(p_club uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_code text;
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can see its join code.'
      using errcode = '42501';
  end if;

  select code into v_code from club_join_codes where club_id = p_club;
  return v_code;
end;
$$;


create or replace function public.regenerate_join_code(p_club uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_code text;
begin
  if not app.is_club_admin(p_club) then
    raise exception 'Only an admin of this club can change its join code.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from clubs
                  where id = p_club and visibility = 'private') then
    raise exception 'Only private clubs use a join code.' using errcode = '42501';
  end if;

  v_code := app.new_join_code();

  insert into club_join_codes (club_id, code, updated_at)
  values (p_club, v_code, now())
  on conflict (club_id) do update
    set code = excluded.code, updated_at = now();

  return v_code;
end;
$$;


-- ============================================================
-- Function privileges
-- ============================================================
-- LEARNING: Postgres grants `execute` on a newly created function to PUBLIC by
-- default — which, in Supabase, includes the `anon` role that your published
-- anon key maps to. Leaving that default in place would make every function
-- above callable by anyone on the internet with the key from the repo. Each
-- one does check `app.current_member_id()` and would refuse, but relying on
-- that is defence in depth used as the only defence. So: revoke from everyone,
-- then grant to signed-in users only.
--
-- Listing argument types is required because a function's identity in Postgres
-- is its name *plus* its signature.
do $$
declare
  v_sig text;
begin
  for v_sig in select unnest(array[
    'public.discover_clubs(text, integer, integer)',
    'public.create_club(text, text)',
    'public.request_to_join(uuid)',
    'public.join_club_with_code(uuid, text)',
    'public.leave_club(uuid)',
    'public.rejoin_club(uuid)',
    'public.approve_member(uuid, text)',
    'public.deny_member(uuid, text)',
    'public.remove_member(uuid, text)',
    'public.set_member_role(uuid, text, text)',
    'public.update_club_settings(uuid, text, text)',
    'public.club_join_code(uuid)',
    'public.regenerate_join_code(uuid)'
  ])
  loop
    execute format('revoke all on function %s from public, anon', v_sig);
    execute format('grant execute on function %s to authenticated', v_sig);
  end loop;
end $$;
