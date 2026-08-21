# DECISIONS.md — Architecture Decision Log

This document records significant technical decisions made during development.
Every decision should include: what was decided, what the alternatives were, and why.

This is a learning resource — reading this file teaches you how engineers think about tradeoffs.

---

## Decision Template

```
## [Date] — [Short title]
**Decision:** [What was decided]
**Alternatives considered:** [What else was evaluated]
**Reason:** [Why this choice was made]
**Reversibility:** [Easy / Medium / Hard to change later]
```

---

## May 2026 — PostgreSQL over Firebase

**Decision:** Use PostgreSQL (via Supabase) as the database.

**Alternatives considered:** Firebase Firestore (NoSQL document database)

**Reason:**
- The app's data is deeply relational: books have ratings, ratings belong to members,
  members belong to clubs. SQL is the right tool for relational data.
- Queries like "average rating per book across all members" are trivial in SQL and
  complex in Firestore.
- PostgreSQL is the most common database in backend engineering jobs — better learning value.
- Firebase creates Google vendor lock-in; PostgreSQL is open source and portable.
- Heenal already knows SQL from QA work — lower learning curve for the database layer.

**Reversibility:** Medium — migrating data is possible but requires work.

---

## May 2026 — FastAPI over Django or Flask

**Decision:** Use FastAPI as the Python backend framework.

**Alternatives considered:**
- Django (full-featured, batteries-included framework)
- Flask (minimal microframework)

**Reason:**
- FastAPI is modern (2018), actively maintained, and increasingly common in new projects.
- Auto-generates API documentation at `/docs` — extremely useful for learning and debugging.
- Built-in data validation via Pydantic — catches bugs at the boundary of the API.
- Faster to write than Django for an API-only backend (no templates, no admin panel needed).
- Flask requires more manual setup for validation and docs.
- Django is powerful but heavyweight for what is essentially an API server.

**Reversibility:** Medium — switching frameworks requires rewriting routes but logic stays the same.

---

## May 2026 — Supabase Auth over custom JWT auth

**Decision:** Use Supabase Auth for user authentication.

**Alternatives considered:**
- Rolling custom JWT authentication (Python + python-jose)
- Auth0 (third-party auth service)
- Google OAuth only

**Reason:**
- Building auth from scratch is complex and a common source of security bugs.
  Not appropriate for a learning project where security is a concern.
- Supabase Auth is already bundled with our database — no extra service to manage.
- Supports email/password now and can add Google OAuth later with minimal code change.
- Auth0 is excellent but has a separate free tier limit and adds complexity.
- Starting with email/password means Heenal learns how auth works before adding OAuth.

**Reversibility:** Medium — auth is wired through the whole app, but Supabase makes migration paths clear.

---

## May 2026 — Vercel + Render over AWS/GCP/Azure

**Decision:** Use Vercel for frontend hosting and Render for backend hosting.

**Alternatives considered:**
- AWS (EC2, S3, Amplify, RDS)
- Google Cloud Platform
- Railway
- Fly.io
- Heroku

**Reason:**
- Vercel is purpose-built for React/Next.js — zero config deploys from GitHub.
- Render is the simplest backend hosting with a useful free tier.
- Both deploy automatically when you push to GitHub — perfect for learning CI/CD.
- AWS/GCP are more powerful but have steep learning curves and accidental billing risk.
- Railway and Fly.io are good alternatives — easy to migrate to if needed.
- Heroku removed free tier in 2022.

**Reversibility:** Easy — the app is containerizable, can be deployed anywhere with Docker later.

---

## May 2026 — React over Vue or Next.js

**Decision:** Use React 18 with Vite (not Next.js) for the frontend.

**Alternatives considered:**
- Next.js (React meta-framework with server-side rendering)
- Vue 3
- SvelteKit

**Reason:**
- React is the most common frontend framework in job postings — best learning ROI.
- Next.js adds complexity (server vs. client components, file-based routing) that isn't
  needed for Phase 1. Can migrate to Next.js later if SEO or performance require it.
- Vite gives fast dev server and build times without the overhead of Create React App.
- Vue is excellent but smaller job market than React in the Bay Area.
- This app is a client-heavy SPA (single page app) — React is the right fit.

**Reversibility:** Medium — migrating to Next.js from React is incremental, not a full rewrite.

---

## May 2026 — Support 0.5 rating increments

**Decision:** Store ratings as DECIMAL(4,1) to support half-star ratings (e.g., 7.5, 8.5, 9.5).

**Alternatives considered:** Integer ratings only (1-10)

