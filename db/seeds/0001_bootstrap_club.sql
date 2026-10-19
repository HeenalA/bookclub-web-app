-- ============================================================================
-- Seed 0001 — bootstrap the real club and connect the existing data to it
-- ============================================================================
-- Run this AFTER migrations 0001-0005 and AFTER the data seed scripts in
-- data/source/ (members + books + ratings + reviews). See docs/RUNBOOK.md for
-- the full order.
--
-- No real email addresses are committed in this repository. Replace the three
-- placeholders below with the real addresses before running — they have to
-- match the addresses you invite from the Supabase dashboard exactly, because
-- matching on email is how migration 0002's trigger connects an auth account
-- to an existing member row and hands them their whole rating and review
-- history.
--
-- Safe to re-run: every statement is a no-op the second time.
-- ============================================================================

-- ------------------------------------------------------------
-- 1. Member email addresses
-- ------------------------------------------------------------
-- ⚠️  DO NOT PUT A REAL EMAIL ADDRESS IN THIS FILE.
--
-- This file is tracked in git and the repository is public. An address edited
-- in here and committed is an address published on GitHub.
--
-- Instead, set emails with a one-off statement in the SQL Editor, which is
-- never written to disk:
--
--     update members set email = 'you@example.com' where id = 'heenal';
--
-- Then run this file unchanged. The line below is written as
-- `... and email is null`, so once an address is set it quietly does nothing
-- and the rest of the file still runs.
--
-- WHY THE EMAIL MATTERS: it must match the address used when creating that
-- person's login account, exactly. That match is the entire mechanism by
-- which an existing member inherits their years of ratings and reviews — the
-- trigger in migration 0002 looks for a members row with this email and no
-- account attached, and links the two.
--
-- Leaving an email null is completely safe. The member row, their ratings and
-- their reviews all stay exactly as they are and keep showing in the club;
-- that person simply cannot log in until an address is set.

update members set email = 'REPLACE_WITH_HEENAL_EMAIL' where id = 'heenal' and email is null;

-- Same for these two — set them from the SQL Editor when you are ready to
-- give Maya and Mina accounts. Leave them commented out here.
-- update members set email = 'REPLACE_WITH_MAYA_EMAIL' where id = 'maya' and email is null;
-- update members set email = 'REPLACE_WITH_MINA_EMAIL' where id = 'mina' and email is null;


-- ------------------------------------------------------------
-- 2. The club itself
-- ------------------------------------------------------------
-- Private, so it is joined by code rather than by request.
insert into clubs (name, visibility, status, founded_date, created_by)
select 'To Read or Not to Read', 'private', 'active', date '2020-06-01', 'heenal'
where not exists (
  select 1 from clubs
   where lower(btrim(name)) = lower('To Read or Not to Read')
     and status = 'active'
);


-- ------------------------------------------------------------
-- 3. Memberships — BEFORE the books backfill, deliberately
-- ------------------------------------------------------------
-- Order matters here. The `books_check_picker` trigger from migration 0004
-- refuses to attach a book to a club unless the person credited with picking
-- it is a member of that club. Setting books.club_id in step 4 fires that
-- trigger, so the membership rows have to exist first or every book with a
-- recorded picker would be rejected.
insert into club_members (club_id, member_id, status, role, joined_at)
select c.id, v.member_id, 'active', v.role, date '2020-06-01'
  from clubs c
  cross join (values
    ('heenal', 'admin'),
    ('maya',   'member'),
    ('mina',   'member')
  ) as v(member_id, role)
 where c.name = 'To Read or Not to Read' and c.status = 'active'
on conflict (club_id, member_id) do nothing;


-- ------------------------------------------------------------
-- 4. Point all existing books at the club
-- ------------------------------------------------------------
update books
   set club_id = (select id from clubs
                   where name = 'To Read or Not to Read' and status = 'active')
 where club_id is null;


-- ------------------------------------------------------------
-- 5. A join code for the club
-- ------------------------------------------------------------
-- Needed because the club is private. Read it back afterwards from the
-- Settings page in the app, or with:
--   select public.club_join_code('<club id>');
insert into club_join_codes (club_id, code)
select c.id, app.new_join_code()
  from clubs c
 where c.name = 'To Read or Not to Read' and c.status = 'active'
on conflict (club_id) do nothing;


-- ------------------------------------------------------------
-- 6. Fix the known title typo
-- ------------------------------------------------------------
-- Carried over from the original seeding session: book 47's title was
-- transcribed as "Lock" rather than "Locke".
update books set title = 'The Lies of Locke Lamora'
 where title = 'The Lies of Lock Lamora';


-- ------------------------------------------------------------
-- 7. Check it worked
-- ------------------------------------------------------------
-- Expect: one club, 3 active members, 81 books all with a club_id, 0 orphans.
select
  (select count(*) from clubs where status = 'active')                as active_clubs,
  (select count(*) from club_members where status = 'active')          as active_memberships,
  (select count(*) from books)                                        as books_total,
  (select count(*) from books where club_id is null)                  as books_without_club,
  (select count(*) from ratings)                                      as ratings_total,
  (select count(*) from reviews)                                      as reviews_total,
  (select count(*) from members where email like 'REPLACE_WITH_%')    as placeholder_emails_left;
