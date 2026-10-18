# Software Development Document — To Read or Not to Read

**Last updated:** 18 October 2026

> **Two copies of this document exist.** This file is the version-controlled
> snapshot that lives with the code. The editable working copy is at
> <https://claude.ai/code/artifact/f33ac4e9-3b0c-4a89-9b67-34e5d1d0909c> —
> edit and comment there, and it gets re-exported here when it changes
> materially. If the two ever disagree, the code is the real authority.

*A living specification. Edit freely — this is the working reference for the
project, not a frozen artifact.*

---

## Overview

A private web app for a book club, replacing a Google Doc that has tracked 81
books, 216 ratings and 206 reviews since June 2020. It is built for 3 people
now, designed for 2–3 clubs of a few friends each, and deliberately not built
for public signup.

### What it does

Each club gets a home page with a countdown to the next meeting, a shelf of
books, a ratings grid where every member scores each book, a reviews grid of
written reviews, a meetings log, and a settings page for members and admin. A
person can belong to several clubs and see their own reading history across
all of them.

### Status at a glance

| Area | State |
| --- | --- |
| Database schema | Written, not yet run against the live database |
| Security policies | Written, not yet applied — **the current database is readable by anyone with the public key** |
| Frontend | Built: 12 routes, 19 components, builds and lints clean |
| Hosting | Not deployed |
| Data | Live and intact — 3 members, 81 books, 216 ratings, 206 reviews |

### Two things that are true right now

**The data is exposed.** The database's access rules currently allow anyone to
read every table. The key needed to do so is published in the public GitHub
repo, which is normal and by design — the key is meant to be public, and the
access rules are supposed to be what protects the data. They are not yet.
Fixing this is step 2 of the runbook and is the highest-priority outstanding
task.

**Nothing was lost in the October pause.** Supabase pauses free projects after
about a week of inactivity, and a paused project stops resolving on the
network, which is easy to mistake for deletion. The project was restored with
all data intact.

### How to use this document

This is a living specification, not a record of a finished thing. Edit it
directly — correct anything wrong, add constraints, reprioritise. The
**Feature backlog** section is the one to edit when adding features; it notes
where in the codebase each change would land, so a feature request can turn
into work without rediscovering the architecture each time.

---

## Architecture

A React single-page app talks directly to a Postgres database, with all
authorisation enforced inside the database. There is no application server.

### The stack

| Layer | Choice | Version |
| --- | --- | --- |
| UI | React + Vite | 19.3.1 / 8.3.4 |
| Routing | React Router | 7.18.4 |
| Styling | CSS Modules + design tokens | — |
| Database | Postgres via Supabase | — |
| Auth | Supabase Auth, email + password | — |
| Client library | supabase-js | 2.118.0 |
| Hosting | Vercel (static) | — |
| CI | Jenkins | — |

### Four decisions that shaped it

**React rather than plain JavaScript.** The app was three static HTML pages.
It is now twelve routes with editing, forms and shared state. The deciding
factor was not page count but editing: the old ratings table rebuilt its
entire HTML on every change, which is fine for display and destroys focus,
cursor position and half-typed text the moment cells become editable. Fixing
that by hand means tracking which DOM node maps to which record — which is
what React already is. Component reuse mattered too: the member avatar appears
on six of the seven designed pages.

*Accepted cost:* a build step, a dependency tree, and a rewrite of working
pages. The CSS and the database work carried over unchanged.

**No application server.** The browser talks to Postgres directly. The
alternative — a Python/FastAPI service — was rejected on three grounds.
Authorisation would become "is there a correct permission check in every route
handler?", where one miss exposes everything; in the database, the rule applies
to every query path including ones written later. Free-tier hosting for such a
service sleeps after 15 minutes and takes 50+ seconds to wake, so a club
checking in weekly would hit a cold start every visit. And it is a second
deployment to patch, monitor and secure.

