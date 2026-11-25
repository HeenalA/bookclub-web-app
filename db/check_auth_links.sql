-- ============================================================================
-- check_auth_links.sql — who can sign in, and as whom?
-- ============================================================================
-- Paste the whole file into the Supabase SQL Editor and press Run.
--
-- It is ONE statement (a UNION ALL), because the Supabase SQL Editor only
-- displays the result of the LAST statement it ran. Several statements means
-- silently seeing only the last answer.
--
-- Read the `verdict` column. Anything that is not OK needs fixing.
-- ============================================================================

select * from (

  -- ---- 1. Every member row, and whether a login is attached ---------------
  select
    1                                              as sort,
    'member'                                       as kind,
    m.id                                           as member_id,
    coalesce(m.email, '(no email)')                as email,
    case
      when m.auth_user_id is null then 'NO LOGIN — cannot sign in'
      else 'OK — can sign in'
    end                                            as verdict,
    (select count(*) from ratings  r where r.member_id = m.id)::text
      || ' ratings, '
      || (select count(*) from reviews  v where v.member_id = m.id)::text
      || ' reviews, '
      || (select count(*) from club_members cm
           where cm.member_id = m.id and cm.status = 'active')::text
      || ' clubs'                                  as detail
  from members m

  union all

  -- ---- 2. Every auth account, and which member row it resolves to ---------
  -- This is the exact question app.current_member_id() asks at runtime.
  select
    2                                              as sort,
    'auth account'                                 as kind,
    coalesce(
      (select m.id from members m where m.auth_user_id = u.id),
      '(none)'
    )                                              as member_id,
    u.email                                        as email,
    case
      when not exists (select 1 from members m where m.auth_user_id = u.id)
        then 'ORPHAN — signs in, resolves to no member'
      when exists (
        select 1 from members m
          join club_members cm on cm.member_id = m.id and cm.status = 'active'
         where m.auth_user_id = u.id
      ) then 'OK — resolves to a member in a club'
      else 'NO CLUB — signs in, sees an empty app'
    end                                            as verdict,
    'confirmed: ' || coalesce(u.email_confirmed_at::text, 'NO — must confirm')
      as detail
  from auth.users u

) t
order by sort, member_id;
