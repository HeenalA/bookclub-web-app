-- ============================================================================
-- Migration 0001 — core schema
-- ============================================================================
-- Every table the app needs, with real database-level constraints.
--
-- This file is IDEMPOTENT: it is safe to run on a brand-new empty database and
-- safe to re-run on a database that already has some of these tables. That is
-- why you will see `if not exists` everywhere, and `do $$ ... $$` blocks around
-- the constraints (Postgres has no `add constraint if not exists`, so we check
-- the system catalog ourselves first).
--
-- LEARNING: why put constraints in the DATABASE and not just in app code?
-- Because app code can be bypassed. Someone with your anon key and a REST
-- client never runs your JavaScript. A `check` constraint is the last line that
-- cannot be skipped — it is enforced by Postgres itself on every single write,
-- no matter who is writing. App-level validation exists to give a *nice error
-- message*; the DB constraint exists to make the bad state *impossible*.
--
-- Run order: 0001 → 0002 → 0003 → 0004 → 0005. See docs/RUNBOOK.md.
-- ============================================================================


-- ============================================================
-- Internal schema for helper functions
-- ============================================================
-- LEARNING: Supabase exposes the `public` schema over its REST API, which means
-- ANY function in `public` is callable by any client. The policy helpers in
-- migration 0003 must NOT be callable from outside — they are `security
-- definer` (they run with the privileges of their owner and bypass RLS), so
-- exposing them would hand out a read primitive we deliberately locked down.
-- Putting them in a schema that is not in the API's exposed-schema list keeps
-- them reachable from inside policies but unreachable from the internet.
create schema if not exists app;


-- ============================================================
-- 1. MEMBERS — one row per person, across all clubs
-- ============================================================
-- A member's identity is club-independent. Which clubs they are in, and
-- whether they are an admin, lives in `club_members` — not here.
create table if not exists members (
  id           text primary key,
  name         text not null,
  color        text not null default '#8a7a6a',
  initials     text,
  email        text,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Columns added after the original 3-member table was first created.
alter table members add column if not exists email        text;
alter table members add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table members add column if not exists created_at   timestamptz not null default now();

do $$ begin
  -- Slug must look like a slug: lowercase letters, digits, underscore.
  if not exists (select 1 from pg_constraint where conrelid = 'members'::regclass and conname = 'members_id_format') then
    alter table members add constraint members_id_format
      check (id ~ '^[a-z0-9_]{2,40}$');
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'members'::regclass and conname = 'members_name_len') then
    alter table members add constraint members_name_len
      check (char_length(name) between 1 and 60);
  end if;

  -- Colors are interpolated straight into inline `style` attributes on the
  -- frontend, so pinning the format here is a genuine XSS guard, not pedantry:
  -- it makes it impossible to store `red;background:url(...)` as a "color".
  if not exists (select 1 from pg_constraint where conrelid = 'members'::regclass and conname = 'members_color_format') then
    alter table members add constraint members_color_format
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'members'::regclass and conname = 'members_initials_len') then
    alter table members add constraint members_initials_len
      check (initials is null or char_length(initials) between 1 and 3);
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'members'::regclass and conname = 'members_email_format') then
    alter table members add constraint members_email_format
      check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
  end if;
end $$;

-- One account per email, case-insensitively. Partial (`where email is not
-- null`) so rows seeded before emails existed don't all collide on null.
create unique index if not exists members_email_unique
  on members (lower(email)) where email is not null;

create unique index if not exists members_auth_user_id_unique
  on members (auth_user_id) where auth_user_id is not null;


