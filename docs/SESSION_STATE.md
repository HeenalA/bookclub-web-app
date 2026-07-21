# SESSION_STATE.md — To Read or Not to Read
## Living Project State — Updated Every Session

**Paste this file into any new Claude chat to restore full project context instantly.**
Last updated: July 20, 2026

---

## 📍 Where We Are Right Now

**Current phase:** Phase 1 — Static HTML pages on localhost, now data-driven
**Status:** Sprint 2 is built on branch `feature/sprint2-seed-data`, about to be committed/pushed/merged via PR.
**Next task:** Merge Sprint 2, then set up Vercel hosting (connected to `main`) so club members can view and give feedback.
**Branch:** `feature/sprint2-seed-data` (not yet merged — `main` currently only has Sprint 1's static version)

### How to run locally
```bash
cd ~/Desktop/git/bookclub-web-app/frontend && python3 -m http.server 3000
```
Then open: http://localhost:3000/pages/home.html

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
- [x] Nav redesigned: single header row (logo + Welcome + Profile), club nav (Home/Ratings/Reviews) in its own row below
- [x] Fixed sticky-header bug on ratings/reviews tables — offset is now computed from real nav height via a CSS variable instead of a hardcoded pixel value

---

## 🔲 What Is Next

**Sprint 2 wrap-up:**
- Commit, push, PR, and merge `feature/sprint2-seed-data` → `main`
- Set up Vercel hosting connected to `main` so club members can view progress and give feedback

**After that:**
- Wire up actual click-to-edit-and-save for ratings/reviews (currently just visual gating, no persistence yet)
- Backfill `seed_data.json` with the full 78 books (currently a representative subset of ~11)
- Start Phase 2 planning: React + FastAPI + Supabase (real backend, SQL database, real auth, multi-device sync)

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
├── WORKFLOW.md
├── .gitignore
├── frontend/
│   ├── styles/main.css        ← all styles in one file (no components.css needed yet)
│   ├── pages/home.html
│   ├── pages/ratings.html
│   ├── pages/reviews.html
│   └── js/main.js
├── data/                      ← empty (seed_data.json deferred to Phase 2)
├── backend/                   ← scaffolded, empty (Phase 2)
├── docs/
│   ├── SESSION_STATE.md       ← this file
│   ├── PROJECT_PLAN.md
│   ├── DESIGN_SPEC.md
│   ├── DECISIONS.md
│   ├── COST_TRACKER.md
│   └── mockups.html           ← reference UI mockups (open in browser)
└── scripts/
    ├── autosave.sh
    └── update_session.sh
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
