-- ============================================================================
-- Migration 0005 — Row Level Security
-- ============================================================================
-- This is the file that actually makes the app private. Everything before it
-- builds the shape; this decides who may see and change what.
--
-- WHAT THIS REPLACES
-- The first version of this database had `using (true)` read policies on
-- members, books, ratings and reviews — "anyone may read every row". Combined
-- with the anon key being published in a public repository (which is normal
-- and fine; the key is designed to be public), that meant anybody could fetch
-- every review the club had ever written straight from the REST API. This file
-- closes that. After it runs, the anon key can read exactly zero rows.
--
-- HOW RLS ACTUALLY WORKS, BRIEFLY
-- With RLS enabled on a table, every query is rewritten to include the
-- matching policy's condition. No policy means no rows — the default is deny,
-- not allow. So a table with RLS on and no policies is sealed, and you open it
-- deliberately, one rule at a time. That is why this file is written as
-- "enable, then grant the minimum", and why `club_join_codes` gets RLS with no
-- policies at all.
--
-- TWO LAYERS, NOT ONE
-- RLS filters *rows*. Postgres `grant`/`revoke` controls *tables and columns*.
-- They are independent, and this file uses both: RLS decides which rows of
-- `books` you can see, while a column grant is what stops you from editing
-- anyone's email. A table with a permissive policy but no grant is still
-- unreadable, and vice versa.
-- ============================================================================


-- ============================================================
-- 0. Clear out every existing policy on these tables first
-- ============================================================
-- This migration is meant to be re-runnable, and it is the file that decides
-- who can read the club's reviews. If an older permissive policy (like the
-- original `using (true)`) were left in place alongside the new ones, it would
-- defeat all of them — policies are OR'd together, so the most permissive one
-- wins. Dropping everything first means the state after this file runs is
-- exactly what this file says, with no history leaking through.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in (
         'members', 'clubs', 'club_members', 'club_join_codes',
         'books', 'ratings', 'reviews', 'meetings', 'announcements'
       )
  loop
    execute format('drop policy %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table members         enable row level security;
alter table clubs           enable row level security;
alter table club_members    enable row level security;
alter table club_join_codes enable row level security;
alter table books           enable row level security;
alter table ratings         enable row level security;
alter table reviews         enable row level security;
alter table meetings        enable row level security;
alter table announcements   enable row level security;


-- ============================================================
-- 1. Lock out anonymous access entirely
-- ============================================================
-- RLS alone would already deny `anon` everything, since it gets no policies
-- below. Revoking the table privileges too means an anonymous request fails at
-- the permission check before RLS is even consulted. Two independent reasons
-- it cannot read your data is the right number for a key that is published in
-- a public repository.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;


-- ============================================================
-- 2. Table and column privileges for signed-in users
-- ============================================================
-- Granting explicitly rather than relying on Supabase's defaults, so this file
-- is a complete and readable statement of what a logged-in user may touch.

-- members: read (filtered by policy), and update only your own presentation.
--
-- LEARNING: this is a column-level grant, and it is doing real work. The
-- update policy below already restricts you to your own row, but "your own
-- row" still includes your `email` and `auth_user_id` — the two columns that
-- decide which auth account you are. Revoking update on the table and then
-- granting it back on three named columns means a request to change those two
-- is rejected by the permission system before any policy runs. Identity
-- columns are changed by the auth trigger, never by a client.
revoke all    on members from authenticated;
grant  select on members to   authenticated;
grant  update (name, color, initials) on members to authenticated;

-- clubs / club_members: readable, but never writable directly. Every change
-- goes through the functions in migration 0004.
revoke all    on clubs        from authenticated;
grant  select on clubs        to   authenticated;
revoke all    on club_members from authenticated;
grant  select on club_members to   authenticated;

-- club_join_codes: no grants and no policies. Unreachable over the API by
-- anyone. The only way in or out is public.club_join_code() and
-- public.regenerate_join_code(), both of which check for admin first.
revoke all on club_join_codes from authenticated, anon;

-- Ordinary club content: full CRUD, scoped by the policies below.
grant select, insert, update, delete on books         to authenticated;
grant select, insert, update, delete on ratings       to authenticated;
grant select, insert, update, delete on reviews       to authenticated;
grant select, insert, update, delete on meetings      to authenticated;
grant select, insert, update, delete on announcements to authenticated;

-- `books.id` is an identity column, so inserting a book needs its sequence.
grant usage, select on all sequences in schema public to authenticated;


-- ============================================================
-- 3. MEMBERS
-- ============================================================
-- You can see yourself, and you can see people you share an active club with.
-- Everyone else on the site is invisible to you — without this, any logged-in
-- user could page through the entire `members` table and enumerate every user
-- and email address the app knows about.
create policy members_select_self_or_clubmates
  on members for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or app.shares_club_with(id)
  );

-- Your own name, colour and initials. Which columns are even eligible is
-- settled by the column grant above.
create policy members_update_self
  on members for update
  to authenticated
  using      (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());


-- ============================================================
-- 4. CLUBS
-- ============================================================
-- Any club you have ever been attached to — active, pending or left. The
-- looser helper is used here on purpose: the user home page lists clubs you
-- have left ("Was Your Bookclub") and clubs awaiting approval, and it needs
-- their names to do that.
--
-- This row is only a name, a visibility flag and a founding date. Everything
-- that is actually private about a club — its members, books, ratings,
-- reviews, meetings — is gated on an ACTIVE membership by the policies below,
-- and the join code lives in its own sealed table. Clubs you were never
-- attached to are not readable here at all; browsing those goes through
-- public.discover_clubs(), which returns a fixed column list and no code.
create policy clubs_select_attached
  on clubs for select
  to authenticated
  using (app.has_club_membership(id));