*Accepted cost:* no server-side rate limiting, no place to keep a secret API
key, and the database shape is visible to the client. When server-side code is
eventually needed — book-cover lookup, reminder emails — the answer is Supabase
Edge Functions, which are serverless and sit next to the database, not a
separate always-on service.

**Invite-only accounts.** There is no signup form. An admin creates each
account in the Supabase dashboard with a temporary password; the person changes
it in the app. The driving reason is operational rather than philosophical:
Supabase's built-in email service is rate-limited to a handful of messages an
hour and is explicitly not for production, so any flow that depends on it
breaks quietly at the worst moment. The security benefit is real but secondary
— with signup disabled there is no unauthenticated endpoint on the internet
that writes to the database.

*Reversible:* the schema already supports request-and-approve (it is how public
clubs work), so enabling self-serve signup later is a settings change plus one
page, not a redesign.

**CSS Modules over Tailwind.** Changing how every card looks should be one edit
in `Card.module.css`, not a search across every file for utility classes.
Scoping also means adding a feature cannot accidentally restyle an existing
page.

### Request flow

A page calls a function in `src/lib/api/`, which calls supabase-js, which makes
an HTTPS request carrying the signed-in user's token. Postgres evaluates the
row-level policies for that user and returns only permitted rows. Nothing in
the browser decides what the user may see — the browser only decides what to
ask for.

---

## Security model

The whole model rests on one idea: **the browser is not trusted, so
authorisation lives in the database.** A client with the public key and a REST
tool can ask for anything; what it gets back is decided by Postgres.

### The starting problem

The database currently has read policies that permit everything. Combined with
the public key being in a public repo, every review is readable by anyone. This
is verified, not hypothetical — a plain HTTP request returned review text during
this work. Migration `0005_rls.sql` is the fix.

### Reads and writes are protected differently

This is the central design choice and the one worth understanding.

**Reads** are governed by Row Level Security policies. With RLS on, every query
is silently rewritten to include the policy's condition. No policy means no
rows — the default is deny, so a table is sealed until deliberately opened.

**Privileged writes** are not governed by policies at all. The `clubs`,
`club_members` and `club_join_codes` tables have no write policies, making them
unwritable through the API. Every membership change goes through a database
function that checks permission first.

The reason is that a write policy sees only the *new* row, not the old one.
Expressing "a member may set their own status to inactive, but only an admin may
set someone's status to active" means reasoning about every combination of old
and new values across three columns — and getting one case wrong lets someone
approve their own pending membership. A function states the rule once: check
admin, then act.

Ordinary content — books, ratings, reviews, meetings, announcements — *is*
written directly under RLS, because there the rule genuinely is as simple as
"your own row, in a club you belong to".

### The layers

| Layer | What it blocks | Where |
| --- | --- | --- |
| Anonymous lockout | The public key reads nothing. Privileges revoked *and* no policies — two independent reasons it fails. | `0005_rls.sql` |
| Row Level Security | You see only clubs you belong to, and only members you share a club with. | `0005_rls.sql` |
| Write-through functions | No path exists to approve yourself, promote yourself, or read a join code you do not administer. | `0004_rpc.sql` |
| Column grants | `members.email` and `auth_user_id` are not updatable by anyone, even on your own row. | `0005_rls.sql` |
| Check constraints | Impossible states cannot be stored, whatever the client sends. | `0001_core_schema.sql` |
| Content-Security-Policy | Injected script cannot run; nothing can exfiltrate to another domain. | `vercel.json` |

### Three details worth knowing

**Join codes live in their own table.** `club_join_codes` has RLS on, zero
policies, and no privileges granted to anyone. It is unreachable through the
API. Had the code been a column on `clubs`, any future read policy on that table
— say, one added to let people browse public clubs — would leak it. Separating it
means the code can only be reached by code written on purpose to reach it. Two
functions do so, both checking for admin first.

