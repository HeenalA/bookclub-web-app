# CLAUDE.md — To Read or Not to Read
## AI Team Instructions, Project Rules & Living Context

Read this file completely before taking any action on the codebase.

---

## 🔄 SESSION HANDOFF SYSTEM

This project uses a seamless handoff system so Heenal never loses context between sessions.

### How it works
1. START of every Claude Code session → read `docs/SESSION_STATE.md`
2. During the session → track what was built, decided, changed
3. END of every session → run `bash scripts/update_session.sh "what was done"`
4. Autosave commits all changes every 30 min via `scripts/autosave.sh`

### Starting a new chat (Claude Desktop)
Heenal pastes the contents of `docs/SESSION_STATE.md` into the new chat.
That single file contains everything needed to resume instantly.

---

## 🏢 The Team

| Role | Who | How |
|---|---|---|
| CEO / PM | Heenal | Makes all product and design decisions |
| Developer | Claude Code terminal | `cd ~/Desktop/bookclub-web-app && claude` |
| Advisor / Tutor | Claude Desktop chat | Paste SESSION_STATE.md to restore context |
| Pair Programmer | GitHub Copilot | In VS Code during manual coding |

---

## 🛑 ABSOLUTE RULES

1. Never run `sudo`
2. Never commit `.env` files
3. Never hardcode secrets or API keys
4. Never push directly to `main`
5. Always show a plan before writing code
6. Never delete data without confirmation
7. Always update `docs/SESSION_STATE.md` at end of session
8. This repo is public. Never mention specific personal circumstances (job interviews, job search, personal schedule/deadlines) in commit messages or committed docs — that's off-limits regardless of framing. Separately, don't use Heenal's name in commit messages, and don't repeat it in files like `SESSION_STATE.md` when a neutral phrasing works just as well (referring to Heenal/Maya/Mina as book club members — the actual app data — is fine; narrating "Heenal did X" as the session author is not). It's fine, and encouraged, to note that this project is a learning exercise and name the skills being practiced (git workflow, SQL, Supabase, Jenkins CI/CD, etc.) — that's good context, not something to hide.

---

## 🚦 Developer Workflow

**Before writing code:**
- Read CLAUDE.md + SESSION_STATE.md
- State your understanding of the task
- Show your plan, ask questions if needed
- Wait for Heenal's approval

**While writing code:**
- One small change at a time
- Comment the *why* not just the *what*
- Add `/* LEARNING: ... */` notes for new concepts
- Stop and explain if anything unexpected comes up

**After writing code:**
- Summarize what changed
- Tell Heenal exactly how to see the result
- Suggest the git commit message
- Run `bash scripts/update_session.sh "description"`

---

## 📚 Learning Mode

Always explain concepts before implementing them.
Label industry best practices and explain why they exist.
Show simpler vs scalable approaches and explain the tradeoff.
Heenal is learning full-stack development — never skip the explanation.

---

## 🏗️ Tech Stack

| Layer | Phase 1 | Phase 2+ |
|---|---|---|
| Frontend | Plain HTML + CSS + vanilla JS | React 18 + Vite |
| Backend | None yet | Python + FastAPI |
| Database | None yet | PostgreSQL via Supabase |
| Auth | None yet | Supabase Auth |
| Hosting | localhost | Vercel (FE) + Render (BE) |
| CI/CD | None yet | GitHub Actions |

**Current phase: Phase 1 — Static HTML on localhost. No backend, no database.**

---

## 📁 Project Structure

```
bookclub-web-app/
├── CLAUDE.md
├── README.md
├── .gitignore
├── .env.example
│
├── frontend/
│   ├── index.html             ← redirect or landing
│   ├── styles/
│   │   ├── main.css           ← CSS variables + global styles
│   │   └── components.css     ← reusable component styles
│   ├── pages/
│   │   ├── home.html          ← group home page
│   │   ├── ratings.html       ← drag-and-drop ratings table
│   │   └── reviews.html       ← reviews grid
│   └── js/
│       └── main.js            ← static data + basic interactivity
│
├── data/
│   └── seed_data.json         ← 78 books, 76 meetings, all ratings/reviews
│
├── docs/
│   ├── SESSION_STATE.md       ← ⭐ living project state, updated every session
│   ├── PROJECT_PLAN.md
│   ├── DESIGN_SPEC.md
│   ├── DECISIONS.md
│   └── COST_TRACKER.md
│
└── scripts/
    ├── autosave.sh            ← auto-commit every 30 min
    └── update_session.sh      ← update SESSION_STATE.md + stage it
```

---

## 🎨 Design System

**Vibe:** Cozy bookshop meets playful social app. Warm paper tones, personality.
**Fonts:** Lora (serif) for titles/numbers. DM Sans for body/UI. (Google Fonts)

```css
/* CSS Variables — defined in styles/main.css */
--color-maya: #7B9EC9;
--color-mina: #C97B9E;
--color-heenal: #9E7BC9;

--bg-primary: #f5f0eb;
--bg-secondary: #ede4d8;
--bg-dark: #1e130a;
--text-primary: #2c3e50;
--text-secondary: #8a7a6a;
--border: #e0d8d0;

/* Picker chips (ratings table) */
--chip-maya-bg: #deeaf5;   --chip-maya-text: #185FA5;
--chip-mina-bg: #f4c0d1;   --chip-mina-text: #72243E;
--chip-heenal-bg: #e8dcf5; --chip-heenal-text: #3C3489;
```

---

## 🗄️ Data Models

```
Member     name, email, color, role (admin max 3 per group)
BookClub   name, rules, founded_date, picker_order
Book       title, author, genre, cover_url
ClubBook   book + club + status (to_read/reading/finished) + picked_by
Meeting    date, location, club_id
Review     member + book + text
Rating     member + book + value (DECIMAL, -1000 to 10, supports 0.5)
```

Rating rules:
- `-1000` → jail row, counts as `1` in averages, syncs to shelf jail
- `unrated` → bottom of ratings table
- Half-stars supported (7.5, 8.5, 9.5), configurable per group

---

## 🌿 Git Convention

```
feat: add group home page layout
fix: correct member color variables
docs: update session state
chore: add autosave script
style: adjust ratings table spacing
```

Daily commit rule: at least one commit per day. SESSION_STATE.md updates count.

---

## 💰 Costs

Current: ~$0/month. See docs/COST_TRACKER.md.
Alert Heenal before introducing any paid service.

---

## 📋 Current Sprint: Static HTML on localhost

- [ ] frontend/styles/main.css — CSS variables and global styles
- [ ] frontend/pages/home.html — group home page
- [ ] frontend/pages/ratings.html — ratings table
- [ ] frontend/pages/reviews.html — reviews table
- [ ] frontend/js/main.js — static sample data
- [ ] scripts/autosave.sh
- [ ] scripts/update_session.sh
- [ ] docs/SESSION_STATE.md — initial state
- [ ] Commit all of the above
