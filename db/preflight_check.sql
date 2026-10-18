-- ============================================================================
-- preflight_check.sql — RUN THIS FIRST, before any migration.
-- ============================================================================
-- These migrations add real constraints to tables that already hold years of
-- real data. Postgres validates a new constraint against every existing row,
-- so if even one row breaks a rule the `alter table` fails.
--
-- That failure is safe — the transaction rolls back and nothing is corrupted —
-- but it is much nicer to know in advance.
--
-- Read-only. Changes nothing.
--
-- NOTE ON THE SQL EDITOR: this is deliberately ONE statement. The Supabase SQL
-- Editor only displays the result of the last statement when you run several,
-- so a file of separate SELECTs would silently show you only its final one.
-- Everything below arrives as a single table instead.
--
-- Every row should say PASS. Rows marked `info` are just inventory.
-- ============================================================================

with checks as (

  -- ---- Blockers: these must be 0 or a migration will fail ----------------

  select 1 as ord, 'check' as kind,
         'Duplicate ratings (member + book)' as check_name,
         (select count(*) from (
            select member_id, book_id from ratings
             group by member_id, book_id having count(*) > 1) d) as problems,
         'Blocks ratings_member_book_unique, which rating edits depend on' as why

  union all
  select 2, 'check', 'Duplicate reviews (member + book)',
         (select count(*) from (
            select member_id, book_id from reviews
             group by member_id, book_id having count(*) > 1) d),
         'Blocks reviews_member_book_unique'

  union all
  select 3, 'check', 'Rating values legal (jail, or 1-10 by halves)',
         (select count(*) from ratings
           where not (value = -1000
                 or (value >= 1 and value <= 10
                     and (value * 2) = trunc(value * 2)))),
         'Blocks ratings_value_valid'

  union all
  select 4, 'check', 'Book statuses within allowed set',
         (select count(*) from books
           where status is null
              or status not in ('to_read', 'reading', 'finished')),
         'Blocks books_status_valid'

  union all
  select 5, 'check', 'Book titles 1-300 characters',
         (select count(*) from books
           where title is null
              or char_length(btrim(title)) not between 1 and 300),
         'Blocks books_title_len'

  union all
  select 6, 'check', 'Book years 1400-2200',
         (select count(*) from books
           where year is not null and year not between 1400 and 2200),
         'Blocks books_year_range'

  union all
  select 7, 'check', 'Member colours are #RRGGBB',
         (select count(*) from members
           where color is null or color !~ '^#[0-9A-Fa-f]{6}$'),
         'Blocks members_color_format — a real injection guard'

  union all
  select 8, 'check', 'Member ids are lowercase slugs',
         (select count(*) from members where id !~ '^[a-z0-9_]{2,40}$'),
         'Blocks members_id_format'

  union all
  select 9, 'check', 'Member names 1-60 characters',
         (select count(*) from members
           where name is null or char_length(name) not between 1 and 60),
         'Blocks members_name_len'

  union all
  select 10, 'check', 'Member initials 3 characters or fewer',
         (select count(*) from members
           where initials is not null and char_length(initials) > 3),
         'Blocks members_initials_len'

  union all
  select 11, 'check', 'Review text 1-5000 characters',
         (select count(*) from reviews
           where text is null
              or char_length(text) not between 1 and 5000),
         'Blocks reviews_text_len'

  -- ---- Orphans: would block the foreign keys -----------------------------

  union all
  select 12, 'check', 'Ratings point at a book that exists',
         (select count(*) from ratings r
           left join books b on b.id = r.book_id where b.id is null),
         'Blocks the ratings -> books foreign key'

  union all
  select 13, 'check', 'Ratings point at a member that exists',
         (select count(*) from ratings r
           left join members m on m.id = r.member_id where m.id is null),
         'Blocks the ratings -> members foreign key'

  union all
  select 14, 'check', 'Reviews point at a book that exists',
         (select count(*) from reviews r
           left join books b on b.id = r.book_id where b.id is null),
         'Blocks the reviews -> books foreign key'

  union all
  select 15, 'check', 'Reviews point at a member that exists',
         (select count(*) from reviews r
           left join members m on m.id = r.member_id where m.id is null),
         'Blocks the reviews -> members foreign key'

  union all
  select 16, 'check', 'Books picked by a member that exists',
         (select count(*) from books b
           left join members m on m.id = b.picked_by
           where b.picked_by is not null and m.id is null),
         'Blocks the books -> members foreign key'

  -- ---- Inventory: not pass/fail, just what is there ----------------------

  union all select 20, 'info', 'Members',  (select count(*) from members), 'expect 3'
  union all select 21, 'info', 'Books',    (select count(*) from books),   'expect 81'
  union all select 22, 'info', 'Ratings',  (select count(*) from ratings), 'expect 216'
  union all select 23, 'info', 'Reviews',  (select count(*) from reviews), 'expect 206'
  union all select 24, 'info', 'Books with no recorded picker',
                                (select count(*) from books where picked_by is null),
                                'expect 10 — correct, the source did not record one'
  union all select 25, 'info', 'Longest review (characters)',
                                (select coalesce(max(char_length(text)), 0) from reviews),
                                'must be under the 5000 cap'
)
select
  check_name,
  problems,
  case when kind = 'info' then 'info'
       when problems = 0  then 'PASS'
       else 'FAIL — fix before migrating' end as result,
  why
from checks
order by
  case when kind = 'check' and problems > 0 then 0   -- failures first
       when kind = 'check' then 1
       else 2 end,
  ord;
