-- Migration 0001: multi-club membership model + auth prep
--
-- This is step 1 of the auth rollout (see docs/DECISIONS.md for the reasoning
-- behind each modeling choice below). It only creates/alters tables — no RLS
-- policies are added here on purpose (see the note before "ROW LEVEL SECURITY"
-- at the bottom). Supabase Auth itself is not wired up yet either; that's step 2.
--
-- DRAFT — not yet run against the live database. Review before running in the
-- Supabase SQL Editor. Column types for the EXISTING tables (members, books)
-- below are inferred from data/source/seed_batch1_books_ratings.sql, since no
-- schema file was ever checked in when those tables were first created — worth
-- double-checking against Table Editor before running, in case they drifted.

-- ============================================================
-- 1. CLUBS — new table
-- ============================================================
-- One row per book club. "To Read or Not to Read" becomes a real row here
-- instead of being implicit, since the app now supports more than one club.

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  join_code text,                 -- only meaningful when visibility = 'private'; null for public clubs
  status text not null default 'active' check (status in ('active', 'inactive')),
  founded_date date,
  created_by text references members(id),   -- the member who created it; becomes its first admin (see club_members below)
  created_at timestamptz not null default now()
);

-- Club names must be unique, but ONLY among active clubs — deactivating a club
-- frees its name for reuse, and reactivating an old club requires picking a
-- new name (per the Aug 2026 DECISIONS.md entry on this).
--
-- LEARNING: this is a "partial unique index" — a unique constraint with a
-- WHERE clause, so it only applies to rows matching that condition. A plain
-- `unique` column constraint can't do this; you need an index for it.
create unique index if not exists clubs_active_name_unique
  on clubs (lower(name))
  where status = 'active';


-- ============================================================
-- 2. CLUB_MEMBERS — new table (the core of the whole membership model)
-- ============================================================
-- One row per (club, member) pair, ever. Leaving a club does NOT delete this
-- row — it flips status to 'inactive'. Rejoining flips it back to 'active'
-- rather than inserting a second row. That's what "unique (club_id, member_id)"
-- below enforces, and it's what makes rejoin-without-data-loss possible: the
-- membership relationship itself persists, it just changes state.
--
-- Note this table does NOT protect ratings/reviews — those were never at risk
-- of deletion in the first place, since they live in the ratings/reviews
-- tables keyed by member_id + book_id, with no foreign key back to
-- club_members. This table's soft-delete protects the *membership itself*
-- (so a club's Settings/member list can show "left, can rejoin" instead of
-- the person just vanishing from history).

create table if not exists club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id),
  member_id text not null references members(id),
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  role text not null default 'member' check (role in ('member', 'admin')),
  requested_at timestamptz not null default now(),  -- when the join request was made
  joined_at timestamptz,                            -- set when status flips to 'active' (approved, or code-joined)
  left_at timestamptz,                              -- set when status flips to 'inactive' (left)
  unique (club_id, member_id)
);

-- Fast lookup: "which clubs is this member active in" / "who's active in this club"
create index if not exists club_members_club_status_idx on club_members (club_id, status);
create index if not exists club_members_member_status_idx on club_members (member_id, status);


-- ============================================================
-- 3. MEMBERS — alter existing table
-- ============================================================
-- Adds what auth needs: a link to the real Supabase Auth account, and a
-- unique email so one person can't create two accounts.

alter table members add column if not exists email text;
alter table members add column if not exists auth_user_id uuid references auth.users(id);

-- Case-insensitive uniqueness (so "Heenal@x.com" and "heenal@x.com" collide),
-- partial so it doesn't choke on old rows where email is still null.
create unique index if not exists members_email_unique
  on members (lower(email))
  where email is not null;

create unique index if not exists members_auth_user_id_unique
  on members (auth_user_id)
  where auth_user_id is not null;

-- NOTE: the CLAUDE.md "Data Models" section currently lists a per-member
-- `role (admin, max 3 per group)` field. That's now superseded by
-- club_members.role, since admin is per-club, not global — a user can be
-- admin of a club they created while being a plain member of another club
-- they joined. Worth updating CLAUDE.md's Data Models table to match once
-- this migration is approved and run.


-- ============================================================
-- 4. BOOKS — alter existing table
-- ============================================================
-- Books currently belong to nobody in particular (single implicit club).
-- Now that multiple clubs can exist, each book needs to know which club's
-- shelf it's on.

alter table books add column if not exists club_id uuid references clubs(id);


-- ============================================================
-- 5. MEETINGS — new table
-- ============================================================
-- meeting_number ("#1", "#2"...) is deliberately NOT a column here — it's
-- computed at query time from meeting_date order (see the Aug 2026
-- DECISIONS.md entry "Meeting numbers are computed, not stored"). Example
-- query shape:
--   select *, row_number() over (partition by club_id order by meeting_date) as meeting_number
--   from meetings;

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id),
  meeting_date date not null,
  meeting_time text,          -- free text for now (e.g. "6:00 PM PST"), matches current display style
  location text,
  book_id integer references books(id),   -- optional: which book this meeting discusses
  created_by text references members(id),
  created_at timestamptz not null default now()
);

create index if not exists meetings_club_date_idx on meetings (club_id, meeting_date);


-- ============================================================
-- 6. ONE-TIME DATA BACKFILL — the real club + existing books
-- ============================================================
-- Run once. Creates the real "To Read or Not to Read" club row and points
-- all 81 existing books at it. Safe to re-run (the update is a no-op once
-- club_id is already set).

insert into clubs (name, visibility, status, founded_date, created_by)
select 'To Read or Not to Read', 'private', 'active', '2020-06-01', 'heenal'
where not exists (
  select 1 from clubs where lower(name) = lower('To Read or Not to Read') and status = 'active'
);

update books
set club_id = (select id from clubs where name = 'To Read or Not to Read' and status = 'active')
where club_id is null;

-- Also worth doing manually in the SQL Editor once this club row exists:
-- back-fill club_members rows (status='active', role='admin' for Heenal,
-- role='member' for Maya/Mina) for the 3 real members, so the existing club
-- isn't "empty" under the new membership model. Not scripted here since it's
-- a one-time, 3-row insert best reviewed by hand rather than assumed.


-- ============================================================
-- ROW LEVEL SECURITY — enabled, but NO POLICIES yet (intentional)
-- ============================================================
-- The existing tables (members/books/ratings/reviews) currently have
-- public-read policies (using (true)) — anyone with the anon key can read
-- everything. That pattern must NOT be copied onto these new tables:
-- club_members has approval state, and clubs.join_code is a secret that
-- gates entry to private clubs. Enabling RLS with zero policies makes these
-- tables fully inaccessible via the API (default-deny) until step 3
-- designs real policies scoped by club_members — safer to start closed and
-- open deliberately than to start open and forget to close it.

alter table clubs enable row level security;
alter table club_members enable row level security;
alter table meetings enable row level security;
