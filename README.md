# To Read or Not to Read

A private web app for a book club, replacing the Google Doc that has tracked
their reading since June 2020 — 82 books, 216 ratings, 206 written reviews
and 78 meetings.

Built for three people, designed to support a handful of small clubs. It is
deliberately **not** a public product: there is no sign-up page, and accounts
are created by an admin.

> **This repository is public.** Never commit a real email address, a
> `service_role` key, or anything from `data/source/`. A pre-commit hook
> blocks all three — see [Security](#security).

---

## Quick start

```bash
git clone https://github.com/HeenalA/bookclub-web-app.git
cd bookclub-web-app
git config core.hooksPath .githooks     # one-time: enables the secret checks
bash scripts/start.sh
```

Opens <http://localhost:3000>.

The app needs `frontend/.env.local` to reach its database. Without it you get
a short setup screen instead of a crash, and **<http://localhost:3000/style>
still works** — the style guide renders every component on sample data and
touches no database.

```bash
cp frontend/.env.example frontend/.env.local
```

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon key>
```

Both come from the project's API settings. Both are safe to expose — access
is controlled by database policies, not by hiding the key. **The
`service_role` key must never go in here.**

---

## How it is put together

A React single-page app talks **directly** to a Postgres database. There is
no application server, and that is a decision rather than an omission.

| Layer | |
|---|---|
| UI | React 19 + Vite, CSS Modules, design tokens |
| Data | Postgres via Supabase, queried from the browser |
| Auth | Supabase Auth, email + password, invite only |
| **Authorization** | **Row Level Security, in the database** |
| Hosting | Vercel (static) |
| CI | Jenkins (`Jenkinsfile`) |

**Why no backend.** With a server, authorization becomes "is there a correct
check in every route handler?", and one miss exposes everything. In the
database, a policy applies to every query path — including ones written next
year, and including a query typed by hand. When server-side code is eventually
needed, it goes in Supabase Edge Functions, not a separate always-on service.
Full reasoning in [`docs/DECISIONS.md`](docs/DECISIONS.md).

```
frontend/src/
  routes/            one file per page
  components/ui/     presentational only, no data logic
  components/club/   club-specific display
  lib/api/           every database call lives here
  lib/hooks/         useAuth, useClub, useAsync
  styles/tokens.css  ⭐ every colour, size and spacing value

db/
  migrations/        run in order, 0001 → 0007
  seeds/             one-off data loads
  status_check.sql   ⭐ "what have I already run?"
  diagnose.sql       read-only health check

docs/
  SDD.md             ⭐ the full specification and the backlog
  RUNBOOK.md         deploying from scratch
  DECISIONS.md       why things are the way they are
  SCHEMA.md          table-by-table reference
```

---

## Working on it

```bash
cd frontend
npm run dev       # hot reload on :3000
npm run build     # production build
npm run lint      # ESLint, including React Compiler rules
npm run smoke     # headless-browser checks against a running preview
```

```bash
cd backend && python3 -m pytest tests/     # the one validator, mirrored from a DB constraint
bash .githooks/test-pre-commit.sh          # the secret-scanning rules
```

**Where to change things**

| To do this | Edit |
|---|---|
| Restyle the whole app | `frontend/src/styles/tokens.css` |
| Restyle one component | That component's `.module.css` |
| Add a page | A file in `src/routes/` + two lines in `App.jsx` |
| Add a database call | The matching module in `src/lib/api/` |
| Change a permission rule | `db/migrations/0005_rls.sql`, then re-run it |

**Conventions**

- Filter for correctness **in the query**; let RLS stop you seeing what you
  should not. Treating a security boundary as a query filter gives wrong
  answers inside the boundary — it caused a real bug.
- Never `dangerouslySetInnerHTML`. React escapes text; that prop is the way
  back in.
- Commit messages say *why*, not just what. `feat:`, `fix:`, `docs:`,
  `chore:`.
- Never push to `main` — branch and open a PR.

---

## The database

Changes are plain SQL files, applied in order through the Supabase SQL
Editor.

**Coming back after a break, or picking it up for the first time:**

```bash
cat db/status_check.sql | pbcopy
```

Paste into the SQL Editor. It reports every setup step as `DONE` or `TO DO`,
with outstanding ones first. `db/diagnose.sql` does the same for data
integrity. Both are read-only.

Full deployment walkthrough: [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

---

## Security

The app's privacy rests on database policies, not on hiding anything.
Verify it any time:

```bash
bash scripts/verify_anon_lockdown.sh
```

This does what an attacker would: takes the public key out of this repository
and asks the API for the data. Every table should answer `401`.

`db/verify_security.sql` checks the same thing from inside — RLS on every
table, no unconditional policies, the anonymous role holding nothing.

**The pre-commit hook** (enable with `git config core.hooksPath .githooks`)
blocks four things: real `.env` files, hardcoded secrets, personal email
addresses, and `service_role` keys — the last found by decoding each JWT and
reading the role it claims, since the safe anon key and the dangerous one are
identical to a regex.

`data/source/` is gitignored. It holds the club's real reviews and the
original document.

---

## Status

Working: accounts and sign-in, multiple clubs, books, ratings (click or
drag), reviews, meetings with more than one book, announcements, per-club
settings.

Not built yet, and why, in the backlog at the end of
[`docs/SDD.md`](docs/SDD.md).

---

## A note on the AI assistance

Much of this was built with Claude Code. [`CLAUDE.md`](CLAUDE.md) holds the
project's working rules — the absolute ones (never commit `.env`, never push
to `main`), the input-sanitization rules, and the conventions above. It is
read at the start of every session.

If you use an AI assistant here, point it at `CLAUDE.md` and
`docs/SESSION_STATE.md` first. If you do not, read them anyway: between them
they explain the rules this codebase is held to and where everything lives.