**Helper functions are deliberately unreachable.** The functions the policies
call run with elevated privileges and bypass RLS by design — that is what
prevents infinite recursion when a policy on `club_members` needs to read
`club_members`. Because they bypass RLS, they live in an `app` schema that is
not exposed over the API. Exposing them would hand out exactly the read access
the policies exist to prevent.

**Every elevated function pins its search path.** Without that, a caller able to
create objects could place their own table where the function looks first, and
the function — running with elevated rights — would read it. The security
verification script checks this automatically for every such function.

### What this model does not do

- **No rate limiting of our own.** We rely on Supabase's. For 3–10 known users
  this is acceptable; it would not be for a public app.
- **The schema is visible.** A client can see table and column names. This is a
  consequence of no application server and is judged acceptable, since knowing
  the shape grants no access.
- **Admins are trusted within their club.** A club admin can remove members and
  delete books, which cascades to everyone's reviews of that book. The UI warns
  before this; nothing prevents a malicious admin.
- **RLS changes are not retroactive.** Tightening the policies protects data
  from now on. It cannot un-read anything already read during the open period.

---

## Data model

Nine tables. Four already exist with real data; five are new. The authoritative
definition is `db/migrations/0001_core_schema.sql` — this section explains the
shape and the reasoning.

### Tables

| Table | Holds | Status |
| --- | --- | --- |
| `members` | A person, independent of any club | Live, gaining `email` and `auth_user_id` |
| `clubs` | One book club | New |
| `club_members` | One row per person per club, ever | New |
| `club_join_codes` | The secret code for a private club | New, sealed |
| `books` | A book on one club's shelf | Live, gaining `club_id` |
| `ratings` | One person's score for one book | Live |
| `reviews` | One person's written review of one book | Live |
| `meetings` | A scheduled or past meeting | New |
| `announcements` | A short club-wide note | New |

### How they connect

A person's identity is club-independent: `members` holds who they are,
`club_members` holds which clubs they are in and whether they are an admin
there. A book belongs to exactly one club. Ratings and reviews attach to a book
and a member, and have no club column of their own — they are scoped through the
book, which already knows its club. That avoids duplicating `club_id` onto
hundreds of rows and keeps it impossible for a rating's club to disagree with
its book's.

### Modelling decisions

**Leaving a club is a soft delete.** `club_members.status` moves to `inactive`
rather than the row being deleted, and `(club_id, member_id)` is unique — one row
per person per club, forever. Rejoining flips the same row back. This preserves
the relationship, so a club's member list can show "left, can rejoin" instead of
the person vanishing from its history. Ratings and reviews were never at risk
either way; they are keyed by member and book, with no link to membership.

**Admin is per club, not global.** Creating a club makes you its admin. It does
not make you an admin of clubs you merely joined.

**Club names are unique only among active clubs.** Implemented as a partial
unique index — a uniqueness rule with a `WHERE` clause, which a plain column
constraint cannot express. Deactivating a club frees its name.

**Meeting numbers are computed, never stored.** There is no `meeting_number`
column. Display numbers come from date order at query time, so deleting meeting
#2 renumbers the rest with nothing to update and no chance of stored numbers
drifting out of order.

**Book display numbers are per club.** `books.id` is global and ascending. A
second club's first book would otherwise display as "#82", so the number shown
is computed from each book's position within its own club.

**The jail value is real data.** A rating of `-1000` is the club's long-standing
way of marking a book irredeemable. It gets its own row at the bottom of the
ratings grid and counts as 1 when averaging. It is a genuine value with a check
constraint, not a magic null.

### Constraints that do real work

| Constraint | Why it exists |
| --- | --- |
| `members_color_format` | Colours are interpolated into inline styles, so pinning them to `#RRGGBB` is a genuine injection guard |
| `reviews_text_len` (5000) | Abuse and cost control — without it one client could write megabytes into a free-tier database |
| `ratings_value_valid` | Jail, or 1–10 in half-point steps. The `value * 2 = trunc(value * 2)` trick is how SQL says "a multiple of 0.5" |
| `ratings_member_book_unique` | Required for saving a rating to work at all — see below |

