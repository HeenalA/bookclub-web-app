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

## Page 0 — Login ✅ APPROVED

**Flow:** Login page → User Home → click an active club → Group Home (existing club tabs).

**States (all mocked in `mockups.html`):**
- Sign in — email + password
- Request access — no self-serve signup; new accounts require manual admin approval. Form: name, email, password, optional note to admin.
- Pending approval — shown after submitting a request, or on a login attempt while still pending.

---

## Page 0.5 — User Home ✅ APPROVED

Lands here immediately after login. Has its own sub-tabs: **Clubs** (default) · **Books** · **Ratings** · **Reviews**.

**User card (top, all tabs):** avatar, name, email, "Edit profile."

**Clubs tab:**
- **Your book clubs** — active memberships, each with a Public/Private badge, member count, "Enter club →"
- **Was Your Bookclub** — clubs the user left (soft-deleted membership, see Data Model note below), shows "Inactive" + "Rejoin"
- **Could Be Your Bookclub** — search bar + "+ Create book club" button (to the right of search), then a paginated browse table (5 rows/page, Prev/Next):
  - Public clubs → "Request to join" (still requires admin approval)
  - Private clubs → inline join-code field + "Join" (the code itself is the gate; no separate approval on top of a valid code)
- **Pending requests (admin only)** — inline approve/deny list. Deliberately left here for now even after the Settings page gained its own copy of this (see Settings, below) — not yet decided which is canonical.
- **Create book club form** — club name (must be unique among *active* clubs) + visibility toggle. The creator becomes that club's admin.

**Books / Ratings / Reviews tabs:** the user's own data rolled up across *all* their clubs, single-column, no other members' names/ratings/reviews visible — lets a user see their reading history without opening a club page.
- Books tab: title, club badge, status (reading / rating badge if finished)
- Ratings tab: title, club badge, own rating badge only
- Reviews tab: title, club badge, own review text + own rating badge only

---

## Page 6 — Meetings ✅ APPROVED (partial — see open items)

**"+ Add meeting"** button lives here (top of page, next to the "Meetings" title) — date, time, location, and an optional linked book. This is the one and only place a meeting gets created.

**Next meeting card:** date block, discussion book, time + location, attendee avatars, and a small flag noting it drives the Home page hero countdown — the soonest future meeting date replaces the current hardcoded `NEXT_MEETING` placeholder in `main.js`.

**Past meetings:** simple list below — date, book discussed, location, who attended. An "Edit past meetings" toggle next to the section header reveals a per-row **Edit** button (the next-meeting card always shows its own Edit button, no toggle needed since there's only one). Edit opens the same form as "Add meeting," pre-filled, with a **Delete meeting** option added.

**Meeting numbers (`#1`, `#2`...):** always derived from date order, not a stored column — see `DECISIONS.md` ("Meeting numbers are computed, not stored"). This is what makes "delete #3, #4 becomes #3" happen automatically with no extra update logic.

**Still open:** who can add/edit a meeting — currently mocked as open to any active member (consistent with announcements, which any member can already post), not admin-gated. Revisit if that turns out to be wrong once real usage starts.

---

## Page 7 — Book Club Settings ✅ APPROVED (partial — see open items)

**Access:** every club member can open this page (tab visible to all, not admin-gated at the nav level).

**Members section — visible to all members:**
- List of members: avatar, name, Admin badge if applicable, member's color swatch + hex
- Each member can change their own color from here
- Admin-only controls layered into the *same* list: "Make admin" / "Remove admin" per row (visible only to admins)

**Admin only section (clearly separated, labeled):**
- Join code display + regenerate
- Pending join requests for this club (approve/deny) — currently duplicated with the user-home panel, see note above

**Still open / not designed yet:**
- Rename club
- Visibility toggle (public ⇄ private)
- Deactivate whole club / reactivate — reactivating requires the admin to choose a **new** club name, since the original name is freed for reuse the moment a club goes inactive (uniqueness is enforced among active clubs only)

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

- Book Club Settings: rename club, visibility toggle, deactivate/reactivate flow
- Whether admin-only pending-requests belongs on User Home, Settings, or both (currently mocked in both places)
- Club-level Books list page (not yet designed — distinct from the new personal Books/Ratings/Reviews tabs on User Home, which *are* designed)
- Whether "add meeting" should be admin-only rather than open to any member (see Page 6)
- Mobile layouts (desktop first, mobile later)
- Navigation final structure (current mockup is placeholder)
