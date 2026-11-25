-- ============================================================================
-- delete_stray_members.sql - remove the member rows the auth trigger invented
-- ============================================================================
-- WHAT THIS DELETES
--
-- Exactly two rows, named explicitly below: 'raomaya11' and 'minacvjetinovic'.
-- Both were created by the 0002 auth-link trigger taking Case 2, because the
-- Supabase Auth accounts were created BEFORE members.email was set. The real
-- accounts have since been relinked to the real member rows by
-- db/fix_auth_links.sql, which left these two behind: unlinked, in no club,
-- and invisible to the app.
--
-- WHY IT IS SAFE
--
-- Seven columns in this schema reference members(id). Four of them CASCADE,
-- which means deleting a member row deletes those rows with it:
--
--     club_members.member_id    cascade
--     ratings.member_id         cascade   <-- years of history
--     reviews.member_id         cascade   <-- years of history
--     announcements.member_id   cascade
--
-- and three SET NULL, which silently blanks attribution instead:
--
--     clubs.created_by          set null
--     books.picked_by           set null  <-- "picked by" disappears
--     meetings.created_by       set null
--
-- So this script refuses to delete a row that is referenced by ANY of the
-- seven, and refuses to touch 'maya', 'mina' or 'heenal' under any
-- circumstances. A row with history attached is not a stray, whatever its
-- name looks like. If a guard trips, the row is kept and the report says so
-- rather than failing silently.
--
-- HOW TO RUN
--
--   Supabase -> SQL Editor -> New query -> paste -> Run.
--
-- It is ONE statement, because the SQL Editor only displays the result of the
-- last statement it ran. The report it prints is the delete's own RETURNING
-- output joined back to the pre-delete counts, so it tells you what actually
-- happened, not what was intended.
--
-- Re-running it is harmless: the second run reports 'NOT FOUND'.
-- ============================================================================

with targets (id) as (
  values
    -- vvv the only rows this script will ever consider vvv
    ('raomaya11'),
    ('minacvjetinovic')
    -- ^^^ the only rows this script will ever consider ^^^
),

-- A snapshot taken BEFORE the delete. A CTE sees the same snapshot as the
-- statement it belongs to, so these counts are the pre-delete truth even
-- though the delete below runs in the same statement.
snapshot as (
  select
    t.id,
    exists (select 1 from members m where m.id = t.id)                        as row_exists,
    coalesce((select m.auth_user_id is not null
                from members m where m.id = t.id), false)                     as has_login,
    (select count(*) from club_members  c where c.member_id = t.id)           as memberships,
    (select count(*) from ratings       r where r.member_id = t.id)           as ratings,
    (select count(*) from reviews       v where v.member_id = t.id)           as reviews,
    (select count(*) from announcements a where a.member_id = t.id)           as announcements,
    (select count(*) from books         b where b.picked_by = t.id)           as books_picked,
    (select count(*) from clubs         k where k.created_by = t.id)          as clubs_created,
    (select count(*) from meetings      g where g.created_by = t.id)          as meetings_created
  from targets t
),

removed as (
  delete from members m
   using snapshot s
   where m.id = s.id
     -- Never the three real members, belt and braces.
     and m.id not in ('maya', 'mina', 'heenal')
     -- Never a row somebody can still sign in as.
     and m.auth_user_id is null
     -- Never a row anything else points at.
     and s.memberships      = 0
     and s.ratings          = 0
     and s.reviews          = 0
     and s.announcements    = 0
     and s.books_picked     = 0
     and s.clubs_created    = 0
     and s.meetings_created = 0
  returning m.id
)

select
  s.id as member_id,
  case
    when not s.row_exists  then 'NOT FOUND - already gone, nothing to do'
    when r.id is not null  then 'DELETED'
    when s.has_login       then 'KEPT - a login still resolves to this row'
    else                        'KEPT - not inert, see the counts'
  end as outcome,
  s.memberships,
  s.ratings,
  s.reviews,
  s.announcements,
  s.books_picked,
  s.clubs_created,
  s.meetings_created
from snapshot s
left join removed r on r.id = s.id
order by s.id;