-- ============================================================
-- 5. CLUB_MEMBERS
-- ============================================================
-- Your own membership rows always (so the user home page can show clubs you
-- have left, and requests awaiting approval), plus everyone's rows in clubs
-- you are active in (so the settings page can list members, and admins can
-- see pending requests).
--
-- Note there are no insert, update or delete policies here at all. This table
-- holds the approval state and the admin flags, so it is the one table where a
-- subtly wrong write rule would be worst — someone flipping their own `status`
-- to 'active' or their own `role` to 'admin'. Making it read-only over the API
-- and routing every change through an admin-checking function removes that
-- whole category of mistake rather than trying to out-think it.
create policy club_members_select_own_or_clubmates
  on club_members for select
  to authenticated
  using (
    member_id = (select app.current_member_id())
    or app.is_club_member(club_id)
  );


-- ============================================================
-- 6. BOOKS
-- ============================================================
create policy books_select_club
  on books for select
  to authenticated
  using (app.is_club_member(club_id));

-- Any active member may add a book and edit its details. These clubs are three
-- or four friends who take turns picking; making book edits admin-only would
-- be friction with nothing to show for it.
create policy books_insert_club
  on books for insert
  to authenticated
  with check (app.is_club_member(club_id));

create policy books_update_club
  on books for update
  to authenticated
  using      (app.is_club_member(club_id))
  with check (app.is_club_member(club_id));

-- Deleting is admin-only, because `ratings` and `reviews` cascade from books:
-- removing one book silently removes everybody's reviews of it. That is the
-- one destructive action in the app, so it gets the narrower rule.
create policy books_delete_admin
  on books for delete
  to authenticated
  using (app.is_club_admin(club_id));


-- ============================================================
-- 7. RATINGS
-- ============================================================
-- Readable by anyone in the book's club — the whole point of the ratings table
-- is comparing everyone's scores side by side.
create policy ratings_select_club
  on ratings for select
  to authenticated
  using (app.is_club_member(app.book_club_id(book_id)));

-- Writable only as yourself. This is the rule the old UI only *implied* by
-- greying out other people's columns; anyone could have edited another
-- member's rating from the browser console. Now the database refuses.
create policy ratings_insert_own
  on ratings for insert
  to authenticated
  with check (
    member_id = (select app.current_member_id())
    and app.is_club_member(app.book_club_id(book_id))
  );

create policy ratings_update_own
  on ratings for update
  to authenticated
  using (
    member_id = (select app.current_member_id())
    and app.is_club_member(app.book_club_id(book_id))
  )
  with check (
    member_id = (select app.current_member_id())
    and app.is_club_member(app.book_club_id(book_id))
  );

create policy ratings_delete_own
  on ratings for delete
  to authenticated
  using (member_id = (select app.current_member_id()));


-- ============================================================
-- 8. REVIEWS
-- ============================================================
create policy reviews_select_club
  on reviews for select
  to authenticated
  using (app.is_club_member(app.book_club_id(book_id)));

create policy reviews_insert_own
  on reviews for insert
  to authenticated
  with check (
    member_id = (select app.current_member_id())
    and app.is_club_member(app.book_club_id(book_id))
  );

create policy reviews_update_own
  on reviews for update
  to authenticated
  using (
    member_id = (select app.current_member_id())
    and app.is_club_member(app.book_club_id(book_id))
  )
  with check (
    member_id = (select app.current_member_id())
    and app.is_club_member(app.book_club_id(book_id))
  );

create policy reviews_delete_own
  on reviews for delete
  to authenticated
  using (member_id = (select app.current_member_id()));


-- ============================================================
-- 9. MEETINGS
-- ============================================================
-- Any active member can schedule and edit meetings. Same reasoning as books:
-- a three-person club rearranging a date does not need an approval step.
create policy meetings_select_club
  on meetings for select
  to authenticated
  using (app.is_club_member(club_id));

create policy meetings_insert_club
  on meetings for insert
  to authenticated
  with check (app.is_club_member(club_id));

create policy meetings_update_club
  on meetings for update
  to authenticated
  using      (app.is_club_member(club_id))
  with check (app.is_club_member(club_id));

create policy meetings_delete_club
  on meetings for delete
  to authenticated
  using (app.is_club_member(club_id));


-- ============================================================
-- 10. ANNOUNCEMENTS
-- ============================================================
create policy announcements_select_club
  on announcements for select
  to authenticated
  using (app.is_club_member(club_id));

create policy announcements_insert_own
  on announcements for insert
  to authenticated
  with check (
    member_id = (select app.current_member_id())
    and app.is_club_member(club_id)
  );

create policy announcements_update_own
  on announcements for update
  to authenticated
  using      (member_id = (select app.current_member_id()))
  with check (member_id = (select app.current_member_id()));

-- You can always delete your own post; an admin can also delete anyone's, so
-- there is a way to take down something inappropriate without the author.
create policy announcements_delete_own_or_admin
  on announcements for delete
  to authenticated
  using (
    member_id = (select app.current_member_id())
    or app.is_club_admin(club_id)
  );
