-- ============================================================================
-- verify_security.sql — run AFTER the migrations.
-- ============================================================================
-- Six checks. Every one must say PASS.
--
-- This is not decoration. The difference between "I wrote RLS policies" and
-- "my data is private" is whether anyone checked, and a single table with RLS
-- left off is enough to expose everything linked to it.
--
-- Read-only. Re-run it any time you add a table.
--
-- NOTE ON THE SQL EDITOR: deliberately ONE statement. The Supabase SQL Editor
-- shows only the last statement's result when you run several, so separate
-- SELECTs would quietly hide five of the six checks.
-- ============================================================================

with checks as (

  -- ---- 1. RLS is on everywhere ------------------------------------------
  -- A table with RLS off ignores policies completely and is readable by
  -- anyone with a key. The single most important check here.
  select 1 as ord,
         'RLS enabled on all 9 app tables' as check_name,
         (select count(*) filter (where not c.relrowsecurity) = 0
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public'
             and c.relname in ('members','clubs','club_members','club_join_codes',
                               'books','ratings','reviews','meetings','announcements')
         ) as ok,
         coalesce((select string_agg(c.relname, ', ')
                     from pg_class c
                     join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and not c.relrowsecurity
                      and c.relname in ('members','clubs','club_members','club_join_codes',
                                        'books','ratings','reviews','meetings','announcements')),
                  'none') as detail

  -- ---- 1b. All 9 tables actually exist -----------------------------------
  -- Without this, check 1 could pass vacuously: a table that does not exist
  -- has no RLS to be missing.
  union all
  select 7, 'All 9 app tables exist',
         (select count(*) = 9 from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r'
             and c.relname in ('members','clubs','club_members','club_join_codes',
                               'books','ratings','reviews','meetings','announcements')),
         coalesce((select string_agg(t, ', ') from unnest(array[
                     'members','clubs','club_members','club_join_codes',
                     'books','ratings','reviews','meetings','announcements']) t
                    where not exists (
                      select 1 from pg_class c
                        join pg_namespace n on n.oid = c.relnamespace
                       where n.nspname = 'public' and c.relname = t)),
                  'all present')

  -- ---- 2. No unconditional policy ---------------------------------------
  -- Catches a `using (true)` policy — what this database had before. Policies
  -- are OR'd together, so one of these cancels out every other rule.
  union all
  select 2, 'No using(true) policies remain',
         (select count(*) = 0 from pg_policies
           where schemaname = 'public'
             and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')),
         coalesce((select string_agg(tablename || '.' || policyname, ', ')
                     from pg_policies
                    where schemaname = 'public'
                      and (coalesce(qual, '') = 'true'
                           or coalesce(with_check, '') = 'true')), 'none')

  -- ---- 3. anon has nothing ----------------------------------------------
  -- `anon` is the role the published key maps to. RLS would deny it anyway
  -- for lack of policies; this is the second, independent layer.
  union all
  select 3, 'anon role has zero table privileges',
         (select count(*) = 0 from information_schema.role_table_grants
           where grantee in ('anon', 'PUBLIC') and table_schema = 'public'),
         coalesce((select string_agg(distinct table_name || ':' || privilege_type, ', ')
                     from information_schema.role_table_grants
                    where grantee in ('anon', 'PUBLIC')
                      and table_schema = 'public'), 'none')

  -- ---- 4. Join codes sealed ---------------------------------------------
  union all
  select 4, 'club_join_codes is sealed (no policies, no grants)',
         ((select count(*) from pg_policies
            where schemaname = 'public' and tablename = 'club_join_codes') = 0
          and
          (select count(*) from information_schema.role_table_grants
            where table_schema = 'public' and table_name = 'club_join_codes'
              and grantee in ('anon','authenticated','PUBLIC')) = 0),
         'reachable only via club_join_code() and regenerate_join_code()'

  -- ---- 5. search_path pinned --------------------------------------------
  -- A `security definer` function bypasses RLS. Without a pinned search_path,
  -- a caller who can create objects could put their own table where the
  -- function looks first, and it would be read with elevated rights.
  union all
  select 5, 'Every security-definer function pins search_path',
         (select count(*) = 0
            from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'app') and p.prosecdef
             and not exists (
               select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
                where cfg like 'search_path=%')),
         coalesce((select string_agg(n.nspname || '.' || p.proname, ', ')
                     from pg_proc p
                     join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname in ('public', 'app') and p.prosecdef
                      and not exists (
                        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
                         where cfg like 'search_path=%')), 'none')

  -- ---- 6. No anonymous RPC ----------------------------------------------
  -- Postgres grants EXECUTE to PUBLIC on new functions by default, and PUBLIC
  -- includes anon. Migration 0004 revokes that; this confirms it stuck.
  union all
  select 6, 'No public-schema function callable by anon',
         (select count(*) = 0 from information_schema.role_routine_grants
           where grantee in ('anon', 'PUBLIC') and specific_schema = 'public'),
         coalesce((select string_agg(distinct routine_name, ', ')
                     from information_schema.role_routine_grants
                    where grantee in ('anon', 'PUBLIC')
                      and specific_schema = 'public'), 'none')
)
select
  check_name,
  case when ok then 'PASS' else 'FAIL' end as result,
  detail as offenders_or_note
from checks
order by ok, ord;   -- failures float to the top


-- ============================================================================
-- Want to eyeball the full policy list? Run this on its own, separately —
-- it cannot share the statement above.
-- ============================================================================
--   select tablename, policyname, cmd, roles::text, qual, with_check
--     from pg_policies where schemaname = 'public'
--    order by tablename, cmd, policyname;
