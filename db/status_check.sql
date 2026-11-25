-- ============================================================================
-- status_check.sql — "what have I already done?"
-- ============================================================================
-- Run this in the Supabase SQL Editor whenever you come back to the project
-- after a break. It reports which setup steps are complete, so you never have
-- to remember what you ran last time.
--
-- Read-only. Changes nothing. Safe to run any time.
--
-- One statement on purpose: the Supabase SQL Editor only displays the result
-- of the LAST statement when you run several, so separate SELECTs would hide
-- most of this.
-- ============================================================================

with step as (

  select 1::numeric as ord, 'Migrations 0001-0005 applied' as step,
         (select count(*) = 9 from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r'
             and c.relname in ('members','clubs','club_members','club_join_codes',
                               'books','ratings','reviews','meetings','announcements')) as done,
         (select count(*)::text || ' of 9 tables exist' from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r'
             and c.relname in ('members','clubs','club_members','club_join_codes',
                               'books','ratings','reviews','meetings','announcements')) as detail

  union all
  select 2, 'Row Level Security is on (your data is private)',
         (select count(*) filter (where not relrowsecurity) = 0
            from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public'
             and c.relname in ('members','clubs','club_members','club_join_codes',
                               'books','ratings','reviews','meetings','announcements')),
         coalesce((select string_agg(c.relname, ', ')
                     from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and not c.relrowsecurity
                      and c.relname in ('members','clubs','club_members','books',
                                        'ratings','reviews','meetings','announcements')),
                  'every table protected')

  union all
  select 3, 'Club created and members linked (seed 0001)',
         (select count(*) = 1 from clubs where status = 'active'),
         (select count(*)::text || ' active club(s), '
               || (select count(*) from club_members where status = 'active')::text
               || ' active membership(s)' from clubs where status = 'active')

  union all
  select 4, 'Your login is linked to your member row',
         (select count(*) > 0 from members where auth_user_id is not null),
         (select coalesce(string_agg(name, ', '), 'nobody yet')
            from members where auth_user_id is not null)

  union all
  select 5, 'Book pickers backfilled (seed batch 5)',
         (select count(*) = 0 from books where picked_by is null)
         and (select count(*) >= 82 from books),
         (select count(*)::text || ' books, '
               || (select count(*) from books where picked_by is null)::text
               || ' with no picker' from books)

  union all
  select 6, 'Meeting history imported (seed batch 6)',
         (select count(*) >= 79 from meetings),
         (select count(*)::text || ' meetings' from meetings)

  union all
  select 7, 'Ratings present (should be 216)',
         (select count(*) >= 216 from ratings),
         (select count(*)::text || ' ratings' from ratings)

  union all
  select 8, 'Reviews present (should be 206)',
         (select count(*) >= 206 from reviews),
         (select count(*)::text || ' reviews' from reviews)

  -- These two are REQUIRED BY THE APP CODE, not optional. The frontend reads
  -- meeting_books and books.cover_url, so if either is missing the Meetings
  -- or Books pages fail with "column does not exist".
  union all
  select 5.1, 'Migration 0006 — meeting_books table (REQUIRED by the app)',
         (select count(*) = 1 from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'meeting_books'),
         'supabase/migrations/0006_meeting_books.sql'

  union all
  select 5.2, 'Migration 0007 — books.cover_url column (REQUIRED by the app)',
         (select count(*) = 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'books'
             and column_name = 'cover_url'),
         'supabase/migrations/0007_book_covers.sql'

  union all
  select 6.1, 'Second books for two-book meetings (seed batch 7)',
         (select count(*) >= 10 from (select meeting_id from meeting_books
                                       group by meeting_id having count(*) > 1) d),
         (select count(*)::text || ' meetings discuss two or more books'
            from (select meeting_id from meeting_books
                   group by meeting_id having count(*) > 1) d)

  union all
  select 6.2, 'Covers and authors (seed batch 8)',
         (select count(*) >= 78 from books where cover_url is not null),
         (select (count(*) filter (where cover_url is not null))::text || ' with a cover, '
               || (count(*) filter (where author is not null))::text || ' with an author'
            from books)

  union all
  select 9, 'Public signup is off (check the dashboard too)',
         true,
         'Authentication -> Sign In / Providers -> Email -> "Allow new users to sign up" must be OFF'
)
select ord as "#",
       case when done then 'DONE' else 'TO DO' end as status,
       step,
       detail
from step
order by done, ord;   -- anything outstanding sorts to the top
