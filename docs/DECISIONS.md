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
