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
9. Never interpolate raw external/human-sourced text (doc exports, seed data, future user-submitted content) into SQL or HTML without sanitizing it first — see 🔒 Input Sanitization below for the specific rules and why.

---

## 🔒 Input Sanitization

Applies to anything that isn't a literal written directly in code: doc/PDF exports used for seeding, and — once real click-to-edit-and-save exists — actual member-submitted review/rating text.

**Generating raw SQL (seeding scripts, one-off data migrations):**
- Escape single quotes (`'` → `''`) before interpolating any text into a SQL string literal. A real bug during reviews seeding: doc-exported review text with apostrophes would have broken SQL syntax if inserted unescaped.
- When importing from a Google Docs `.md` export specifically: strip markdown escape-backslashes (`\-`, `\!`, `\<`, `\_`, `\+`, `\=`, `\#`, etc.) before the data lands anywhere real. Google Docs' export backslash-escapes punctuation that was never actually typed that way — left in, it corrupts the data itself (not a security bug, but a correctness one caught the same way).
- Prefer parameterized queries / prepared statements over string concatenation wherever the tool supports it (e.g. if the FastAPI backend ever runs raw SQL directly, use placeholders like `%s`/`$1`, not f-strings) — this closes off SQL injection categorically instead of relying on manually getting escaping right each time.

**Rendering to the DOM (frontend):**
- **React escapes interpolated text automatically**, so the old `escapeHtml()`
  helper is gone and this is no longer a manual discipline. `{review.text}` is
  safe by construction.
- The rule that remains: **never use `dangerouslySetInnerHTML`.** That prop is
  the one way back into this class of bug, and nothing in this app needs it.
- Values interpolated into inline `style` props are a separate path that React
  does not sanitise. That is why `members.color` has a
  `^#[0-9A-Fa-f]{6}$` check constraint in the database — it makes a colour
  that is secretly a style injection impossible to store.
- Review and rating text became genuinely user-controlled the moment
  click-to-edit shipped, so these are load-bearing now, not precautionary.

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

| Layer | Current |
|---|---|
| Frontend | React 19 + Vite, CSS Modules + design tokens |
| Backend | **None, deliberately** — the browser talks to Supabase directly |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email + password, invite-only) |
| Authorization | Row Level Security + `SECURITY DEFINER` functions, in the database |
| Hosting | Vercel (static) |
| CI/CD | Jenkins (`Jenkinsfile` at repo root) |

**Current phase: Phase 2 — multi-club + real auth.** See `docs/SDD.md` for the
full specification and `docs/RUNBOOK.md` for deployment.

**There is no FastAPI backend and there is not meant to be one.** `backend/`
holds a single validator plus its tests, which exist to give the CI pipeline
real logic to test. Server-side code, when it is eventually needed, goes in
Supabase Edge Functions — not a separate always-on service. Reasoning in
`docs/DECISIONS.md`.

---

## 📁 Project Structure

```
bookclub-web-app/
├── CLAUDE.md
├── Jenkinsfile                 ← CI pipeline as code
│
├── db/
│   ├── migrations/             ← run in order: 0001 → 0005
│   │   ├── 0001_core_schema.sql
│   │   ├── 0002_auth_link.sql
│   │   ├── 0003_internal_helpers.sql
│   │   ├── 0004_rpc.sql        ← the membership write API
│   │   └── 0005_rls.sql        ← Row Level Security
│   ├── seeds/0001_bootstrap_club.sql
│   ├── preflight_check.sql     ← run BEFORE migrating
│   └── verify_security.sql     ← run AFTER migrating, all 6 must PASS
│
├── frontend/                   ← Vite root (Vercel "Root Directory")
│   ├── src/
│   │   ├── routes/             ← one file per page
│   │   ├── components/ui/      ← presentational primitives, no data logic
│   │   ├── components/club/
│   │   ├── components/layout/
│   │   ├── lib/api/            ← every database call
│   │   ├── lib/hooks/          ← useAuth, useClub, useAsync
│   │   ├── lib/util/           ← colour derivation, dates
│   │   └── styles/tokens.css   ← ⭐ every aesthetic value lives here
│   ├── scripts/smoke.mjs
│   ├── vercel.json             ← CSP + security headers
│   └── .env.local              ← gitignored, never committed
│
├── backend/                    ← NOT an app. One validator + its tests, for CI.
│
├── docs/
│   ├── SDD.md                  ← ⭐ the full specification
│   ├── RUNBOOK.md              ← ⭐ how to deploy, step by step
│   ├── SESSION_STATE.md
│   ├── SCHEMA.md
│   ├── DECISIONS.md
│   └── mockups.html
│
└── scripts/
    ├── start.sh                ← run the app locally
    └── verify_anon_lockdown.sh ← proves the anon key reads nothing
```

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

**The schema is defined in `db/migrations/` and explained in `docs/SCHEMA.md`.**
Do not restate column lists here — a third copy only drifts out of date.

Nine tables: `members`, `clubs`, `club_members`, `club_join_codes`, `books`,
`ratings`, `reviews`, `meetings`, `announcements`.

Rules that are easy to get wrong:
- **Admin is per club** (`club_members.role`), never global. An earlier version
  of this file described a global admin flag; that model is gone.
- **Membership is a join table**, not a column on `clubs`. A member belongs to
  many clubs and a club has many members.
- **Rating `-1000`** is the jail value — real data with a check constraint, not
  a null. Counts as `1` in averages. Half-points allowed (7.5), thirds are not.
- **Meeting numbers and the next meeting date are computed, never stored.**
  Same for a book's per-club display number. Deriving them means they cannot
  drift from the rows they summarise.

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

## 📋 Where Things Stand

Read `docs/SESSION_STATE.md` for the live status. In short: the app is built,
the migrations are written and verified safe to apply, and **they have not
been run yet** — until they are, the anon key can read every review.
`docs/RUNBOOK.md` step 2 is the fix.
