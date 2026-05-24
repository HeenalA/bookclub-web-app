# CLAUDE.md — To Read or Not to Read
## AI Team Instructions & Project Rules

This file is the single source of truth for all AI agents (Claude Code, Copilot) working on this project.
Read this file completely before taking any action on the codebase.

---

## 🏢 The Team

| Role | Who | Responsibilities |
|---|---|---|
| **CEO / PM** | Heenal (human) | Vision, priorities, feature decisions, final approval on all code |
| **Developer** | Claude Code (terminal) | Writing code, running tests, file operations, git staging |
| **Advisor / PM Support** | Claude Desktop (chat) | Architecture, planning, learning explanations, resume, cost tracking |
| **Pair Programmer** | GitHub Copilot (VS Code) | In-editor suggestions while Heenal writes code herself |

---

## 🛑 ABSOLUTE RULES — Never Violate These

1. **Never run `sudo` commands** — if a task seems to require sudo, stop and ask Heenal
2. **Never commit `.env` files** — all secrets live in `.env` and are listed in `.gitignore`
3. **Never hardcode secrets, API keys, passwords, or credentials** in any file
4. **Never push directly to `main`** — all changes go through a feature branch
5. **Always use plan mode first** — show Heenal what you intend to do before doing it
6. **Never delete data** without explicit confirmation from Heenal
7. **Warn before any destructive operation** — dropping tables, deleting files, overwriting data
8. **Never expose personal data** — member names, emails, and reviews are private; the repo is private

---

## 🚦 How Claude Code Should Work (Developer Workflow)

### Before Writing Any Code
1. Read this file (`CLAUDE.md`) completely
2. Read the relevant section of `docs/PROJECT_PLAN.md`
3. State what you understand the task to be
4. Show your plan — what files you'll create/edit, what the approach is
5. Ask any clarifying questions before proceeding
6. Wait for Heenal's approval before writing code

### When Writing Code
- Write small, focused changes — one feature at a time
- Add comments explaining *why*, not just *what*
- Follow the coding standards below
- If you hit an unexpected issue, stop and explain it — don't improvise solutions that touch other parts of the codebase

### After Writing Code
- Show a summary of what was changed and why
- Point out anything Heenal should test manually
- Suggest the git commit message using Conventional Commits format
- Never run `git push` without explicit instruction from Heenal

### When Unsure
- Ask, don't assume
- Heenal is learning — explain your reasoning so she can understand the decision
- Offer 2-3 options when there are meaningful tradeoffs, explain each

---

## 📚 Learning Mode

This project is a learning environment. When writing or explaining code:
- Explain new concepts in plain English before implementing them
- Point out when something is an "industry best practice" and why
- Note when there's a simpler way vs. a more scalable way — explain the tradeoff
- If Heenal asks "why", always answer thoroughly
- Label code sections with learning notes like: `# LEARNING: This is called a decorator in Python`

---

## 🏗️ Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Backend | Python + FastAPI | Python 3.11+ | REST API server |
| Database | PostgreSQL via Supabase | Latest | Free hosted tier |
| Auth | Supabase Auth | — | Email/password to start, Google OAuth in Phase 2 |
| Frontend | React | 18+ | Vite for build tooling |
| Styling | CSS Modules + CSS variables | — | No heavy UI framework to start |
| Book Search | Google Books API | v1 | Free, no key needed for basic search |
| Hosting (FE) | Vercel | — | Free tier |
| Hosting (BE) | Render | — | Free tier, note: spins down after 15min idle |
| CI/CD | GitHub Actions | — | Lint + test on every push |
| Package Mgr (BE) | pip + requirements.txt | — | Simple to start |
| Package Mgr (FE) | npm | — | Standard |

**Important:** The tech stack is modular. Each layer can be swapped independently.
If hosting needs change, document the reason in `docs/DECISIONS.md`.

---

## 📁 Project Structure

```
bookclub-web-app/
├── CLAUDE.md                  ← You are here
├── README.md                  ← Project overview for GitHub
├── .env.example               ← Template showing required env vars (no real values)
├── .gitignore                 ← Must include .env, __pycache__, node_modules, etc.
│
├── backend/
│   ├── app/
│   │   ├── main.py            ← FastAPI app entry point
│   │   ├── config.py          ← Loads env vars (never hardcode here)
│   │   ├── database.py        ← Database connection setup
│   │   ├── models/            ← SQLAlchemy database models
│   │   │   ├── book.py
│   │   │   ├── member.py
│   │   │   ├── meeting.py
│   │   │   ├── rating.py
│   │   │   └── review.py
│   │   ├── routes/            ← API endpoint definitions
│   │   │   ├── books.py
│   │   │   ├── members.py
│   │   │   ├── meetings.py
│   │   │   └── ratings.py
│   │   └── schemas/           ← Pydantic data validation schemas
│   ├── tests/                 ← Backend tests (pytest)
│   ├── requirements.txt       ← Python dependencies
│   └── .env                   ← Local secrets (NEVER commit this)
│
├── frontend/
│   ├── src/
│   │   ├── components/        ← Reusable React components
│   │   ├── pages/             ← Page-level components
│   │   ├── hooks/             ← Custom React hooks
│   │   ├── api/               ← Functions that call the backend
│   │   ├── styles/            ← CSS modules and variables
│   │   └── App.jsx
│   ├── public/
│   └── package.json
│
├── data/
│   ├── seed_data.json         ← All existing book club data (78 books, 76 meetings, etc.)
│   └── migrate.py             ← Script to load seed data into database
│
├── docs/
│   ├── PROJECT_PLAN.md        ← PM document: phases, features, sprints
│   ├── DECISIONS.md           ← Architecture decisions log (why we chose X over Y)
│   ├── SCHEMA.md              ← Database schema documentation
│   └── COST_TRACKER.md        ← CFO document: hosting costs, API usage, token spend
│
└── .github/
    └── workflows/
        ├── backend-ci.yml     ← Run tests on every push
        └── frontend-ci.yml    ← Lint and build check on every push
```

