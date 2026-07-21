# WORKFLOW.md — Daily Developer Cheat Sheet
## To Read or Not to Read

Keep this open every time you work on the project.

---

## ONE-TIME SETUP (per clone)

**Enable the pre-commit secret check:**
```
git config core.hooksPath .githooks
```
This makes git run `.githooks/pre-commit` automatically before every commit. It blocks the commit if a staged file is a real `.env` file, or if staged changes look like they contain a real secret (API key, password, token, etc). It's a local git setting, not something that comes from cloning the repo, so run this once after every fresh clone.

---

## STARTING A SESSION

### Step 1 — Open two terminal tabs

**Tab 1 (main work terminal):**
```
cd ~/Desktop/git/bookclub-web-app
claude
```

**Tab 2 (autosave — keeps your work safe):**
```
cd ~/Desktop/git/bookclub-web-app
bash scripts/autosave.sh
```

---

### Step 2 — Brief Claude Code (paste this into Tab 1 after claude opens)

```
Read CLAUDE.md and docs/SESSION_STATE.md then tell me where we left off and what's next.
```

---

### Step 3 — Start the local server so you can see the app in your browser

**Tab 3 (or a new terminal):**
```
cd ~/Desktop/git/bookclub-web-app/frontend
python3 -m http.server 3000
```

Then open your browser and go to:
```
http://localhost:3000/pages/home.html
```

---

## DURING A SESSION

**See your changes in the browser:**
Just save the file in VS Code, then refresh the browser. No restart needed.

**If you want Copilot suggestions while editing:**
Open the file in VS Code. Copilot works automatically as you type.

**Ask Claude Code to do something:**
Just describe what you want in plain English in Tab 1. Always ask for a plan first:
```
Plan only (don't write code yet): I want to add X
```

**Ask Claude Code a question without changing code:**
```
Explain how X works in this project
```

---

## ENDING A SESSION

### Step 1 — Save session state (run in Tab 1)
```
bash scripts/update_session.sh "brief description of what you built today"
```

### Step 2 — Commit and push everything
```
git add .
git commit -m "feat: description of what you built"
git push
```

### Step 3 — Stop autosave and server
- Tab 2: `Ctrl+C`
- Tab 3: `Ctrl+C`

---

## STARTING A NEW CLAUDE DESKTOP CHAT

Open Claude Desktop or claude.ai, start a new chat, then paste this as your first message:

```
I am building a book club web app called "To Read or Not to Read".
Here is my current session state — please read it and tell me where we left off:

[paste the full contents of docs/SESSION_STATE.md here]
```

To get the contents of SESSION_STATE.md quickly:
```
cat ~/Desktop/git/bookclub-web-app/docs/SESSION_STATE.md | pbcopy
```
That copies it to your clipboard. Then just paste into the chat.

---

## QUICK REFERENCE — Useful Commands

| What | Command |
|---|---|
| Open Claude Code | `cd ~/Desktop/git/bookclub-web-app && claude` |
| Start local server | `cd ~/Desktop/git/bookclub-web-app/frontend && python3 -m http.server 3000` |
| View app in browser | `http://localhost:3000/pages/home.html` |
| Start autosave | `bash scripts/autosave.sh` |
| End session + save state | `bash scripts/update_session.sh "what you did"` |
| Commit everything | `git add . && git commit -m "message" && git push` |
| Copy session state to clipboard | `cat docs/SESSION_STATE.md \| pbcopy` |
| Check what files changed | `git status` |
| See recent commits | `git log --oneline -10` |
| Stop anything running | `Ctrl+C` |

---

## CONVENTIONAL COMMIT MESSAGES

Always start commit messages with one of these prefixes:

| Prefix | Use for |
|---|---|
| `feat:` | Adding a new feature or page |
| `fix:` | Fixing a bug |
| `style:` | Visual/CSS changes only |
| `docs:` | Updating documentation or SESSION_STATE |
| `chore:` | Scripts, config, housekeeping |
| `refactor:` | Reorganizing code without changing behavior |

Example: `git commit -m "feat: add countdown timer to home page"`

---

## IF SOMETHING GOES WRONG

**Accidentally deleted something:**
```
git status                    # see what changed
git checkout -- filename      # restore a single file
git reset --hard HEAD         # nuclear option: undo ALL uncommitted changes
```

**Claude Code is confused:**
```
/clear                        # clears Claude Code's context, start fresh
```
Then re-paste the briefing from Step 2 above.

**Local server not working:**
```
lsof -i :3000                 # see if something is already using port 3000
kill -9 [PID]                 # kill it (replace [PID] with the number shown)
python3 -m http.server 3000   # restart the server
```
