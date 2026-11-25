-- ============================================================================
-- check_logins.sql -- why can't someone sign in?
-- ============================================================================
-- Paste the whole file into the Supabase SQL Editor and press Run.
--
-- Pure ASCII on purpose: the strings below are SELECTed as data, not comments,
-- and the SQL Editor mangles anything fancier.
--
-- The anon key cannot read auth.users, which is correct and deliberate -- it
-- means this question can only be answered from inside the dashboard. That is
-- why this is a script you run rather than something the app can report.
--
-- Read the `problem` column. It checks the four things that actually stop a
-- password login, in the order Supabase Auth checks them.
-- ============================================================================

select
  u.email,

  -- The whole diagnosis, in one column.
  case
    when u.deleted_at is not null
      then '1. DELETED - the account is soft-deleted'
    when u.encrypted_password is null or u.encrypted_password = ''
      then '2. NO PASSWORD - created by Invite, not by Create new user. '
        || 'Set one with Reset password, or delete and re-create.'
    when u.email_confirmed_at is null and u.confirmed_at is null
      then '3. NOT CONFIRMED - Auto Confirm User was not ticked. '
        || 'Fix: tick Confirm email on this user.'
    when u.banned_until is not null and u.banned_until > now()
      then '4. BANNED until ' || u.banned_until::text
    else 'NONE - this account can sign in. A failure here is a wrong '
        || 'password or a mistyped email address.'
  end                                              as problem,

  -- Has this account EVER signed in successfully?
  coalesce(u.last_sign_in_at::text, 'never signed in')  as last_sign_in,

  -- Does it resolve to a member row with a club? This is the exact question
  -- app.current_member_id() asks after login succeeds.
  coalesce(
    (select m.id from members m where m.auth_user_id = u.id),
    '(NO MEMBER ROW - would sign in to an empty app)'
  )                                                as resolves_to_member,

  (select count(*) from club_members cm
     join members m on m.id = cm.member_id
    where m.auth_user_id = u.id and cm.status = 'active')  as active_clubs,

  -- Invisible-character trap: a trailing space or a smart quote pasted into
  -- the email field at account creation is impossible to see in the user list
  -- but makes the address you type a different address. If these two columns
  -- disagree, that is your bug.
  length(u.email)                                  as email_length,
  length(btrim(u.email))                           as email_length_trimmed,

  u.created_at
from auth.users u
order by u.created_at;
