# PROJECT_PLAN.md — To Read or Not to Read
## Product & Sprint Planning Document

**PM:** Heenal Amin
**Last Updated:** May 2026
**Current Phase:** Phase 1 — MVP

---

## Product Vision

A private, invitation-only book club platform that replaces a sprawling Google Doc with a
purpose-built web app. Start with one real club (3 members, 78 books, 6 years of data),
ship fast, then expand to other clubs and eventually monetize.

### Success Metrics
- Phase 1: All 3 club members actively using the app instead of the Google Doc
- Phase 2: App handles a second book club without code changes
- Phase 3: First non-friend user signs up

---

## Phases Overview

| Phase | Goal | Target |
|---|---|---|
| **Phase 1** | MVP — migrate existing data, core features usable by friends | 2 weeks |
| **Phase 2** | Core product — ratings, book search, group management | 1 month |
| **Phase 3** | Gamification, polish, public launch prep | Ongoing |
| **Phase 4** | Mobile app, monetization, real user growth | Future |

---

## Phase 1 — MVP

**Goal:** A working app where all 3 members can log in, see their book history,
read and write reviews, and see the next meeting countdown. Real data loaded.

### Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Project structure setup | P0 | 🔲 Todo | CLAUDE.md, folder structure, gitignore |
| Database schema | P0 | 🔲 Todo | All core tables defined |
| Seed data migration | P0 | 🔲 Todo | 78 books, 76 meetings, ratings, reviews |
| User auth (login/signup) | P0 | 🔲 Todo | Supabase Auth, email/password |
| Book list page | P0 | 🔲 Todo | Chronological, color-coded by picker |
| Reviews table | P0 | 🔲 Todo | Books as rows, members as columns |
| Meeting list | P1 | 🔲 Todo | All meetings with dates and books |
| Next meeting countdown | P1 | 🔲 Todo | Displayed on group home page |
| User profile page | P1 | 🔲 Todo | Shows groups, books read |
| Basic styling | P1 | 🔲 Todo | Member colors, readable layout |
| Deploy to Vercel + Render | P1 | 🔲 Todo | Friends can access it |

### Sprint Breakdown

**Sprint 1 (Days 1-3) — Foundation**
- [ ] Create full project folder structure
- [ ] Set up `.gitignore`, `.env.example`
- [ ] Write `docs/SCHEMA.md` (database design)
- [ ] Set up Python virtual environment and `requirements.txt`
- [ ] Set up React app with Vite
- Commit goal: project structure + docs

**Sprint 2 (Days 4-5) — Data**
- [ ] Parse existing Google Doc data into `data/seed_data.json`
- [ ] Write `data/migrate.py` script
- [ ] Set up Supabase project (free tier)
- [ ] Create database tables
- [ ] Run migration — confirm all 78 books load correctly
- Commit goal: seed data file + migration script

**Sprint 3 (Days 6-8) — Backend API**
- [ ] FastAPI app entry point (`main.py`)
- [ ] Database connection (`database.py`)
- [ ] Book model + books route (`GET /books`, `GET /books/{id}`)
- [ ] Meeting model + meetings route (`GET /meetings`)
- [ ] Review model + reviews route (`GET /reviews/{book_id}`)
- [ ] Basic auth routes (login, signup via Supabase)
- [ ] Write tests for each route
- Commit goal: working API with test coverage

**Sprint 4 (Days 9-11) — Frontend**
- [ ] React app scaffold with routing
- [ ] Login page
- [ ] Books list page (reads from API)
- [ ] Reviews table page (reads from API)
- [ ] Meeting list page (reads from API)
- [ ] Member color system (CSS variables)
- Commit goal: working frontend connected to backend

**Sprint 5 (Days 12-14) — Deploy + Polish**
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Set up environment variables in both platforms
- [ ] Test full flow end-to-end
- [ ] Share with Maya and Mina
- Commit goal: live URL working

---

## Phase 2 — Core Product

**Goal:** Full feature set. Any book club could use this app.

