# SESSION_STATE.md — To Read or Not to Read
## Living Project State — Updated Every Session

**Paste this file into any new Claude chat to restore full project context instantly.**
Last updated: July 24, 2026 (paused for Heenal's final-round interview)

---

## 📍 Where We Are Right Now

**Current phase:** Early Phase 2 — Supabase is live with real schema + real ratings data. A working Jenkins CI pipeline now exists against this repo too. Reviews (prose text) are the next data-seeding step once interview prep wraps up.
**Status:** Everything through today's Jenkins work is merged to `main` (PRs #1–#8, all clean). GitHub repo is now **public** (`github.com/HeenalA/bookclub-web-app`) — Heenal confirmed this while setting up Jenkins today. The Supabase schema (4 tables, RLS enabled, public-read policies) is live, and batch 1 of real data (3 members, all 81 books, all star ratings) is seeded into the actual database.
**Branch:** `main` (clean, nothing uncommitted)

**Immediate context:** Heenal has a final-round SWE interview tomorrow (July 25) and spent today specifically on hands-on Jenkins CI/CD practice against this real repo, to have a genuine story to tell rather than just theory. That succeeded — see the Jenkins section below. Supabase review-seeding is paused until after the interview.

**Next task (pick up here, after the interview):**
1. **Decide how Claude runs the remaining SQL directly** (Heenal asked for this to speed things up, since RLS correctly blocks the anon key from writing anything — no INSERT policies exist, by design). Two options were being weighed:
   - Install `psql` locally + share the DB connection string (Project Settings → Database), or
   - Share the `service_role` key (Project Settings → API) and Claude uses `curl` against the REST API instead (no install needed)
   
   Whichever Heenal picks, that credential is more powerful than the anon key (bypasses RLS) — treat it as sensitive, never let it land in a committed file. **Not decided yet** — got sidetracked into Jenkins practice before this was resolved.
2. Seed **reviews** (the ~200 prose reviews across ~69 books) using whichever method was picked — scoped as a few sequential batches by year (2020–2021, 2022–2023, 2024–2026) since it's too much content for one shot.
3. Wire `frontend/js/main.js` to actually query Supabase (via `supabase-js` from a CDN script tag, since there's still no bundler) instead of `fetch()`-ing the local `seed_data.json`.
4. Set up Vercel hosting connected to `main` for the recruiter-shareable live URL (discussed, not started).
5. Longer term: real Supabase Auth + club-membership-scoped RLS (see privacy note below) — now more urgent since the repo is confirmed public.
6. Possibly: practice resolving an actual merge conflict together (walkthrough already given, see below — practice deferred to "later," not done yet).
7. Possibly: containerize the FastAPI backend once it's actually built out (currently just scaffolding + one validator function) — discussed as a good future exercise, not started.

**Context on why this project has moved fast:** Heenal has been using this real project as hands-on practice for an active job search / interview loop — git workflow, PRs, SQL/Supabase, and now Jenkins CI/CD — prioritizing genuine hands-on experience over theory, often choosing to move fast and defer deeper explanations to catch up later (today's Jenkins section below is the "catch up" — Heenal explicitly asked for a fuller conceptual explanation after getting the pipeline green).

**Important privacy note carried forward:** the `reviews`/`ratings` tables currently have **public read** RLS policies (`using (true)`) — anyone with the anon key (which is necessarily public in `frontend/js/supabase-config.js`) can query full review text directly via the REST API right now, not just see it rendered on the page. Heenal explicitly chose to seed real data now and tighten access later (real Auth + club-membership RLS), accepting that tradeoff knowingly — this is not an oversight, but it should stay near the top of the priority list once the demo is otherwise working, especially before/if the GitHub repo and live site both go public.

### How to run locally
```bash
bash ~/Desktop/git/bookclub-web-app/scripts/start.sh
```
Starts the server on port 3000 and auto-opens your browser to the home page. (Manual alternative: `cd frontend && python3 -m http.server 3000`, then open `http://localhost:3000/pages/home.html`)

---

## ✅ What Has Been Done

- [x] GitHub repo created: `github.com/HeenalA/bookclub-web-app` (private)
- [x] Git configured with correct SSH key and author email
- [x] CLAUDE.md written — AI team instructions and project rules
- [x] README.md written
- [x] PROJECT_PLAN.md written — full phase/sprint breakdown
- [x] DESIGN_SPEC.md written — approved UI mockups and design decisions
- [x] DECISIONS.md written — architecture decision log
- [x] COST_TRACKER.md written — all free tiers documented
- [x] SESSION_STATE.md created and kept up to date
- [x] Design mockups approved for: home page, ratings table, reviews table (`docs/mockups.html`)
- [x] `frontend/styles/main.css` — CSS variables, fonts, global reset, all component styles
- [x] `frontend/pages/home.html` — hero, countdown, currently reading, announcements, picker order, shelf placeholder
- [x] `frontend/pages/ratings.html` — full ratings table with real book data (rows 10 → −1000 → unrated)
- [x] `frontend/pages/reviews.html` — reviews grid with real reviews, year dividers, rating badges
- [x] `frontend/js/main.js` — static book data + live countdown timer + active nav link
- [x] `scripts/autosave.sh` — auto-commit every 30 min
- [x] `scripts/update_session.sh` — updates this file at end of session
- [x] All Sprint 1 files committed on branch `feature/sprint1-project-scaffold`
- [x] Visual review done in browser against `docs/mockups.html` — some design issues found, deferred (not blocking)
- [x] `feature/sprint1-project-scaffold` merged to `main` via PR #1
- [x] `frontend/data/seed_data.json` — normalized seed data (members, books, ratings, reviews) mirroring future SQL table shape
- [x] `main.js` rewritten to fetch seed data and render ratings/reviews tables dynamically instead of hardcoded HTML
- [x] Phase 1 identity system: "Welcome, {Name}" + a Profile tab that cycles the current user (stored in `localStorage`) — client-side only, not real auth/security (that's Phase 2 via Supabase Auth)
- [x] Ratings/reviews tables gate editing visually by current user (own column = editable, others = read-only)
- [x] Nav redesigned: single header row (logo + Welcome + Profile tab), club nav (Home/Ratings/Reviews) in its own row below — went through a few iterations with Heenal reviewing each change individually
- [x] Fixed sticky-header bug on ratings/reviews tables — offset is now computed from real nav height via a CSS variable instead of a hardcoded pixel value
- [x] `feature/sprint2-seed-data` merged to `main` via PR #2
- [x] Security audit run on repo (gitignore coverage, tracked `.env` check, full git history scanned for secret-like strings, tracked files scanned for emails) — came back clean, no real secrets ever committed
- [x] `.githooks/pre-commit` added — blocks commits that stage a real `.env` file or add lines matching secret-like patterns (api key/password/token/etc, skipping placeholders). Enabled locally via `git config core.hooksPath .githooks` (one-time per clone, documented in `WORKFLOW.md`). Merged to `main` via PR #3.
- [x] Discussed making the GitHub repo public for Heenal's resume/portfolio — audit supports it being safe, GitHub Pages ruled out (needs paid plan for private repos, and repo would need to go public anyway), decided the live site (Vercel) + public repo are the two links to use. **Not yet actioned** — Heenal was going to flip repo visibility via GitHub Settings → Danger Zone herself.
- [x] Real book club data received from Heenal (the actual Google Doc/PDF — 78 books, full meeting history, star ratings, prose reviews, to-read list, etc). Cleaned/structural subset saved to `data/source/bookclub_raw.md` (meeting list, master book list, ratings by star, overall rankings, to-read list). **This file is gitignored** — contains personal content and should never be committed. Full prose reviews and the Zoom link/password were deliberately left out even from that local file; original attachments have the full text if needed again.
- [x] `frontend/data/seed_data.json` is still just the ~11-book representative subset, not the real 78 — real data is now available in `data/source/bookclub_raw.md` to backfill from
- [x] Supabase project created: `https://rzaqlstmcmmzjdqwzgmz.supabase.co`. Data API enabled, "automatically expose new tables" disabled, "automatic RLS on new tables" enabled — all deliberate least-privilege choices.
- [x] `frontend/js/supabase-config.js` created with the project URL + anon key (safe to commit — anon key is meant to be public; real security is RLS policies, not key secrecy). Committed on `feature/sprint3-supabase-setup`.
- [x] Schema SQL designed and **successfully run** for 4 tables (`members`, `books`, `ratings`, `reviews`) with RLS enabled and public **read-only** policies on each (no write policies yet — those need real Supabase Auth sessions, which don't exist yet; current identity system is still the Phase 1 client-side fake one). Confirmed live via Table Editor.
- [x] `feature/sprint3-supabase-setup` merged to `main` via PR #4
- [x] Found and fixed a deeper sticky-header bug: `position: sticky` on `<th>` inside a `border-collapse: collapse` table is unreliable in WebKit — the header cell was detaching and rendering inside the table body. Removed sticky from both ratings/reviews table headers (and the now-dead JS that computed the offset) instead of continuing to patch a pixel value. Also fixed two related cross-browser gaps found while auditing: missing `-webkit-backdrop-filter` prefix on the countdown card blur, missing standard `line-clamp` alongside the WebKit-only prefix. Merged to `main` via PR #5.
- [x] Privacy discussion: confirmed that RLS changes are fully controllable going forward but don't retroactively un-expose anything already read during a more-open policy window (same principle as the earlier public-repo git-history discussion). Heenal wants a future layer: real Supabase Auth + a `club_members` table so users only see/edit data for clubs they belong to, and only edit their own rows — this is the eventual replacement for the current public-read policies and the fake client-side identity switcher.
- [x] Real data seeding, batch 1 (**done**): all 3 members, all 81 books (in the club's own #1–81 order, so auto-generated `book_id` matches the doc's own numbering), and all ~270 individual star ratings — transcribed by hand from `data/source/bookclub_raw.md` and successfully run against the live Supabase database. Saved as `data/source/seed_batch1_books_ratings.sql` (gitignored). A few title variants in the source doc were normalized to one canonical spelling (documented in that file's SQL comments); `author` is `null` for all books (not reliably available in the source doc); ~19 books have no noted picker so `picked_by` is `null` for those.
- [x] Real data seeding, batch 2 (reviews) — **not started, paused for interview prep**. Scoped as a few sequential batches by year given ~200 individual prose reviews across ~69 books. Heenal asked Claude to run this SQL directly (via `psql` + DB connection string, or `service_role` key + REST API) instead of copy-pasting each batch manually — **method still not decided.**
- [x] GitHub repo confirmed **public** (`github.com/HeenalA/bookclub-web-app`) — Heenal referenced it as public while setting up the Jenkins pipeline today, so the earlier "audited safe, not yet done" item is now done.
- [x] **Jenkins CI/CD set up and working, end to end** — full walkthrough below, this was today's main focus for interview prep.
- [x] Ran a full-page smoke check (curl on home/ratings/reviews + `node --check` on `main.js`) before pausing — all three pages return HTTP 200, no JS syntax errors. Safe to demo the static pages as-is tomorrow if needed.
- [x] Gave Heenal a plain-language walkthrough of resolving a git merge conflict (conflict markers, `git add` to mark resolved, `git commit`/`git rebase --continue` to finish, verify before pushing) — **conceptual only, practice deferred to a later session.**

---

## 🔧 Jenkins CI/CD (new today)

**Setup:**
- Docker Desktop installed; Jenkins running via:
  `docker run -u root -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts`
- Container name: `modest_curie` (Docker auto-assigned, not set explicitly with `--name`)
- Initial web setup completed (admin account, suggested plugins)
- Pipeline job named `bookclub-ci` created, using **"Pipeline script"** (pasted directly into the job config) — **not** yet "Pipeline script from SCM" (i.e. the Jenkinsfile isn't checked into the repo as an actual file yet, it only exists pasted in the Jenkins UI). Mentioned as a good future upgrade ("Pipeline as Code"), not done.

**What actually got built (real code, not just pipeline config):**
- `backend/app/validators.py` — `is_valid_rating()`, deliberately mirrors the exact `check` constraint already on the Supabase `ratings` table (jail value `-1000`, or 1–10 inclusive) — chosen specifically so the pipeline had one small, *genuine* piece of logic to test rather than a fake example.
- `backend/tests/test_validators.py` — 4 pytest tests (jail value, both boundaries, half-star, out-of-range) — verified passing locally before ever pushing.
- `backend/requirements-dev.txt` — test-only deps (`pytest==8.2.0`), separate from `backend/requirements.txt` (the full runtime deps: fastapi, sqlalchemy, psycopg2-binary, supabase). This split is the fix for bug #2 below, and is itself a legitimate real-world CI pattern worth remembering.

**The working Jenkinsfile** (currently pasted in the job's config, not in the repo):
```groovy
pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/HeenalA/bookclub-web-app.git'
            }
        }
        stage('Install Python') {
            steps {
                sh 'apt-get update && apt-get install -y python3 python3-pip'
            }
        }
        stage('Install dependencies') {
            steps {
                dir('backend') {
                    sh 'pip3 install -r requirements-dev.txt --break-system-packages'
                }
            }
        }
        stage('Run tests') {
            steps {
                dir('backend') {
                    sh 'python3 -m pytest tests/ --junitxml=results.xml'
                }
            }
        }
        stage('Report') {
            steps {
                junit 'backend/results.xml'
            }
        }
        stage('Deploy (placeholder)') {
            steps {
                echo 'In production, this stage would POST to a Render/Vercel deploy hook.'
            }
        }
    }
}
```

**Two real bugs hit and fixed (good interview debugging story — read the exact error, fix that specific thing):**
1. `pip3 install -r requirements.txt` failed — `No such file or directory`. Root cause: `sh` steps run from the workspace root by default, but all Python code lives under `backend/`. Fixed with `dir('backend') { ... }`, which is the pipeline equivalent of `cd backend` for everything inside that block, auto-restoring the working directory after.
2. After that fix, pip found the file but `psycopg2-binary` failed to build from source — `pg_config executable not found`. Root cause: no prebuilt wheel existed for this container's exact platform, so pip fell back to compiling from source, which needs Postgres's own `pg_config` tool that isn't installed in the Jenkins container. Since the current test suite is pure Python and touches no database at all, the real fix was splitting `requirements-dev.txt` (test-only: just `pytest`) from the full runtime `requirements.txt`, so CI never attempts to install/compile packages the tests don't actually need.

**Result:** pipeline goes green end-to-end — checkout → install Python → install test deps → run 4 tests (all pass) → publish JUnit report → deploy placeholder. `Finished: SUCCESS`.

**Conceptual explanation given (Heenal asked for this after getting it working, to be able to narrate it, not just have it work):** what Jenkins/a job/a pipeline/a stage/a step/an agent/a workspace/Console Output/an exit code/JUnit XML each actually are, in plain language, plus a re-walk of both bugs using that vocabulary. Also clarified: **only Jenkins itself runs in Docker** — the frontend static site isn't containerized (nothing to containerize, no build step), and the one thing actually being tested (`is_valid_rating`) is tested *inside the Jenkins container's own filesystem*, not on the Mac host — that's why the pipeline has to `apt-get install python3` as its own stage (the base Jenkins image only has Java).

**Restart commands if the Jenkins container ever stops:** `docker start modest_curie` (do **not** re-run the original long `docker run` command — that would create a second, separate Jenkins instance with none of today's job/config history).

---

## 🔲 What Is Next

**Immediate (resume here, after the interview):**
1. Decide: `psql` + DB connection string, or `service_role` key + `curl`/REST API, for Claude to run SQL directly going forward
2. Seed reviews in a few batches by year (2020–2021, 2022–2023, 2024–2026) using real prose text from the original doc
3. Wire `frontend/js/main.js` to query Supabase (via `supabase-js`, loaded from CDN since there's still no bundler) instead of `fetch()`-ing the local `seed_data.json`

**After that:**
- Set up Vercel hosting connected to `main` (discussed, not started) — needed for the recruiter-shareable live URL
- Real Supabase Auth + `club_members` table + RLS rewritten to scope by club membership and restrict writes to a user's own rows — replaces both the current public-read policies and the fake client-side identity switcher. **More urgent now that the repo is confirmed public.**
- Wire up actual click-to-edit-and-save for ratings/reviews (currently just visual gating, no persistence)
- Eventually: React + FastAPI migration (Phase 2 proper), once Supabase-direct-from-frontend outgrows itself

**Jenkins follow-ups (lower priority, whenever there's appetite):**
- Practice an actual merge conflict + resolution (walkthrough already given, just needs a hands-on session)
- Move the Jenkinsfile from "pasted in job config" to a real `Jenkinsfile` in the repo + switch the job to "Pipeline script from SCM" (the standard "Pipeline as Code" pattern)
- Add a stage that actually validates the frontend (e.g. `node --check` on `main.js`) — right now the pipeline only tests the one backend Python function
- If the FastAPI backend ever gets really built out, that's the natural candidate to containerize with its own `Dockerfile` (unlike the static frontend, which doesn't need it)

---

## 🎨 Approved Design Decisions

**Vibe:** Cozy bookshop meets playful social app
**Fonts:** Lora (serif) + DM Sans — loaded from Google Fonts

**Member colors:**
- Maya = `#7B9EC9` (muted blue)
- Mina = `#C97B9E` (muted pink)
- Heenal = `#9E7BC9` (muted purple)

**Background palette:**
- Warm paper: `#f5f0eb` / `#ede4d8`
- Dark shelf: `#1e130a`
- Text: `#2c3e50` / `#8a7a6a`
- Border: `#e0d8d0`

**Rating chip colors (by picker, not by column):**
- Maya picked → `bg:#deeaf5 text:#185FA5`
- Mina picked → `bg:#f4c0d1 text:#72243E`
- Heenal picked → `bg:#e8dcf5 text:#3C3489`

**Rating table rules:**
- Chip color = who picked the book (same color in all columns)
- Column separators = neutral 0.5px line only, no color fills
- Row order: 10, 9.5, 9 ... 1, -1000, unrated
- Jail (-1000): counts as 1 in averages, no special styling
- Drag handle ⠿ on each chip

**Home page layout:**
- Hero: dark bg + overlay, club name, member avatars, frosted countdown card
- Left: currently reading, announcements (border color = poster's color), picker order
- Right: bookshelf placeholder panel (full shelf deferred to Phase 2)
- "✎ Edit background" — admin only button in hero

**Reviews table:**
- Rows = books newest first, year dividers
- Columns = members
- "+ Add review" placeholder, rating badge below review text
- No average column

**Open decisions:**
- Background photo presets (admin picks) — Phase 2
- Member shelf icons/collectibles — Phase 2
- Bookshelf visual — Phase 2

---

## 🏗️ Tech Stack

| Now (Phase 1) | Later (Phase 2+) |
|---|---|
| Plain HTML + CSS + JS | React 18 + Vite |
| No backend | Python + FastAPI |
| No database | PostgreSQL + Supabase |
| localhost | Vercel + Render |

---

## 📁 Actual Folder Structure (as built)

```
bookclub-web-app/
├── CLAUDE.md
├── README.md
├── WORKFLOW.md                ← has ONE-TIME SETUP section for the pre-commit hook, read this on a fresh clone
├── .gitignore                 ← excludes data/source/ (personal data) and all .env variants
├── .githooks/
│   └── pre-commit             ← secret-scanning hook, enable via `git config core.hooksPath .githooks`
├── frontend/
│   ├── styles/main.css        ← all styles in one file
│   ├── pages/home.html
│   ├── pages/ratings.html
│   ├── pages/reviews.html
│   ├── js/main.js             ← fetches seed_data.json, renders tables, handles fake identity/profile switcher
│   ├── js/supabase-config.js  ← Supabase URL + anon key (safe to commit)
│   └── data/seed_data.json    ← LIVE data the frontend actually fetches (representative ~11-book subset, not real 78 yet)
├── data/
│   ├── .gitkeep
│   └── source/                ← GITIGNORED — local-only real data
│       ├── bookclub_raw.md               ← structural reference (meeting list, master book list, ratings by star, rankings)
│       └── seed_batch1_books_ratings.sql  ← members+books+ratings SQL, already run against live Supabase
├── backend/
│   ├── requirements.txt        ← full runtime deps (fastapi, sqlalchemy, psycopg2-binary, supabase) — not yet used by any real app code
│   ├── requirements-dev.txt    ← test-only deps (pytest) — what Jenkins actually installs
│   ├── app/validators.py       ← first real backend code: is_valid_rating(), mirrors the Supabase ratings check constraint
│   └── tests/test_validators.py ← pytest tests for it, run by Jenkins
├── docs/
│   ├── SESSION_STATE.md       ← this file
│   ├── PROJECT_PLAN.md
│   ├── DESIGN_SPEC.md
│   ├── DECISIONS.md
│   ├── COST_TRACKER.md
│   └── mockups.html           ← reference UI mockups (open in browser)
└── scripts/
    ├── autosave.sh
    ├── update_session.sh
    └── start.sh                ← launches local server + opens browser, prefer this over raw python3 command
```

---

## 📖 App Description (for new chat context)

Book club web app for "To Read or Not to Read" — a 3-person club (Maya, Mina, Heenal) founded June 2020. 78 books read, 76 meetings. Replaces a Google Doc.

**Key features:**
- Group home page with countdown to next meeting
- Drag-and-drop book ratings table (1-10, with -1000 "jail" row)
- Reviews table (books × members grid)
- Bookshelf visual with jail section (Phase 2)
- Gamified collectibles (Phase 3)

**Members:** Maya (blue #7B9EC9), Mina (pink #C97B9E), Heenal (purple #9E7BC9)
**Repo:** github.com/HeenalA/bookclub-web-app (public)

---

## 🔁 How to Start a Claude Code Session

```bash
cd ~/Desktop/git/bookclub-web-app
claude
```

Then type: "Read CLAUDE.md and docs/SESSION_STATE.md, then tell me where we left off and what's next."

## 🔁 How to Start a New Desktop Chat

Paste the entire contents of this file (SESSION_STATE.md) as your first message.
Claude will have full context and can continue immediately.
