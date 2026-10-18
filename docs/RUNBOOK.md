# RUNBOOK.md — getting the app live

Everything you need to do by hand, in order. Steps 1–4 are the important
ones: they close the current security hole. Steps 5–7 get you a shareable URL.

Nothing here is reversible-by-accident, but step 2 changes your live database,
so read step 1 first.

---

## Where things stand

- The Supabase project is **live** with all the real data: 3 members, 81
  books, 216 ratings, 206 reviews.
- The new tables (`clubs`, `club_members`, `meetings`, `announcements`,
  `club_join_codes`) **do not exist yet**.
- **The anon key can currently read everything.** It is published in this
  public repo, and with it anyone can fetch every review over plain HTTP. This
  is what step 2 fixes, and it is the reason to do this sooner rather than
  later.

---

## Step 1 — Preflight (read-only, 2 minutes)

The migrations add real constraints to tables holding four years of data.
Postgres checks every existing row against a new constraint, so one bad row
fails the migration.

Supabase dashboard → **SQL Editor** → paste `db/preflight_check.sql` → Run.

Every `problems` column should read `0`.

> Already verified against your live data on 18 Oct 2026 — all 16 checks
> passed, including no duplicate ratings, no out-of-range values, and no
> orphaned rows. Re-run it anyway if you have changed data since.

---

## Step 2 — Run the migrations (the important one)

In the **SQL Editor**, run these **in order**, one at a time, checking each
succeeds before moving on:

| # | File | What it does |
|---|---|---|
| 1 | `db/migrations/0001_core_schema.sql` | All tables + constraints. Adds columns to your existing tables. |
| 2 | `db/migrations/0002_auth_link.sql` | Trigger linking auth accounts to member rows |
| 3 | `db/migrations/0003_internal_helpers.sql` | Helper functions used by the policies |
| 4 | `db/migrations/0004_rpc.sql` | The membership write API |
| 5 | `db/migrations/0005_rls.sql` | **Row Level Security — this is the fix** |

They are written to be safe to re-run, so if one half-fails you can fix the
cause and run it again.

**After 0005, the app will stop working until you finish step 3.** That is
expected and correct: the anon key now has no access, and there are no
members linked to auth accounts yet.

### Then verify

Run `db/verify_security.sql`. All six checks must say **PASS**:

1. RLS enabled on all nine tables
2. No `using (true)` policy anywhere
3. `anon` has zero table privileges
4. `club_join_codes` is sealed
5. Every `security definer` function pins its `search_path`
6. No function is callable anonymously

---

## Step 3 — Create the club and link the members

1. Open `db/seeds/0001_bootstrap_club.sql`.
2. **Edit the three email lines at the top** with the real addresses for Maya,
   Mina and Heenal. These must match exactly the addresses you use in step 4 —
   matching on email is how the trigger hands each person their existing
   ratings and reviews.
3. Run it in the SQL Editor.

The last query prints a summary. Expect: 1 active club, 3 active memberships,
81 books, **0 books without a club**, and `placeholder_emails_left = 0`.

It also fixes the known typo in book 47 (`Lock` → `Locke` Lamora).

---

## Step 4 — Create the three accounts

**Authentication → Users → Add user → Create new user.** For each person:

- Email: exactly as entered in step 3
- Password: a temporary one you make up
- ✅ **Auto Confirm User** — tick this

Then: **Authentication → Sign In / Providers → Email** and turn
**"Allow new users to sign up" OFF.**

That last switch is the whole invite-only model. With it off there is no
unauthenticated endpoint on the internet that can create an account.

### Why temporary passwords instead of invite emails

Supabase's built-in email service is rate-limited to a handful of messages an
hour and is explicitly not for production use. Hitting that limit silently
breaks invites. Creating the account directly skips email entirely — you tell
each person their temporary password however you normally talk, and they
change it themselves in the app under **Edit profile → Change password**.

If you would rather use email invites, set **Site URL** to
`https://<your-app>/set-password` under Authentication → URL Configuration,
and add both that and your localhost equivalent to the Redirect URLs list.
The `/set-password` page handles both link formats Supabase sends.

### Check the links worked

```sql
select id, name, email, auth_user_id is not null as linked from members;
```

All three should show `linked = true`. If one is `false`, its email does not
match the auth account's — fix the `members.email` value and delete/recreate
that auth user so the trigger fires again.

---

## Step 5 — Run it locally

```bash
cd frontend
cp .env.example .env.local
```

Fill `.env.local` in from **Project Settings → API**:

```
VITE_SUPABASE_URL=https://rzaqlstmcmmzjdqwzgmz.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / public key>
```

Then:

```bash
bash scripts/start.sh
```

Opens <http://localhost:3000>. Sign in with one of the accounts from step 4.

> `.env.local` is gitignored. The anon key is safe to expose anyway — but
> never put the **service_role** key in it. That one bypasses RLS entirely.

---

## Step 6 — Deploy to Vercel

1. <https://vercel.com> → **Add New → Project** → import `HeenalA/bookclub-web-app`.
2. **Root Directory: `frontend`** ← easy to miss, and it fails without it.
3. Framework preset should auto-detect as **Vite**.
4. Add the two environment variables from step 5 (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`).
5. Deploy.

`frontend/vercel.json` handles the rest: SPA routing, a strict
Content-Security-Policy, and the other security headers. See
`frontend/SECURITY-HEADERS.md` for what each one blocks and why.

Finally, back in Supabase → **Authentication → URL Configuration**, add your
Vercel URL to **Redirect URLs** so password resets can come back to it.

---

## Step 7 — Protect yourself from a surprise bill

This is the single most effective thing on the list, and it takes one minute.

**Do not add a payment method to Supabase or Vercel.**

With no card on file, both services cap you at the free tier and *stop*
rather than bill. There is no overage to run up, no scenario where a traffic
spike or a runaway loop costs money. For a 3–6 person private app you will not
come close to the limits:

| | Free tier | You are using |
|---|---|---|
| Supabase database | 500 MB | well under 10 MB |
| Supabase bandwidth | 5 GB/month | a few MB |
| Supabase monthly active users | 50,000 | 3–6 |
| Vercel bandwidth | 100 GB/month | negligible |

**One real thing to watch:** Supabase pauses free projects after ~7 days of
inactivity. That is what happened in October. Opening the app occasionally
prevents it; restoring a paused project is one click in the dashboard.

---

## Step 8 — Prove it is actually locked down

From the repo root, with `frontend/.env.local` filled in:

```bash
bash scripts/verify_anon_lockdown.sh
```

This does what an attacker would: takes the anon key out of your public repo
and asks the REST API for your data. Every table should come back locked and
every function refused.

Check the deployed headers too:

```bash
curl -sI https://<your-app>.vercel.app | grep -i -E 'content-security|x-frame|strict-transport'
```

---

## Afterwards

- `books.author` is empty for all 81 books — the source doc did not reliably
  have authors. Fill them in on the Books page whenever you like.
- `meetings` starts empty, so the home page countdown says "Nothing scheduled
  yet" until you add one on the Meetings page.
- 10 books have no recorded picker, which is correct — the source doc did not
  say who picked them.