**Reason:**
- Existing data contains half-star ratings (7.5, 8.5, 9.5) for many books.
- Rounding to integers would lose data fidelity during migration.
- The -1000 rating for Flames of Chaos is kept as a fun data point / easter egg.
  It will display specially in the UI (not in average calculations unless explicitly included).

**Reversibility:** Easy — can change rating display at any time.

---

## May 2026 — App name defined in one config file

**Decision:** The app name "To Read or Not to Read" is stored only in
`frontend/src/config/app.js` as `APP_NAME`.

**Alternatives considered:** Hardcoding it throughout components and API responses.

**Reason:**
- The name may change if a trademark issue arises or a better name is found.
- Centralizing it means a name change is a one-line edit, not a search-and-replace across the codebase.
- Good software engineering practice: single source of truth for configuration values.

**Reversibility:** Already maximally reversible by design.

---

## Aug 2026 — Multi-club membership model: soft-delete + per-club admin roles

**Decision:** Membership is modeled as its own table (`club_members`: member_id, club_id, status, role, join fields) rather than a single club_id on `members`. Leaving a club sets `status = inactive` instead of deleting the row. Admin is a per-club role on that join row, not a global flag on the member. Club names are unique only among *active* clubs — deactivating a club frees its name for reuse, and reactivating requires the admin to pick a new name.

**Alternatives considered:**
- Single `club_id` column on `members` (one club per user) — ruled out once "browse and join other clubs" became a requirement; a user needs to belong to more than one club.
- Hard-delete the membership row on leave — ruled out because it would silently delete that member's ratings/reviews history (or orphan them), and rejoining should restore prior data.
- Globally unique club names forever, even once inactive — ruled out because it would permanently squat a name for a club nobody can reactivate under it again.

**Reason:**
- Soft-delete on leave is the only way to satisfy "if they rejoin, nothing is lost."
- Per-club admin role (not global) is required now that any user can create a club and become its admin — admin-of-one-club shouldn't imply admin-of-all-clubs.
- Scoping name uniqueness to active clubs only is what makes "deactivate, then let someone else use that name" and "reactivate under a new name" both possible without a manual cleanup step.

**Reversibility:** Medium — this shapes the core schema; changing it later means migrating existing membership rows.

---

## Aug 2026 — Public/private clubs with different join gates

**Decision:** Clubs have a `visibility` flag. Public clubs are discoverable in the browse/search list and joinable via a "Request to join" that still requires admin approval. Private clubs are joined via an admin-shared join code (regenerable per club) — the code itself is the gate, no separate approval step on top of a valid code.

**Alternatives considered:**
- Same approval flow for both (i.e., private clubs also queue a request) — ruled out as redundant; the code is already how the admin controls who gets in, so a second approval gate adds friction without added safety.
- Private clubs invisible in search entirely (invite-only, no search match) — not decided either way yet; current mockup still lists private clubs in the browse table with a code-entry field rather than hiding them. Worth revisiting once real users exist.

**Reason:** Two different real-world groups this app serves — an open community club (public, moderated by approval) versus a closed friend-group club (private, gated by a shared code) — need genuinely different join mechanics, not one flow trying to cover both.

**Reversibility:** Easy — `visibility` and `join_code` are additive columns; the join-request approval path already exists for public clubs regardless.

---

## Aug 2026 — Meeting numbers are computed, not stored

**Decision:** A meeting's display number (`#1`, `#2`, `#3`...) is calculated at query time from date order (`ROW_NUMBER() OVER (ORDER BY meeting_date)` per club), not stored as a column on the `meetings` table.

**Alternatives considered:** Store `meeting_number` directly on each row, and re-run an `UPDATE` to shift every later row down by one whenever a meeting is deleted (or up by one on insert-in-the-middle).

**Reason:**
- The requirement is "delete meeting #3 and #4 becomes #3, #5 becomes #4, etc." — that's exactly what a *derived* value gives you for free. Query it fresh and the renumbering has already happened; there's nothing to update.
- A stored, manually-renumbered column is a classic source of drift bugs — miss one `UPDATE` (a failed request, a bug, a manual DB edit) and the numbers silently disagree with the real order. This is the general "derived data" principle: if a value can be computed from other columns you already have (here, the date), storing it separately just creates a second copy that can go stale.
- Same pattern already used for the book numbers in reviews/ratings (`#78`, `#77`...) — this keeps meetings consistent with that.

**Reversibility:** Easy — purely a query-time decision; switching to a stored column later is possible but would reintroduce the drift risk above.
