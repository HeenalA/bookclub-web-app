# SESSION_STATE.md — To Read or Not to Read
## Living Project State — Updated Every Session

**Paste this file into any new Claude chat to restore full project context instantly.**
Last updated: July 20, 2026 (session paused mid-Sprint-3)

---

## 📍 Where We Are Right Now

**Current phase:** Transitioning from Phase 1 (static/data-driven) into early Phase 2 (Supabase backend), driven by wanting a live demo for recruiters/resume + wanting real SQL practice.
**Status:** Sprint 2 (data-driven frontend) is merged to `main`. A pre-commit secret-scanning hook is merged to `main`. Sprint 3 (Supabase) is in progress on branch `feature/sprint3-supabase-setup` — **pushed but not yet merged**.
**Next task (pick up here):**
1. Confirm whether the Supabase schema SQL (see below) was actually run successfully in the Supabase SQL editor — this was left mid-action, ask Heenal to check the Table Editor for `members`/`books`/`ratings`/`reviews` tables.
2. If schema exists: seed it with real data from `data/source/bookclub_raw.md` (local-only reference file, not in git).
3. Merge `feature/sprint3-supabase-setup` → `main` via PR (same manual flow as before).
4. Then: Vercel hosting setup (discussed, not started) + decide on making GitHub repo public for resume (discussed, safety-audited as OK, but Heenal had not yet flipped the visibility toggle as of last check).
**Branch:** `feature/sprint3-supabase-setup` (checked out locally, pushed to origin)

**Context on why this session moved fast:** Heenal has a software engineering interview this week and wanted to get hands-on practice with PRs, git workflow, and SQL/Supabase quickly, while deferring deeper "learning mode" explanations to a later session.

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
- [x] Schema SQL designed for 4 tables (`members`, `books`, `ratings`, `reviews`) with RLS enabled and public **read-only** policies on each (no write policies yet — those need real Supabase Auth sessions, which don't exist yet; current identity system is still the Phase 1 client-side fake one). Full SQL is in this conversation's history — **re-derive or ask Heenal to paste it back if not carried into next session's context.**

---

## 🔲 What Is Next

**Immediate (resume here):**
1. Confirm the Supabase schema SQL actually ran (check Table Editor for the 4 tables + RLS indicators)
2. Seed real data into Supabase from `data/source/bookclub_raw.md`
3. Merge `feature/sprint3-supabase-setup` → `main`
4. Wire `frontend/js/main.js` to query Supabase (via `supabase-js`, loaded from CDN since there's still no bundler) instead of `fetch()`-ing the local `seed_data.json`

**After that:**
- Set up Vercel hosting connected to `main` (discussed, not started) — needed for the recruiter-shareable live URL
- Decide/action making the GitHub repo public (discussed, audited safe, not yet done)
- Add real Supabase Auth so write policies (only-your-own-row editing) can actually be enforced server-side, replacing the current fake client-side identity switcher
- Wire up actual click-to-edit-and-save for ratings/reviews (currently just visual gating, no persistence)
- Eventually: React + FastAPI migration (Phase 2 proper), once Supabase-direct-from-frontend outgrows itself

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
│   └── source/                ← GITIGNORED — local-only real book club data (bookclub_raw.md), used as reference to seed Supabase
├── backend/                   ← scaffolded, still empty (Phase 2 proper, not started)
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
**Repo:** github.com/HeenalA/bookclub-web-app (private)

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
