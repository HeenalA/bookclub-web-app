# To Read or Not to Read 📚

A private book club management web application for tracking books, reviews, ratings, and meetings — with gamified elements and beautiful data visualizations.

> Built by Heenal Amin as a learning project and real product for a book club founded in June 2020.

---

## What It Does

Managing a book club in a Google Doc works — until it doesn't. After 78 books, 76 meetings, and 6 years of reviews across three members, the doc became hard to navigate, easy to forget to update, and impossible to get stats from.

This app replaces that doc with a purpose-built platform that makes tracking books fun.

**Core features:**
- 📖 Track books read, currently reading, and to-read as a group
- ⭐ Drag-and-drop ratings per member (1-10 scale, with 0.5 increments)
- 💬 Per-member reviews displayed in a shared table
- 📅 Meeting history with countdown to next meeting
- 🎨 Color-coded members throughout the UI
- 📊 Auto-calculated average ratings and genre distribution
- 🏆 Gamified bookshelf with collectibles
- 🔍 Book search via Google Books API

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | Supabase Auth |
| Frontend | React 18 + Vite |
| Hosting (FE) | Vercel |
| Hosting (BE) | Render |
| CI/CD | GitHub Actions |

---

## Project Status

🚧 **In active development** — Phase 1 (MVP)

See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the full roadmap.

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase account (free tier)

## Running it

```bash
bash scripts/start.sh
```

That is all. It installs dependencies on first run, warns if the environment
file is missing, and opens **http://localhost:3000**.

Equivalent, if you prefer doing it by hand:

```bash
cd frontend
npm install     # first time only
npm run dev
```

### Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload, on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint, including the React Compiler rules |
| `npm run smoke` | Headless-browser checks against a running preview |

All of the above run from `frontend/`.

### The style guide

```
http://localhost:3000/style
```

Every component in every state, on one page. It reads no database, so it
works before the app is connected to anything.

### Configuration

`frontend/.env.local`, which is gitignored:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon key>
```

Both are safe to expose — access is controlled by row-level security in the
database, not by hiding the key. The `service_role` key must never go here.

### There is no backend to start

Earlier versions of this file described a FastAPI service on port 8000.
There isn't one, and there is not meant to be: the browser talks to Supabase
directly and authorisation lives in the database. `backend/` holds a single
validator and its tests, which exist to give the CI pipeline real logic to
test. See `docs/DECISIONS.md`.

### Coming back after a break

```bash
cat db/status_check.sql | pbcopy
```

Paste into the Supabase SQL Editor. It reports which setup steps are done and
which are outstanding, so you do not have to remember.

### Run Tests

```bash
cd backend
pytest
```

---

## Environment Variables

Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories.
See `.env.example` files for required variables.

⚠️ Never commit `.env` files. They are listed in `.gitignore`.

---

## Member Colors

| Member | Color |
|---|---|
| Maya | Muted Blue (`#7B9EC9`) |
| Mina | Muted Pink (`#C97B9E`) |
| Heenal | Muted Purple (`#9E7BC9`) |

Colors are defined in `frontend/src/styles/variables.css` and can be updated without touching application logic.

---

## Data Migration

The app ships with seed data from the original Google Doc (2020–2026):
- 78 books read
- 76 meetings
- Full ratings for all three members
- Full written reviews
- To-read list and recommendations

To load seed data after setting up your database:

```bash
cd data
python migrate.py
```

---

## Repository

This repository is **private** while in active development.
It will be made public once initial security review and deployment are complete.

---

## License

Personal project. Not licensed for redistribution.