-- ============================================================
-- 2. CLUBS
-- ============================================================
create table if not exists clubs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  visibility   text not null default 'private',
  status       text not null default 'active',
  founded_date date,
  created_by   text references members(id) on delete set null,
  created_at   timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'clubs'::regclass and conname = 'clubs_name_len') then
    alter table clubs add constraint clubs_name_len
      check (char_length(btrim(name)) between 2 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'clubs'::regclass and conname = 'clubs_visibility_valid') then
    alter table clubs add constraint clubs_visibility_valid
      check (visibility in ('public', 'private'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'clubs'::regclass and conname = 'clubs_status_valid') then
    alter table clubs add constraint clubs_status_valid
      check (status in ('active', 'inactive'));
  end if;
end $$;

-- Club names are unique only among ACTIVE clubs, so deactivating a club frees
-- its name (see docs/DECISIONS.md).
--
-- LEARNING: this is a *partial unique index* — a uniqueness rule with a `where`
-- clause. A plain `unique` column constraint cannot express "unique only when
-- status = 'active'"; only an index can.
create unique index if not exists clubs_active_name_unique
  on clubs (lower(btrim(name))) where status = 'active';


-- ============================================================
-- 3. CLUB_JOIN_CODES — deliberately its own table
-- ============================================================
-- The join code for a private club is a SECRET: it is the entire gate on
-- joining. It lives in its own table rather than as a `clubs.join_code` column
-- for one specific reason — if it were a column on `clubs`, then *any* future
-- read policy on `clubs` (say, one added later to let people browse public
-- clubs) would leak the code along with the row. Separating it means the code
-- can only ever be reached by code paths written on purpose to reach it.
--
-- RLS is enabled on this table in migration 0005 with ZERO policies, and all
-- privileges are revoked. Nothing can read it over the API. The only access is
-- through the `security definer` functions in 0004, which check admin first.
create table if not exists club_join_codes (
  club_id    uuid primary key references clubs(id) on delete cascade,
  code       text not null,
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'club_join_codes'::regclass and conname = 'club_join_codes_len') then
    alter table club_join_codes add constraint club_join_codes_len
      check (char_length(code) between 6 and 20);
  end if;
end $$;


-- ============================================================
-- 4. CLUB_MEMBERS — the heart of the membership model
-- ============================================================
-- One row per (club, member) pair, EVER. Leaving a club does not delete the
-- row, it flips `status` to 'inactive'; rejoining flips it back. That is what
-- `unique (club_id, member_id)` enforces, and it is what makes
-- rejoin-without-starting-over possible.
--
-- Note this does not protect ratings/reviews from deletion — those were never
-- at risk, they are keyed by member+book and have no link to club_members.
-- What the soft delete protects is the *membership relationship itself*, so a
-- club's member list can say "left, can rejoin" instead of the person simply
-- vanishing from the club's history.
create table if not exists club_members (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  member_id    text not null references members(id) on delete cascade,
  status       text not null default 'pending',
  role         text not null default 'member',
  requested_at timestamptz not null default now(),
  joined_at    timestamptz,
  left_at      timestamptz,
  unique (club_id, member_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'club_members'::regclass and conname = 'club_members_status_valid') then
    alter table club_members add constraint club_members_status_valid
      check (status in ('pending', 'active', 'inactive'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'club_members'::regclass and conname = 'club_members_role_valid') then
    alter table club_members add constraint club_members_role_valid
      check (role in ('member', 'admin'));
  end if;
end $$;

create index if not exists club_members_club_status_idx  on club_members (club_id, status);
create index if not exists club_members_member_status_idx on club_members (member_id, status);


-- ============================================================
-- 5. BOOKS
-- ============================================================
-- `id` stays an integer identity column: the original 81 books were seeded in
-- the club's own #1-81 order so that id matches the numbering the club has
-- always used. Display numbers are now computed PER CLUB at render time
-- (otherwise a second club's first book would display as "#82").
create table if not exists books (
  id         integer generated by default as identity primary key,
  club_id    uuid references clubs(id) on delete cascade,
  title      text not null,
  author     text,
  picked_by  text references members(id) on delete set null,
  status     text not null default 'finished',
  year       integer,
  created_at timestamptz not null default now()
);

alter table books add column if not exists club_id    uuid references clubs(id) on delete cascade;
alter table books add column if not exists author     text;
alter table books add column if not exists created_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'books'::regclass and conname = 'books_title_len') then
    alter table books add constraint books_title_len
      check (char_length(btrim(title)) between 1 and 300);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'books'::regclass and conname = 'books_author_len') then
    alter table books add constraint books_author_len
      check (author is null or char_length(author) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'books'::regclass and conname = 'books_status_valid') then
    alter table books add constraint books_status_valid
      check (status in ('to_read', 'reading', 'finished'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'books'::regclass and conname = 'books_year_range') then
    alter table books add constraint books_year_range
      check (year is null or year between 1400 and 2200);
  end if;
end $$;

create index if not exists books_club_idx on books (club_id, id);


-- ============================================================
-- 6. RATINGS
-- ============================================================
-- Composite primary key (member_id, book_id): one rating per person per book.
-- That is also what makes `upsert` work from the frontend — "insert this
-- rating, or overwrite my existing one" needs a unique key to conflict on.
create table if not exists ratings (
  member_id  text    not null references members(id) on delete cascade,
  book_id    integer not null references books(id)   on delete cascade,
  value      numeric(5,1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, book_id)
);

alter table ratings add column if not exists created_at timestamptz not null default now();
alter table ratings add column if not exists updated_at timestamptz not null default now();

do $$ begin
  -- The jail value (-1000), or 1-10 in half-star steps. The `value * 2` trick
  -- is how you say "must be a multiple of 0.5" in SQL: doubling a legal value
  -- always yields a whole number.
  --
  -- This constraint is mirrored by backend/app/validators.py::is_valid_rating()
  -- on purpose. The DB constraint is the source of truth that cannot be
  -- bypassed; the Python version exists so code can fail fast with a readable
  -- error before a write is ever attempted.
  if not exists (select 1 from pg_constraint where conrelid = 'ratings'::regclass and conname = 'ratings_value_valid') then
    alter table ratings add constraint ratings_value_valid
      check (
        value = -1000
        or (value >= 1 and value <= 10 and (value * 2) = trunc(value * 2))
      );
  end if;
end $$;

create index if not exists ratings_book_idx   on ratings (book_id);
create index if not exists ratings_member_idx on ratings (member_id);

-- One rating per person per book, guaranteed.
--
-- On a brand-new database the primary key above already says this. But this
-- table predates these migrations: the live `ratings` table was created in an
-- earlier session with its own surrogate `id` column, so the primary key
-- declared above was never applied to it and nothing stops a duplicate.
--
-- This matters beyond tidiness. The app saves a rating with `upsert`, which
-- compiles to `insert ... on conflict (member_id, book_id) do update`. That
-- statement REQUIRES a unique index on exactly those columns — without one
-- Postgres rejects it outright, and every rating edit in the UI fails.
--
-- `create unique index if not exists` is the fix that works in both cases:
-- new databases get a harmless duplicate of the primary key's index, and the
-- existing database gets the constraint it is missing.
create unique index if not exists ratings_member_book_unique
  on ratings (member_id, book_id);


-- ============================================================
-- 7. REVIEWS
-- ============================================================
create table if not exists reviews (
  member_id  text    not null references members(id) on delete cascade,
  book_id    integer not null references books(id)   on delete cascade,
  text       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, book_id)
);

alter table reviews add column if not exists created_at timestamptz not null default now();
alter table reviews add column if not exists updated_at timestamptz not null default now();

do $$ begin
  -- The length cap is a real abuse/cost control, not cosmetic: without it a
  -- single logged-in client could write megabytes of text into a free-tier
  -- database, and every page load would then pay to download it. 5000
  -- characters is roughly two pages of prose — far more than any real review.
  if not exists (select 1 from pg_constraint where conrelid = 'reviews'::regclass and conname = 'reviews_text_len') then
    alter table reviews add constraint reviews_text_len
      check (char_length(text) between 1 and 5000);
  end if;
end $$;

create index if not exists reviews_book_idx   on reviews (book_id);
create index if not exists reviews_member_idx on reviews (member_id);

-- Same reasoning as ratings above: the app upserts reviews, so it needs a
-- unique index on these two columns to conflict against.
create unique index if not exists reviews_member_book_unique
  on reviews (member_id, book_id);


-- ============================================================
-- 8. MEETINGS
-- ============================================================
-- There is deliberately NO `meeting_number` column. Display numbers (#1, #2,
-- ...) are computed from date order at query time, so deleting a meeting
-- renumbers the rest for free with nothing to update. See docs/DECISIONS.md.
create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  meeting_date date not null,
  meeting_time text,
  location     text,
  book_id      bigint references books(id) on delete set null,
  created_by   text references members(id) on delete set null,
  created_at   timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'meetings'::regclass and conname = 'meetings_time_len') then
    alter table meetings add constraint meetings_time_len
      check (meeting_time is null or char_length(meeting_time) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'meetings'::regclass and conname = 'meetings_location_len') then
    alter table meetings add constraint meetings_location_len
      check (location is null or char_length(location) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'meetings'::regclass and conname = 'meetings_date_range') then
    alter table meetings add constraint meetings_date_range
      check (meeting_date between '2000-01-01' and '2100-01-01');
  end if;
end $$;

-- Match books.id exactly. A foreign key from int4 to int8 is legal and works,
-- but leaving the two different is how the book_club_id(integer) bug happened
-- in the first place — so this widens the column if an earlier run created it
-- as integer.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'meetings'
       and column_name = 'book_id' and data_type = 'integer'
  ) then
    alter table meetings alter column book_id type bigint;
  end if;
end $$;

create index if not exists meetings_club_date_idx on meetings (club_id, meeting_date);


-- ============================================================
-- 9. ANNOUNCEMENTS
-- ============================================================
-- The home page showed two hardcoded announcements in the HTML. This makes
-- them real: posted by a member, scoped to a club, border-coloured by the
-- poster's own member colour on the frontend.
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  member_id  text not null references members(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'announcements'::regclass and conname = 'announcements_text_len') then
    alter table announcements add constraint announcements_text_len
      check (char_length(btrim(text)) between 1 and 1000);
  end if;
end $$;

create index if not exists announcements_club_created_idx
  on announcements (club_id, created_at desc);


-- ============================================================
-- updated_at maintenance
-- ============================================================
-- LEARNING: a column called `updated_at` that the client has to remember to
-- set is a column that will eventually be wrong. A trigger makes the database
-- responsible for it, so it is correct no matter which code path writes.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ratings_touch_updated_at on ratings;
create trigger ratings_touch_updated_at
  before update on ratings
  for each row execute function app.touch_updated_at();

drop trigger if exists reviews_touch_updated_at on reviews;
create trigger reviews_touch_updated_at
  before update on reviews
  for each row execute function app.touch_updated_at();
