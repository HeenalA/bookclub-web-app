-- ============================================================================
-- Migration 0006 — a meeting can discuss more than one book
-- ============================================================================
-- `meetings.book_id` holds exactly one book. The club regularly discusses two
-- in a sitting — 11 of the 79 imported meetings do — so the import had to
-- drop the second one every time. Eleven books silently lost.
--
-- This is the same mistake as putting a member list in a column on `clubs`,
-- and it has the same fix: a meeting has many books, a book is discussed at
-- many meetings, which is a many-to-many relationship and needs its own
-- table.
--
-- `meetings.book_id` is KEPT, not dropped, and backfilled into the new table.
-- Dropping it would break any query written against it the moment this runs,
-- and there is no need: it becomes a cache of "the first book", which the
-- trigger below keeps true. That means the home page countdown and the
-- bookshelf's "currently reading" keep working untouched.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists meeting_books (
  meeting_id uuid    not null references meetings(id) on delete cascade,
  book_id    bigint  not null references books(id)    on delete cascade,
  -- Which book this was in the meeting: 0 is the main one. Lets the UI show
  -- them in the order the club actually listed them.
  position   integer not null default 0,
  primary key (meeting_id, book_id)
);

create index if not exists meeting_books_meeting_idx on meeting_books (meeting_id, position);
create index if not exists meeting_books_book_idx    on meeting_books (book_id);

do $$ begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'meeting_books'::regclass
                    and conname = 'meeting_books_position_sane') then
    alter table meeting_books add constraint meeting_books_position_sane
      check (position between 0 and 20);
  end if;
end $$;


-- ============================================================
-- Backfill from the single column that exists today
-- ============================================================
insert into meeting_books (meeting_id, book_id, position)
select m.id, m.book_id, 0
  from meetings m
 where m.book_id is not null
on conflict (meeting_id, book_id) do nothing;


-- ============================================================
-- Keep meetings.book_id in step with position 0
-- ============================================================
-- LEARNING: this is a deliberate, maintained duplicate. The rule for when
-- that is acceptable is that something must guarantee the copy cannot drift
-- — here, a trigger. Without it, `meetings.book_id` would be a second source
-- of truth that slowly disagrees with the first, which is exactly the problem
-- this migration exists to fix.
create or replace function app.sync_meeting_primary_book()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meeting uuid := coalesce(new.meeting_id, old.meeting_id);
begin
  update meetings
     set book_id = (select mb.book_id
                      from meeting_books mb
                     where mb.meeting_id = v_meeting
                     order by mb.position, mb.book_id
                     limit 1)
   where id = v_meeting;
  return null;
end;
$$;

drop trigger if exists meeting_books_sync on meeting_books;
create trigger meeting_books_sync
  after insert or update or delete on meeting_books
  for each row execute function app.sync_meeting_primary_book();


-- ============================================================
-- Row Level Security — same rule as meetings themselves
-- ============================================================
alter table meeting_books enable row level security;

revoke all on meeting_books from anon;
grant select, insert, update, delete on meeting_books to authenticated;

do $$
declare r record;
begin
  for r in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'meeting_books'
  loop
    execute format('drop policy %I on public.meeting_books', r.policyname);
  end loop;
end $$;

-- Scoped through the meeting, the way ratings are scoped through their book:
-- the meeting already knows its club, so storing club_id here as well would
-- create a second place for that fact to live.
create policy meeting_books_select_club
  on meeting_books for select to authenticated
  using (app.is_club_member((select club_id from meetings where id = meeting_id)));

create policy meeting_books_insert_club
  on meeting_books for insert to authenticated
  with check (app.is_club_member((select club_id from meetings where id = meeting_id)));

create policy meeting_books_update_club
  on meeting_books for update to authenticated
  using      (app.is_club_member((select club_id from meetings where id = meeting_id)))
  with check (app.is_club_member((select club_id from meetings where id = meeting_id)));

create policy meeting_books_delete_club
  on meeting_books for delete to authenticated
  using (app.is_club_member((select club_id from meetings where id = meeting_id)));


-- ---- Check ----
select
  (select count(*) from meetings)                                  as meetings,
  (select count(*) from meeting_books)                             as meeting_book_links,
  (select count(*) from meetings where book_id is not null)        as meetings_with_a_book,
  (select count(*) from (select meeting_id from meeting_books
                          group by meeting_id having count(*) > 1) d) as meetings_with_two_plus;
-- Right after this migration, links should equal meetings_with_a_book and
-- meetings_with_two_plus should be 0 — the second books arrive with the
-- seed script that follows.
