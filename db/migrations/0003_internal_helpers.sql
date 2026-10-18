-- ============================================================================
-- Migration 0003 — internal helper functions (used by RLS policies)
-- ============================================================================
-- These four functions answer the questions every security policy in migration
-- 0005 needs to ask: "who is this?", "are they in this club?", "are they an
-- admin of it?", "which club does this book belong to?".
--
-- Three things about them are load-bearing, and all three are standard
-- practice rather than anything clever:
--
-- 1. THEY LIVE IN THE `app` SCHEMA, NOT `public`.
--    Supabase's REST API exposes the `public` schema. Any function in `public`
--    is callable by any client that has your anon key. These functions are
--    `security definer` (see #2), so exposing them would hand out exactly the
--    read access the policies are built to prevent. `app` is not in the
--    exposed-schema list, so they are reachable from inside policies but not
--    from the internet.
--
-- 2. THEY ARE `security definer`, WHICH IS WHAT PREVENTS INFINITE RECURSION.
--    `app.is_club_member()` reads the `club_members` table. But `club_members`
--    has its own RLS policy, and that policy calls `app.is_club_member()`...
--    which would read `club_members` again, forever. `security definer` makes
--    the function body run with its OWNER's privileges, and the owner
--    (postgres) is not subject to RLS — so the inner read just returns rows
--    and the recursion never starts. This is the documented Supabase pattern
--    for exactly this problem.
--
-- 3. EVERY ONE PINS `search_path`.
--    This is the single most important habit with `security definer`. Without
--    a pinned search_path, a caller who can create objects could put their own
--    `club_members` table in a schema that resolves first, and the function —
--    running as postgres — would happily read it and return whatever they
--    wanted. Pinning `search_path` makes the table names in the body
--    unambiguous and un-hijackable.
-- ============================================================================


-- ============================================================
-- Who is the current request?
-- ============================================================
-- `auth.uid()` is Supabase's built-in: it reads the user id out of the signed
-- JWT on the current request. It returns null when nobody is logged in, which
-- is what makes every policy below fail closed for anonymous traffic.
create or replace function app.current_member_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id
    from members
   where auth_user_id = auth.uid()
   limit 1;
$$;


-- ============================================================
-- Is the current user an ACTIVE member of this club?
-- ============================================================
-- 'pending' deliberately does not count. Someone who has requested to join a
-- club can see nothing inside it until an admin approves them — that approval
-- is the whole point of the gate.
create or replace function app.is_club_member(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from club_members cm
      join members m on m.id = cm.member_id
     where cm.club_id = p_club
       and cm.status  = 'active'
       and m.auth_user_id = auth.uid()
  );
$$;


-- ============================================================
-- Has the current user EVER been attached to this club?
-- ============================================================
-- Deliberately looser than is_club_member(): this is true for 'pending' and
-- 'inactive' memberships too. It exists for exactly one job — letting the user
-- home page show the NAME of a club you have left or asked to join. Without
-- it, the "Was Your Bookclub" list could only say "a club you left" because
-- the club row itself would be unreadable.
--
-- It is safe to be looser here because of how the schema is split: this only
-- ever gates the `clubs` row (name, visibility, founded date). The club's
-- actual content — members, books, ratings, reviews, meetings — stays behind
-- is_club_member(), which requires an ACTIVE membership, and the join code is
-- in its own sealed table. So leaving a club takes away everything except the
-- memory of its name, which is what the design calls for.
create or replace function app.has_club_membership(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from club_members cm
      join members m on m.id = cm.member_id
     where cm.club_id = p_club
       and m.auth_user_id = auth.uid()
  );
$$;


-- ============================================================
-- Is the current user an admin of this club?
-- ============================================================
-- Admin is per-club: being admin of a club you created does not make you an
-- admin of a club you merely joined. See docs/DECISIONS.md.
create or replace function app.is_club_admin(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from club_members cm
      join members m on m.id = cm.member_id
     where cm.club_id = p_club
       and cm.status  = 'active'
       and cm.role    = 'admin'
       and m.auth_user_id = auth.uid()
  );
$$;


-- ============================================================
-- Does the current user share any active club with this member?
-- ============================================================
-- This is what scopes the `members` table. You can see a person's name and
-- colour if you are in a club together, and otherwise you cannot see that they
-- exist at all. Without this, every logged-in user could enumerate the full
-- user list of the whole site.
create or replace function app.shares_club_with(p_member text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from club_members mine
      join members me   on me.id = mine.member_id
      join club_members theirs on theirs.club_id = mine.club_id
     where me.auth_user_id = auth.uid()
       and mine.status   = 'active'
       and theirs.status in ('active', 'pending')
       and theirs.member_id = p_member
  );
$$;


-- ============================================================
-- Which club does this book belong to?
-- ============================================================
-- `ratings` and `reviews` have no `club_id` of their own — they are scoped
-- through the book they are attached to, because a book already belongs to
-- exactly one club. This helper is what lets their policies ask "is the
-- current user in the club that owns this book?" without duplicating club_id
-- onto every rating and review row.
create or replace function app.book_club_id(p_book integer)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select club_id from books where id = p_book;
$$;


-- ============================================================
-- Schema access
-- ============================================================
-- An RLS policy's expression is evaluated as the *querying* role, so the
-- logged-in role needs `usage` on this schema for policies that reference
-- these functions to run at all. That does not expose them over the API —
-- PostgREST only serves the schemas it is configured to expose (`public`),
-- and a browser never holds a raw Postgres connection.
--
-- `anon` is deliberately left out: anonymous requests have no policies to
-- evaluate (see migration 0005), so they have no reason to resolve anything
-- in here.
grant usage on schema app to authenticated;
