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

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Fill in your Supabase credentials
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`
API docs available at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env           # Fill in your Supabase credentials
npm run dev
```

Frontend runs at `http://localhost:5173`

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
