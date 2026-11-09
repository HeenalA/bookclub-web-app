-- ============================================================================
-- Migration 0007 — cover images for books
-- ============================================================================
-- Adds `cover_url`, and nothing else. The URL points at an external image
-- host rather than a copy we store, which is a deliberate and reversible
-- choice: there is no storage bucket to configure, no upload path to secure,
-- and because it is only a column, switching to stored images later changes
-- what is in the column and nothing else.
--
-- The column is plain text rather than a foreign key to anything, because a
-- cover is one fact about a book and has no life of its own.
--
-- Safe to re-run.
-- ============================================================================

alter table books add column if not exists cover_url text;

do $$ begin
  -- A cover URL ends up in an <img src>. Pinning it to https rules out
  -- javascript: and data: URLs being stored as a "cover", which is the way
  -- this column could otherwise become an injection vector. The page's
  -- Content-Security-Policy is the second layer; this is the first.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'books'::regclass
                    and conname = 'books_cover_url_https') then
    alter table books add constraint books_cover_url_https
      check (cover_url is null
             or (cover_url ~ '^https://' and char_length(cover_url) <= 500));
  end if;
end $$;

-- `author` already exists but has never been populated. No constraint change
-- needed; the backfill that follows fills it from the same lookup.

select
  (select count(*) from books)                              as books,
  (select count(*) from books where cover_url is not null)  as with_a_cover,
  (select count(*) from books where author is not null)     as with_an_author;
