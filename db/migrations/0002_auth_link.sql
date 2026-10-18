-- ============================================================================
-- Migration 0002 — link Supabase Auth accounts to member rows
-- ============================================================================
-- Supabase Auth keeps accounts in its own `auth.users` table, which the app
-- should never write to directly. Our app data keys off `members.id` (the text
-- slug: 'maya', 'mina', 'heenal'). Something has to connect the two.
--
-- This migration adds a trigger that fires whenever a new auth account is
-- created (i.e. whenever you invite someone from the Supabase dashboard) and:
--   1. If a `members` row already exists with that email and no account linked
--      yet, it LINKS them. This is how the three original members keep all 81
--      books' worth of ratings and reviews attached to them.
--   2. Otherwise it CREATES a new members row with a generated slug.
--
-- LEARNING: why a database trigger instead of doing this in app code? Because
-- account creation happens in the Supabase dashboard, where our JavaScript is
-- not running. The trigger means there is no code path that can create an
-- account without a matching member row — including paths we did not write.
-- ============================================================================


-- ============================================================
-- Slug generation
-- ============================================================
-- Turns 'Heenal.Amin+books@gmail.com' into 'heenal_amin', then adds a numeric
-- suffix if that is taken ('heenal_amin2', 'heenal_amin3', ...).
create or replace function app.generate_member_slug(p_email text, p_name text)
returns text
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         integer := 1;
begin
  -- Prefer the name if we have one, else the local part of the email.
  v_base := coalesce(nullif(btrim(p_name), ''), split_part(p_email, '@', 1));

  -- Lowercase, collapse anything that is not a letter/digit into '_', trim
  -- stray underscores off the ends.
  v_base := lower(v_base);
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '_', 'g');
  v_base := btrim(v_base, '_');
  v_base := left(v_base, 30);

  -- The members_id_format constraint requires at least 2 characters.
  if char_length(v_base) < 2 then
    v_base := 'member';
  end if;

  v_candidate := v_base;
  while exists (select 1 from members where id = v_candidate) loop
    v_n := v_n + 1;
    v_candidate := left(v_base, 30) || v_n::text;
  end loop;

  return v_candidate;
end;
$$;


-- ============================================================
-- Default colour assignment
-- ============================================================
-- New members get a colour from the design palette rather than all showing up
-- the same grey. Deterministic (based on how many members already exist) so it
-- does not need randomness, and spreads people across the palette.
create or replace function app.default_member_color()
returns text
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  -- The three original member colours first (so a fresh DB reproduces them),
  -- then additional palette entries in the same muted register.
  v_palette text[] := array[
    '#7B9EC9',  -- muted blue      (Maya)
    '#C97B9E',  -- muted pink      (Mina)
    '#9E7BC9',  -- muted purple    (Heenal)
    '#7BC9A4',  -- muted green
    '#C9A47B',  -- muted tan
    '#7BB6C9',  -- muted teal
    '#C97B7B',  -- muted red
    '#A4C97B'   -- muted olive
  ];
  v_count integer;
begin
  select count(*) into v_count from members;
  return v_palette[(v_count % array_length(v_palette, 1)) + 1];
end;
$$;


-- ============================================================
-- The trigger function
-- ============================================================
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_name     text;
  v_slug     text;
  v_initials text;
begin
  -- A display name can be supplied when inviting someone (the dashboard's
  -- "user metadata" field, or `data: { name }` on a signUp call). Fall back to
  -- the email's local part.
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_name := left(v_name, 60);

  -- ---- Case 1: an existing member row is waiting for this email ----------
  -- This is the path that matters for the three original members: seed their
  -- email into `members` first, then invite them, and their whole rating and
  -- review history is theirs automatically.
  update members
     set auth_user_id = new.id,
         email        = coalesce(email, new.email)
   where auth_user_id is null
     and lower(email) = lower(new.email);

  if found then
    return new;
  end if;

  -- ---- Case 2: a genuinely new person ------------------------------------
  v_slug := app.generate_member_slug(new.email, v_name);

  -- Initials: first letter of each of the first two words, uppercased.
  select upper(string_agg(left(word, 1), ''))
    into v_initials
    from (
      select word
        from regexp_split_to_table(v_name, '\s+') as word
       where word <> ''
       limit 2
    ) w;
  v_initials := coalesce(nullif(left(v_initials, 3), ''), upper(left(v_slug, 1)));

  insert into members (id, name, color, initials, email, auth_user_id)
  values (v_slug, v_name, app.default_member_color(), v_initials, new.email, new.id);

  return new;
end;
$$;

-- LEARNING: `after insert` rather than `before insert` — the auth account must
-- genuinely exist before we create a row with a foreign key pointing at it.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();


-- ============================================================
-- Clean-up when an auth account is deleted
-- ============================================================
-- `members.auth_user_id` is `on delete set null`, so deleting an auth account
-- leaves the member row (and all their ratings and reviews) intact but
-- unlinked. That is the behaviour we want: deleting a login should never
-- silently delete years of book history. Re-inviting the same email relinks
-- them via Case 1 above.
