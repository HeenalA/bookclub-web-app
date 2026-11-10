-- ============================================================================
-- diagnose.sql — one query, the whole picture
-- ============================================================================
-- Read-only. Changes nothing.
--
-- Expected values are in the last column. Anything that does not match is
-- worth looking at; the biggest clue to "where did the books go" is whether
-- ratings and reviews dropped with them, because deleting a book cascades to
-- both.
-- ============================================================================

select * from (
  select 1 as n, 'books'                as thing,
         (select count(*) from books)::text        as actual, '81, or 82 after the picker seed' as expected
  union all select 2, 'ratings',   (select count(*) from ratings)::text,  '216'
  union all select 3, 'reviews',   (select count(*) from reviews)::text,  '206'
  union all select 4, 'members',   (select count(*) from members)::text,  '3, or 4 with the test account'
  union all select 5, 'clubs (active)',
         (select count(*) from clubs where status = 'active')::text, '1'
  union all select 6, 'active memberships',
         (select count(*) from club_members where status = 'active')::text, '3'
  union all select 7, 'meetings', (select count(*) from meetings)::text, '78'
  union all select 8, 'meeting-book links',
         (select count(*) from meeting_books)::text, '78 now, ~88 after seed 7'
  union all select 9, 'books with no picker',
         (select count(*) from books where picked_by is null)::text, '10 now, 0 after seed 5'
  union all select 10, 'books with a cover',
         (select count(*) from books where cover_url is not null)::text, '0 now, 78 after seed 8'

  -- The decisive one. If books were deleted through the app, their ratings
  -- and reviews went with them, and these averages will have moved.
  union all select 11, 'ratings per book (avg)',
         round((select count(*)::numeric from ratings)
             / nullif((select count(*) from books), 0), 2)::text, 'about 2.67'
  union all select 12, 'reviews per book (avg)',
         round((select count(*)::numeric from reviews)
             / nullif((select count(*) from books), 0), 2)::text, 'about 2.54'

  -- Orphans would mean something was removed without its children.
  union all select 13, 'ratings pointing at a missing book',
         (select count(*) from ratings r left join books b on b.id = r.book_id
           where b.id is null)::text, '0'
  union all select 14, 'reviews pointing at a missing book',
         (select count(*) from reviews r left join books b on b.id = r.book_id
           where b.id is null)::text, '0'

  -- Gaps in the id sequence are the fingerprint of deletion: books were
  -- seeded 1..81 contiguously, so a missing id means that row is gone.
  union all select 15, 'highest book id',
         (select coalesce(max(id), 0) from books)::text, '81, or 82 after seed 5'
  union all select 16, 'missing book ids (deleted)',
         coalesce((select string_agg(g::text, ', ')
                     from generate_series(1, (select coalesce(max(id),0) from books)) g
                    where not exists (select 1 from books b where b.id = g)), 'none'),
         'none'
) t order by n;
