# DESIGN_SPEC.md — To Read or Not to Read
## UI Design Decisions & Mockup Reference

Paste this file into any new chat to restore full design context instantly.
The companion file `mockups.html` can be opened in any browser to see all approved mockups.

---

## Overall Design Direction

**Vibe:** Cozy bookshop meets playful social app. Warm paper tones, personality, movement.
**Desktop first.** Mobile is a future consideration.
**Font pairing:** Lora (serif, italic) for titles/numbers/headings. DM Sans for body and UI.

---

## Color System

| Member | Color | Hex | Usage |
|---|---|---|---|
| Maya | Muted blue | `#7B9EC9` | Avatar, chips for books she picked, column accent |
| Mina | Muted pink | `#C97B9E` | Avatar, chips for books she picked, column accent |
| Heenal | Muted purple | `#9E7BC9` | Avatar, chips for books she picked, column accent |

Colors are defined in `frontend/src/styles/variables.css` — configurable per group.
Each member can also choose their own color in their profile settings.

---

## Page 1 — Group Home Page ✅ APPROVED

**Layout:** Two column. Left = content. Right = bookshelf panel.

**Hero section (top):**
- Dark atmospheric background (group photo goes here)
- Overlay keeps text readable at all times
- "✎ Edit background" button — admin only, top-right corner
- Background chosen from preselected photo options (admin picks)
- Club name + founded date + book/meeting counts in white text
- Member avatars (colored circles with initials)
- Frosted glass countdown card — purple numbers, shows days/hours/minutes to next meeting + date

**Left column:**
- Currently reading card — book spine (picker color), title, author, picker chip, member reading avatars
- Announcements — left-bordered cards, border color = poster's member color
- Picker order — numbered list with member avatars, "Next" badge on current picker

**Right column (bookshelf panel):**
- Dark wood bookshelf visual
- Top shelf: top 3 rated books as leather-bound spines tinted in picker color, gold embossed titles running up spine
- Jail section: 1 book behind 4 thick opaque gray vertical bars. "JAIL" label on shelf wood below. Books dragged to -1000 row automatically appear here.
- Member profile icons: placeholder objects per member, customizable in profile settings, sit on shelf beside books
- Phase 2/3 feature — deferred for MVP, show placeholder panel in Phase 1

---

## Page 2 — Ratings Table ✅ APPROVED

**Key rules:**
- Chip color = **who picked the book**, not which column it's in
  - Maya's picks = blue chips in ALL columns
  - Mina's picks = pink chips in ALL columns
  - Heenal's picks = purple chips in ALL columns
- Columns separated by neutral `0.5px` vertical lines — no color fills on columns
- Each member can only drag chips in their own column
- Drag handle (⠿) on left of each chip

**Row order (top to bottom):**
- 10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5, 4, 3, 2, 1
- -1000 (directly below 1 — the jail/Flames of Chaos row)
- unrated (always at the very bottom)

**-1000 row behavior:**
- Treated as rating = 1 for all average calculations
- Books dragged here automatically appear on the bookshelf jail section
- Dragging a book out of -1000 removes it from jail shelf
- No special styling — same row appearance as all other rows
- Half-star ratings (7.5, 8.5, 9.5) are supported — configurable per group

**Header:**
- Legend showing member colors and "who picked" explanation
- Note: "Chip color = who picked the book · Drag chips to rerank · Each member edits their own column only"

---

## Page 3 — Reviews Table ✅ APPROVED

**Layout:** Full-width table. Rows = books (newest at top). Columns = members.

**Book column (leftmost):**
- Book number (#78, #77...)
- Title in Lora serif
- Picker chip (member color + name)

**Member columns:**
- Written review text (truncated to ~4 lines, expandable)
- Rating badge below review (colored by member)
- "+ Add review" placeholder when no review exists (dashed border, italic)

**Additional:**
- Year divider rows separating books by year read
- Search bar in header
- No average column (removed per PM decision)

---

## Bookshelf Visual (Phase 2/3) ⏳ DEFERRED

**Design direction confirmed but implementation deferred:**
- Illustrated-style bookshelf with dark wood tones
- Book spines: leather-texture appearance, tinted in picker color, gold embossed titles
- Three shelves: top reads / favorites / collectibles
- Jail section: books shown behind 4 thick opaque gray bars, "JAIL" label below on shelf wood
- Member profile objects: customizable items per member (plant, flower, crystal, etc.) chosen in profile
- Plants/objects represent gamified collectibles earned by completing books and reviews
- Collectibles shelf (bottom) shows earned items

---

## Deferred / Phase 2+ Features

| Feature | Notes |
|---|---|
| Bookshelf visual | Design direction clear, build in Phase 2 as React component |
| Group background photo | Admin selectable from presets. Deferred from MVP. |
| Member profile objects | Chosen in profile settings, appear on shelf. Phase 2. |
| Gamified collectibles | Earned by finishing books/writing reviews. Phase 3. |
| Jail shelf sync | Books in -1000 row auto-appear on shelf jail. Phase 2. |
| Half-star toggle | Per-group setting. Phase 2. |

---

## What Is NOT Approved / Still Open

- User profile page design (not yet designed)
- Books list page design (not yet designed)
- Meetings list page design (not yet designed)
- Mobile layouts (desktop first, mobile later)
- Navigation final structure (current mockup is placeholder)