### One migration subtlety

The live `ratings` table was created in an earlier session with its own
surrogate `id` and no uniqueness rule on `(member_id, book_id)`. The app saves a
rating with an upsert, which requires a unique index on exactly those columns —
without one Postgres rejects the statement and every rating edit fails. The
migration adds that index explicitly rather than relying on the primary key it
declares, because on an existing table the `CREATE TABLE` is skipped entirely.
This is the general hazard of writing migrations that must work on both a fresh
and an established database.

---

## Application structure

All frontend code lives under `frontend/src/`, split so that data logic and
presentation never mix.

### Folders

| Path | Holds |
| --- | --- |
| `src/routes/` | One file per page |
| `src/components/ui/` | Presentational primitives — no data logic |
| `src/components/club/` | Club-specific display components |
| `src/components/layout/` | Shells and navigation |
| `src/lib/api/` | Every database call, one module per domain |
| `src/lib/hooks/` | Shared state: auth, current club, async loading |
| `src/lib/util/` | Colour derivation, date formatting |
| `src/styles/` | `tokens.css` and `global.css` |

### Routes

| Path | Page | Access |
| --- | --- | --- |
| `/login` | Sign in | Public |
| `/set-password` | Invite and reset landing | Token |
| `/style` | Live component gallery | Public, no database |
| `/clubs` | Your clubs, books, ratings, reviews | Signed in |
| `/club/:id` | Club home | Active member |
| `/club/:id/books` | Shelf, add and edit books | Active member |
| `/club/:id/ratings` | Ratings grid, click to edit | Active member |
| `/club/:id/reviews` | Reviews grid, click to edit | Active member |
| `/club/:id/meetings` | Meetings, add and edit | Active member |
| `/club/:id/settings` | Members, colours, admin | Active member |

Club pages sit under a layout route that loads the club and its members once and
shares them through context, so six pages do not each re-fetch the same two
queries on every navigation.

### The design system

**`src/styles/tokens.css` is the file to edit for aesthetics.** Every colour,
font, type size, spacing step, corner radius, shadow and animation duration is a
variable there. Components reference the names and never hardcode a value, so
restyling the whole app is one file.

**Member colours are deliberately not tokens.** They were, as `--color-maya` and
friends, which quietly limited the app to exactly three people. They now live on
each member's database row, and the pale background and dark text of each chip
are derived from that colour at runtime by converting to HSL, holding the hue and
rebuilding lightness and saturation. Checked against the original hand-picked
shades, the derived values land within a hair of them — and a fourth member now
simply works.

**`/style` renders every component in every state on one page.** Change a token,
see everything that moved at once. It reads no database, so it works on a fresh
clone before the project is connected.

### Where to change things

| To do this | Change |
| --- | --- |
| Restyle everything | `src/styles/tokens.css` |
| Restyle one component | That component's `.module.css` |
| Add a page | A file in `src/routes/` + two lines in `App.jsx` |
| Add a database call | The matching module in `src/lib/api/` |
| Change a permission rule | `db/migrations/0005_rls.sql`, then re-run it |
| Add a membership action | `db/migrations/0004_rpc.sql` + a wrapper in `lib/api/clubs.js` |

### Patterns used throughout

**Every query returns through one unwrapper.** supabase-js does not throw on a
failed query — it resolves with an `error` property instead, so a forgotten check
is silent and fails later somewhere confusing. All calls funnel through
`unwrap()`, which throws a friendly error. Database constraint names are
translated into sentences a person can act on.

**Loading state is derived, not stored.** The obvious way to write a data hook is
to set a loading flag at the top of an effect, but that schedules an extra render
and React's compiler rules flag it. Instead each request carries a key from its
dependencies, and the hook is loading whenever the result it holds was produced
for a different key. The flag cannot drift out of step with what is actually in
flight.

**Stale responses are discarded.** Navigating quickly between clubs leaves two
requests in flight; if the first lands second it would overwrite the second's
data. Each effect's cleanup marks its request abandoned.