| Feature | Priority | Notes |
|---|---|---|
| Book search (Google Books API) | P0 | Search by title/author, pull cover + metadata |
| Add book to club | P0 | Admins only. Max 3 admins per group. All members can be admins in small clubs. Assign picker when adding. |
| Book status flow | P0 | To Read → Currently Reading → Finished |
| Drag-and-drop ratings table | P0 | Per member, 1-10 rows, drag titles between rows |
| Average rating calculation | P0 | Auto-updates when any member changes rating |
| Overall rankings list | P1 | Sorted by average, re-ranked live |
| Picker rotation | P1 | Order of who picks next, cyclic |
| Add/edit meetings | P1 | Any member can schedule a meeting |
| Announcements | P1 | Admin posts to group home page |
| Google OAuth login | P2 | Add alongside email/password |
| Multiple book clubs | P2 | One user can be in multiple clubs |
| Half-star rating toggle | P2 | Per-group setting to allow 0.5 increments (e.g. 7.5, 8.5) or integers only |

---

## Phase 3 — Gamification & Polish

| Feature | Priority | Notes |
|---|---|---|
| Virtual bookshelf UI | P0 | Books displayed as spines on a shelf |
| Currently reading shelf | P0 | Top shelf, most prominent |
| Collectibles shelf | P1 | Items earned by completing books/reviews |
| Jail shelf | P1 | Special shelf on group page — admins can send a book + member avatar to "jail" for rule violations (DNF, no-shows, strikes). Pairs with -1000 rating easter egg. |
| Genre distribution chart | P1 | Pie chart, updates as books are added |
| Character ratings | P2 | Per-book character rating tables |
| Annual stats / points | P2 | Points scored per year per member |
| Email reminders | P2 | Unrated books, upcoming meetings |
| Average rating per picker | P3 | How well does each member's picks rate? |

---

## Phase 4 — Growth & Monetization (Future)

| Idea | Notes |
|---|---|
| Public/private club option | Let anyone create a club |
| Mobile app (React Native) | Reuse backend, new frontend |
| Freemium model | Free for ≤5 members, paid for larger clubs |
| Partner with bookstores | Local bookstore landing pages |
| Book recommendation engine | Based on ratings history |

---

## Open Design Questions (PM Decision Needed)

These need answers before development can proceed on the relevant feature.
When resolved, move to `docs/DECISIONS.md`.

| # | Question | Decision | Status |
|---|---|---|---|
| 1 | Half-star ratings (7.5, 8.5) — support or round to integers? | ✅ Supported. Configurable per group (groups can toggle on/off in settings) | ✅ Resolved |
| 2 | Negative ratings (-1000 for Flames of Chaos) — support as a joke feature or normalize to 1? | ✅ Keep as joke feature. Normalize to 1 only if it breaks calculations. Pairs with new "Jail Shelf" feature (see Phase 2) | ✅ Resolved |
| 3 | Who can add books — any member or admin only? | ✅ Admins only. All members can be admins (small clubs). Max 3 admins per group to prevent chaos in larger clubs | ✅ Resolved |
| 4 | Club picker order — enforce strict rotation or just display suggested picker? | ✅ Display as suggestion only. Never enforce. | ✅ Resolved |
| 5 | App name — "To Read or Not to Read" confirmed or TBD? | ✅ Confirmed for now. Stored in one config file — easy to change. | ✅ Resolved |

---

## Technical Debt Log

Track shortcuts taken for speed that should be revisited.

| Item | Why taken | Fix by |
|---|---|---|
| (empty — project not started) | — | — |

---

## Roles Reference

| Role | Person/Tool | How to engage |
|---|---|---|
| CEO / PM | Heenal | Makes all product decisions, reviews code |
| Developer | Claude Code (terminal) | Run `claude` in project folder, always uses plan mode |
| Advisor | Claude Desktop (chat) | Architecture, learning, resume, cost questions |
| Pair Programmer | GitHub Copilot | Active in VS Code during manual coding sessions |

---

## Definition of Done (for any feature)

A feature is done when:
- [ ] Code is written and commented
- [ ] At least one test exists and passes
- [ ] CI passes on the branch
- [ ] Heenal has manually tested it
- [ ] It is merged to `main` via a pull request
- [ ] The feature row in this document is marked ✅