---

## 🗄️ Database — Key Entities

These are the core data models. Do not add or change models without PM approval.

```
Member         — users of the app (name, email, color, role)
BookClub       — a group (name, rules, founded date, picker order)
Membership     — which members belong to which clubs
Book           — a book (title, author, genre, google_books_id, cover_url)
ClubBook       — a book added to a club (status: to_read/reading/finished, picked_by)
Meeting        — a meeting (date, location, club_id)
MeetingBook    — books discussed at a meeting
Review         — one member's review of one book in one club
Rating         — one member's numerical rating (supports 0.5 increments, range -1000 to 10)
CharacterRating — one member's rating of a character from a book
```

**Color assignments (muted, adjustable):**
- Maya: `#7B9EC9` (muted blue)
- Mina: `#C97B9E` (muted pink)
- Heenal: `#9E7BC9` (muted purple)

These are defined in `frontend/src/styles/variables.css` and can be changed without touching logic.

---

## 🔐 Environment Variables

All secrets live in `.env` in the relevant directory. Never commit this file.
`.env.example` shows the required keys with placeholder values — this IS committed.

Required backend variables:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
DATABASE_URL=your_postgres_connection_string
SECRET_KEY=a_random_string_for_jwt_signing
ENVIRONMENT=development
```

Required frontend variables:
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ **Security reminder:** Before every commit, check `git status` and `git diff` to confirm
no `.env` file or credentials are staged. When in doubt, run `git diff --staged` first.

---

## 🌿 Git Workflow

### Branch naming
```
feature/add-book-search
feature/drag-drop-ratings
fix/meeting-date-display
docs/update-schema
chore/add-ci-workflow
```

### Commit message format (Conventional Commits)
```
feat: add book search by title and author
fix: correct average rating calculation
docs: add database schema documentation
test: add unit tests for rating model
chore: update Python dependencies
refactor: extract review component
```

### Daily commit rule
At minimum, one commit per day. Even documentation counts.
Small, focused commits are better than one large commit.

### Never do
- `git push --force` on any shared branch
- Commit directly to `main`
- Stage `.env` or any file with real credentials

---

## 💰 Cost Awareness (CFO Notes)

Track all costs in `docs/COST_TRACKER.md`. Flag Heenal when:
- Supabase free tier is approaching limits (500MB storage, 2GB bandwidth/month)
- Render free tier is being upgraded (keep it free unless there's a clear reason)
- Any paid API is being introduced
- Monthly estimated cost exceeds $5

Current estimated monthly cost: **$0** (all free tiers)

---

## 🧪 Testing Standards

- Every API endpoint gets at least one test
- Tests live in `backend/tests/`
- Use `pytest` for Python tests
- Run tests before suggesting a commit: `cd backend && pytest`
- CI will run tests automatically on every push — a failing CI = do not merge

---

## 📋 App Name & Branding

- **Working name:** "To Read or Not to Read"
- **Name is defined in one place:** `frontend/src/config/app.js` as `APP_NAME`
- **Changing the name** = update that one file + README. Nothing else.
- Do not hardcode the app name anywhere in components or backend responses

---

## 🎯 Current Phase

**Phase 1 — MVP** (Target: 2 weeks)
See `docs/PROJECT_PLAN.md` for full sprint breakdown.

Priority order:
1. Project structure + database schema
2. Seed data migration (existing 78 books, 76 meetings)
3. Auth (login/signup)
4. Book list page
5. Reviews table
6. Meeting list + countdown timer
7. Deploy to Vercel + Render

---

## 📝 How to Ask Heenal a Question

When you need a decision from the PM (Heenal), format it clearly:

```
❓ QUESTION FOR PM
Topic: [what area this affects]
Question: [the specific question]
Options:
  A) [option] — [tradeoff]
  B) [option] — [tradeoff]
Recommendation: [your suggestion and why]
Default if no response: [what you'll do if she says "go ahead"]
```

This keeps decisions documented and helps Heenal learn the reasoning behind choices.