**React escapes text automatically.** The old code needed an `escapeHtml()`
helper before putting any review into the page. React escapes interpolated text
by default, which retires that entire class of bug.

---

## Build and deploy

### Running it locally

```
bash scripts/start.sh
```

Installs dependencies on first run, warns if the environment file is missing,
and opens `http://localhost:3000`.

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint, including React Compiler rules |
| `npm run smoke` | Headless browser checks against a running preview |

### Configuration

Two environment variables, in `frontend/.env.local`, which is gitignored:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon key>
```

Vite only exposes variables prefixed `VITE_` to browser code. That prefix is a
safety rail: anything without it is simply absent from the bundle, so a server
secret cannot leak by accident. Both values above are safe to expose. **The
`service_role` key must never appear in frontend code or this repo** — it
bypasses all access rules.

When the variables are missing the app shows a short setup screen rather than a
blank page and a console error.

### Bundle

| Chunk | Size | Gzipped |
| --- | --- | --- |
| App code | 92 kB | 25 kB |
| React | 259 kB | 82 kB |
| supabase-js | 214 kB | 55 kB |
| CSS | 29 kB | 6 kB |

Dependencies are split from app code deliberately. The total is unchanged; the
point is caching. In one bundle, editing a button forces every visitor to
re-download React. Split, the vendor files keep their names and stay cached
across deploys.

### Deployment

Vercel, building from `main` with the root directory set to `frontend`. Static
output, no server. `frontend/vercel.json` carries the SPA routing rewrite, the
security headers, and immutable caching for hashed assets. See
`frontend/SECURITY-HEADERS.md` for what each header blocks and why.

### Continuous integration

Jenkins runs on Docker locally. It currently checks out `main`, installs Python,
runs four pytest tests against `backend/app/validators.py`, and publishes a
JUnit report.

The backend folder holds no running application. It exists because the validator
mirrors a database constraint exactly, which gave the pipeline one genuine piece
of logic to test rather than a fake example. Planned: move the pipeline
definition into the repo as a `Jenkinsfile`, and add frontend build and lint
stages.

### Cost model

Everything runs on free tiers, and the protection is structural rather than
vigilant: **with no payment method on file, Supabase and Vercel cap you at the
free tier and stop, rather than billing.** There is no overage to accumulate, so
no traffic spike or runaway loop can cost money.

| Resource | Free tier | Current use |
| --- | --- | --- |
| Supabase database | 500 MB | under 10 MB |
| Supabase bandwidth | 5 GB/month | a few MB |
| Supabase monthly active users | 50,000 | 3–6 |
| Vercel bandwidth | 100 GB/month | negligible |

The one real operational catch is that Supabase pauses free projects after about
a week of inactivity — which is exactly what happened in October. Opening the app
occasionally prevents it; restoring is one click.

---

## Testing and verification

Four kinds of check, three of which have been run. The honest summary: the
frontend is verified to build, lint and render; the database work is verified
safe to apply but **has not been applied**, so nothing is verified end-to-end
against real auth yet.

### What has been run

| Check | How | Result |
| --- | --- | --- |
| Production build | `npm run build` | Clean |
| Lint | ESLint 10 + React Compiler rules | 0 errors, 0 warnings |
| Dependency audit | `npm audit` | 0 vulnerabilities |
| Browser smoke tests | Headless Chrome, 7 checks | All pass |
| Data preflight | 16 checks against live data | All pass |

**Browser smoke tests** (`npm run smoke`) load the built app and check that pages
render without console errors, that `/clubs` correctly redirects to `/login` when
signed out, that the modal opens on click and closes on Escape, and that tab
selection updates its accessibility state.

**Data preflight** matters more than it sounds. The migrations add real
constraints to tables holding four years of data, and Postgres validates a new
constraint against every existing row — one bad row fails the migration. All 16
checks passed: no duplicate ratings or reviews, no out-of-range rating values, no
invalid statuses or colours, no orphaned rows. The longest existing review is
1,278 characters against a 5,000 cap.

### What has not been verified

- **Nothing has been run against the live database.** The migrations are written
  and the data is confirmed compatible, but no migration has been applied.
  Everything about auth, permissions and multi-club behaviour is unverified in
  practice.
- **No automated tests of the policies.** The verification scripts check that
  policies and privileges are configured correctly; they do not test that a
  specific user is denied a specific row. That gap is worth closing once the
  migrations are live.
- **No component tests.** The smoke tests check that pages render, not that the
  ratings grid groups correctly or that averages are right.

### Verification scripts

| Script | Checks |
| --- | --- |
| `db/preflight_check.sql` | Existing data is compatible with the new constraints. Run before migrating. |
| `db/verify_security.sql` | Six checks: RLS on every table, no unconditional policies, anonymous role has nothing, join codes sealed, every elevated function pins its search path, no function callable anonymously. |
| `scripts/verify_anon_lockdown.sh` | Does what an attacker would — takes the public key from the repo and asks the API for the data. Every table should come back locked. |

The last one is the real proof. Before the migrations it returns review text;
after them it should return nothing.

### Backend tests

`is_valid_rating()` in `backend/app/validators.py` mirrors the database's rating
constraint, with four pytest tests run by Jenkins. It currently has a known bug:
it accepts `7.3`, because it checks the range but not the half-point step. The
database correctly rejects such a value, so this is a divergence between the two,
not a hole — but the whole point of the function is to mirror the constraint, so
it should be fixed.

---

## Current status

As of 18 October 2026. Work sits on branch `feat/multi-club-auth-build`,
uncommitted.

### Built

| Component | Detail |
| --- | --- |
| Database migrations | 5 files, ~1,900 lines — schema, auth trigger, policy helpers, membership API, RLS |
| Supporting SQL | Preflight checker, security verifier, club bootstrap seed |
| Frontend | 41 JS/JSX files, 19 CSS modules, ~7,300 lines |
| Routes | 12, all functional |
| Component library | 10 primitives + a live style guide |
| Deployment config | `vercel.json` with CSP and security headers |
| Documentation | Runbook, security-headers explainer, this document |

### The critical outstanding item

**The migrations have not been run.** Until they are, the database keeps its
permissive read policies and anyone with the public key can read every review.
This is the one task that cannot be done without dashboard access, and it is the
highest priority. `docs/RUNBOOK.md` has the steps; the data is confirmed
compatible.

### Also outstanding

- [ ] Run migrations 0001–0005, then `verify_security.sql`
- [ ] Run the bootstrap seed with real email addresses filled in
- [ ] Create the three accounts and disable public signup
- [ ] Deploy to Vercel
- [ ] Update `DECISIONS.md`, `SCHEMA.md`, `SESSION_STATE.md` and `CLAUDE.md` — all still describe the old architecture
- [ ] Fix `is_valid_rating()` to reject values like `7.3`
- [ ] Move the Jenkins pipeline into the repo as a `Jenkinsfile`; add frontend build and lint stages
- [ ] Commit and open a pull request

### Deferred on purpose

**Drag-to-rerank chips.** Dragging a chip to a different row is a nicer way to do
what the rating picker already does. It needs the data layer working first, and
with a proper drag library it is roughly an afternoon — so it is a fast follow,
not a someday.

**The bookshelf visual.** The mockup describes "top rated books, jail section,
member icons" with no data model behind it. It is a design artifact, and building
it before the design is settled means building it twice.

**Gamified collectibles.** Phase 3, undesigned.

### Known issues

| Issue | Impact |
| --- | --- |
| `is_valid_rating()` accepts `7.3` | Divergence from the database constraint, which correctly rejects it |
| All 81 books have no author | Source document did not reliably list them; editable in the app |
| 10 books have no picker | Correct — the source did not record one |
| Node 23 is not an LTS release | ESLint warns; affects dev tooling only, not the app or Vercel builds |
| `frontend/data/seed_data.json` is dead | Superseded placeholder data, kept for reference |

---

## Feature backlog

**This is the section to edit when you want something new.** Add a row, say what
you want in the Feature column, and leave the rest — the "Where it lands" notes
exist so a request can become work without rediscovering the architecture each
time.

### Designed but not built

| Feature | Where it lands | Notes |
| --- | --- | --- |
| Drag-to-rerank rating chips | `ClubRatings.jsx` + `@dnd-kit` (already a dependency) | Dragging between rows sets a new rating. Library is installed and unused. |
| Bookshelf visual | New component in `components/club/`, `ClubHome.jsx` | Needs a design first. No schema change. |
| Club background photos | `clubs` gains an image column; Supabase Storage | The "Edit background" button in the mockup is not wired up. |
| Deactivate and reactivate a club | New function in `0004_rpc.sql`, button in `ClubSettings.jsx` | Schema supports it (`clubs.status`); no UI. Reactivating needs a new name, since deactivating frees the old one. |

### Natural next steps

| Feature | Where it lands | Notes |
| --- | --- | --- |
| Book cover images | `books` gains a cover column | Fetching covers automatically needs a secret API key, so it needs an Edge Function. |
| Author autofill | Edge Function calling a books API | All 81 books currently have no author. |
| Meeting reminders | Edge Function + scheduled job | Needs a real email provider, not Supabase's built-in one. |
| Club statistics | New route under `/club/:id/` | Average by member, most divisive book, picks per person. Pure computation over existing data. |
| To-read list | Already supported — `books.status = 'to_read'` | The Books page filters on it; it could use its own view. |
| Export a club to CSV | `lib/api/` + a download button | Useful as a backup, and reassuring given one database. |
| Self-serve signup | Supabase setting + a request-access page | Schema already supports request-and-approve. See Architecture on why it is off. |

### Larger changes

| Feature | Consideration |
| --- | --- |
| Mobile app | The app is responsive; a native wrapper is a separate project. |
| Public club browsing without an account | Would require a read path for signed-out users — a real change to the security model, not a feature toggle. |
| More than ~50 members per club | The ratings grid is a column per member and would need rethinking. |

### Your additions

| Feature | Priority | Notes |
| --- | --- | --- |
|  |  |  |

---

## Operations

### Getting it live

Full detail is in `docs/RUNBOOK.md`. The shape of it:

1. Run `db/preflight_check.sql` — read-only, confirms the data is compatible
2. Run migrations `0001` to `0005` in order, then `db/verify_security.sql` (six PASSes)
3. Run `db/seeds/0001_bootstrap_club.sql` with real emails filled in — creates the club, links the three members, fixes the book 47 typo
4. Create three accounts with temporary passwords, tick Auto Confirm, then **turn off public signup**
5. Fill in `frontend/.env.local` and run locally
6. Deploy to Vercel with root directory `frontend`
7. **Add no payment method anywhere**
8. Run `scripts/verify_anon_lockdown.sh` to prove it worked

The app will stop working between steps 2 and 4. That is expected: the public key
has lost its access and no member is linked to an account yet.

### Adding a person

Supabase dashboard, Authentication, Add user, with Auto Confirm ticked. The
trigger creates or links their member row automatically — if a `members` row
already exists with that email and no account attached, it links to it, which is
how an existing member keeps their rating and review history. Tell them the
temporary password; they change it in the app under Edit profile.

Then add them to a club: share the join code for a private club, or approve their
request for a public one.

### Routine maintenance

| Task | When |
| --- | --- |
| Open the app | At least weekly, or Supabase pauses the project |
| `npm audit` | Monthly |
| Dependency updates | Quarterly |
| Re-run `verify_security.sql` | After any schema change |

### Troubleshooting

**"Not connected yet" screen.** `frontend/.env.local` is missing or malformed.
Vite reads env files only at startup, so restart the dev server after editing.

**The project stopped responding, or the hostname does not resolve.** Almost
certainly a paused free project, not a deleted one. Restore it from the
dashboard. A paused project stops resolving on the network, which looks
alarmingly like deletion — this caused a false alarm in October.

**Signed in, but "not linked to a member profile".** The auth account's email
does not match any `members` row. Fix the email in `members` and recreate the
auth user so the trigger fires again.

**A rating will not save.** Most likely the unique index on
`ratings(member_id, book_id)` is missing, which the upsert requires. Re-run
migration `0001`.

**A club page says it is unavailable.** Your membership is not active — pending
approval, or you left. The database returns nothing for a club you are not in, so
this is the expected message rather than an error.

### If something goes badly wrong

Supabase's free tier keeps limited automatic backups. The seeding scripts in
`data/source/` can rebuild books, ratings and reviews from scratch — they are
gitignored because they contain personal content, so they exist only on the local
machine. **That is a single point of failure worth fixing**; an encrypted copy
somewhere else would be sensible. The CSV export in the backlog would serve the
same purpose.

---

## Glossary

### Database

**Row Level Security (RLS)** — Postgres filtering rows per user. With it on,
every query is silently rewritten to include the matching policy's condition. No
policy means no rows: the default is deny.

**Policy** — one rule attached to a table saying which rows a user may read or
write. Multiple policies are combined with OR, so **the most permissive one
wins** — which is why a leftover `using (true)` rule cancels out every careful
rule beside it.

**`SECURITY DEFINER`** — a function that runs with its creator's privileges
rather than the caller's, so it can see past RLS. Used here for two jobs:
breaking recursion when a policy on a table needs to read that same table, and
doing privileged work after checking permission.

**`search_path`** — the list of schemas Postgres searches for an unqualified
table name. Pinning it on an elevated function stops someone redirecting it to
their own table.

**Upsert** — "insert, or update the existing row if one already exists". Requires
a unique constraint to decide what counts as "already exists".

**Check constraint** — a rule the database enforces on every write, by anyone,
through any route. The last line that cannot be bypassed.

**Partial unique index** — a uniqueness rule with a `WHERE` clause, so it applies
only to matching rows. Used for "club names are unique among *active* clubs".

**Migration** — a numbered SQL file that changes the schema. Run in order; each
is written to be safe to re-run.

**Anon key** — the public API key identifying the project. Designed to be
published. It grants no access by itself; the policies decide what it can reach.

**`service_role` key** — the key that bypasses all policies. Server-side only,
never in a repo or a browser.

### Frontend

**Design token** — a named value (a colour, a spacing step) defined once and
referenced everywhere, so changing the name's value changes the whole app.

**CSS Module** — a stylesheet scoped to one component, so its class names cannot
collide with another's.

**Content-Security-Policy (CSP)** — a header telling the browser which sources of
code and network calls to allow, and to refuse everything else.

**Subresource Integrity (SRI)** — a hash on an external script so the browser
refuses to run it if it has been altered. Superseded here by npm's lockfile,
which does the same job for the whole dependency tree.

**Hook** — a reusable piece of React logic. `useAuth` holds who is signed in;
`useAsync` handles loading and error states.

**Context** — React's way of sharing a value with any component beneath it,
without passing it down through every layer between.

**SPA (single-page app)** — one HTML page where navigation swaps content in
JavaScript rather than fetching a new page. Needs a hosting rewrite so every URL
serves that page.

### This club's own vocabulary

**Jail** — a rating of `-1000`, meaning a book was irredeemable. Gets its own row
at the bottom of the ratings grid and counts as 1 when averaging.

**Picker** — the member who chose a book. Chip colours across the whole ratings
grid follow the picker, not whose column the chip sits in, so one book is the
same colour everywhere.

**Picker order** — whose turn it is to choose next. Computed from who picked
longest ago, rather than stored, so it cannot fall out of step with reality.
