/* ============================================================
   main.js — Loads live data from Supabase and renders pages.
   LEARNING: this used to fetch() seed_data.json as a stand-in
   database. Now it queries the real Supabase tables directly via
   supabase-js (loaded from a CDN script tag in each page, before
   this file). The render functions below didn't need to change —
   only loadData() did — because we map the DB's snake_case columns
   (member_id, book_id, picked_by) to the same camelCase shape
   (memberId, bookId, pickedBy) the rest of this file already expects.
   ============================================================ */

let DATA = null;

// No `clubs`/`meetings` table exists in Supabase yet (that's a future
// multi-club schema change) — this stays a local placeholder until then.
// NOTE: this date is already in the past; update it to the real next
// meeting date whenever that's scheduled.
const NEXT_MEETING = "2026-07-05T18:00:00-07:00";

async function loadData() {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [membersRes, booksRes, ratingsRes, reviewsRes] = await Promise.all([
    sb.from("members").select("*"),
    sb.from("books").select("*"),
    sb.from("ratings").select("*"),
    sb.from("reviews").select("*"),
  ]);

  for (const [label, res] of [
    ["members", membersRes], ["books", booksRes],
    ["ratings", ratingsRes], ["reviews", reviewsRes],
  ]) {
    if (res.error) throw new Error(`Failed to load ${label} from Supabase: ${res.error.message}`);
  }

  DATA = {
    members: membersRes.data.map(m => ({
      id: m.id, name: m.name, color: m.color, initials: m.initials,
    })),
    books: booksRes.data.map(b => ({
      id: b.id, title: b.title, author: b.author,
      pickedBy: b.picked_by, status: b.status, year: b.year,
    })),
    ratings: ratingsRes.data.map(r => ({
      memberId: r.member_id, bookId: r.book_id, value: r.value,
    })),
    reviews: reviewsRes.data.map(r => ({
      memberId: r.member_id, bookId: r.book_id, text: r.text,
    })),
  };
  return DATA;
}

function memberById(id) {
  return DATA.members.find(m => m.id === id);
}

function bookById(id) {
  return DATA.books.find(b => b.id === id);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const CHIP_COLORS = {
  maya:   { bg: "#deeaf5", text: "#185FA5" },
  mina:   { bg: "#f4c0d1", text: "#72243E" },
  heenal: { bg: "#e8dcf5", text: "#3C3489" }
};

// --- CURRENT USER (Phase 1 stand-in for real login) ---
// LEARNING: this is client-side only — nothing stops a user from
// editing someone else's data by hand in dev tools. Real
// authorization has to be enforced server-side (Phase 2: Supabase
// Auth + row-level security), not just hidden in the UI like this.

const CURRENT_USER_KEY = "bookclub_current_user";

function getCurrentUserId() {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return DATA.members.some(m => m.id === stored) ? stored : DATA.members[0].id;
}

function setCurrentUserId(id) {
  localStorage.setItem(CURRENT_USER_KEY, id);
}

function renderProfileBar() {
  const welcomeEl = document.getElementById("welcome-msg");
  const profileBtn = document.getElementById("profile-tab");
  if (!welcomeEl || !profileBtn) return;

  const currentId = getCurrentUserId();
  welcomeEl.textContent = `Welcome, ${memberById(currentId).name}`;

  // LEARNING: no real profile page yet, so clicking Profile cycles
  // through members as a stand-in for "switch who's logged in."
  profileBtn.onclick = () => {
    const idx = DATA.members.findIndex(m => m.id === currentId);
    const next = DATA.members[(idx + 1) % DATA.members.length];
    setCurrentUserId(next.id);
    location.reload();
  };
}

function highlightOwnColumn() {
  const currentId = getCurrentUserId();
  DATA.members.forEach(member => {
    const th = document.getElementById(`col-head-${member.id}`);
    if (th) th.classList.toggle("own-col", member.id === currentId);
  });
}

// --- COUNTDOWN TIMER ---
// LEARNING: setInterval runs a function repeatedly on a timer.
// Here we update the countdown display every second.

function initCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;

  const nextMeeting = new Date(NEXT_MEETING);

  function tick() {
    const diff = nextMeeting - new Date();

    if (diff <= 0) {
      el.innerHTML = '<span style="color:#9E7BC9;font-family:Lora,serif;">Meeting time!</span>';
      return;
    }

    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    el.querySelector(".cnt-days").textContent  = String(days).padStart(2, "0");
    el.querySelector(".cnt-hours").textContent = String(hours).padStart(2, "0");
    el.querySelector(".cnt-mins").textContent  = String(mins).padStart(2, "0");
  }

  tick();
  setInterval(tick, 1000);
}

// --- RATINGS TABLE ---
// Groups every rating by its value (10, 9.5, 9, ... jail, unrated)
// and renders one row per value, one chip per rated book.

function chipHtml(title, pickerId, editable) {
  const cls = pickerId || "unrated";
  const handle = editable ? '<span class="chip-drag">⠿</span>' : "";
  const readonlyCls = editable ? "" : " chip-readonly";
  return `<span class="chip ${cls}${readonlyCls}">${handle}${escapeHtml(title)}</span>`;
}

function renderRatingsTable() {
  const tbody = document.getElementById("ratings-body");
  if (!tbody) return;

  const currentId = getCurrentUserId();
  const values = [...new Set(DATA.ratings.filter(r => r.value > 0).map(r => r.value))]
    .sort((a, b) => b - a);

  let html = "";

  values.forEach(value => {
    html += `<tr><td class="star-label">${value}</td>`;
    DATA.members.forEach(member => {
      const editable = member.id === currentId;
      html += `<td class="col-member">`;
      DATA.ratings
        .filter(r => r.memberId === member.id && r.value === value)
        .forEach(r => {
          const book = bookById(r.bookId);
          html += chipHtml(book.title, book.pickedBy, editable);
        });
      html += `</td>`;
    });
    html += `</tr>`;
  });

  // Jail row — LEARNING: -1000 counts as 1 in averages per the data model, no special styling beyond the label.
  html += `<tr><td class="star-label" style="font-size:12px;">-1000</td>`;
  DATA.members.forEach(member => {
    const editable = member.id === currentId;
    html += `<td class="col-member">`;
    DATA.ratings
      .filter(r => r.memberId === member.id && r.value === -1000)
      .forEach(r => {
        const book = bookById(r.bookId);
        html += chipHtml(book.title, book.pickedBy, editable);
      });
    html += `</td>`;
  });
  html += `</tr>`;

  // Unrated row — books currently being read, not yet rated by anyone.
  const unratedBooks = DATA.books.filter(b => b.status === "reading");
  if (unratedBooks.length) {
    html += `<tr><td class="star-label" style="font-size:11px;">unrated</td>`;
    DATA.members.forEach(member => {
      const editable = member.id === currentId;
      html += `<td class="col-member">`;
      unratedBooks.forEach(book => {
        html += chipHtml(book.title, null, editable);
      });
      html += `</td>`;
    });
    html += `</tr>`;
  }

  tbody.innerHTML = html;
  highlightOwnColumn();
}

// --- REVIEWS TABLE ---
// Books newest first, grouped by year, one column per member.

function renderReviewsTable() {
  const tbody = document.getElementById("reviews-body");
  if (!tbody) return;

  const currentId = getCurrentUserId();
  const sortedBooks = [...DATA.books].sort((a, b) => b.id - a.id);
  let html = "";
  let lastYear = null;

  sortedBooks.forEach(book => {
    if (book.year !== lastYear) {
      html += `<tr class="year-divider"><td colspan="4">${book.year}</td></tr>`;
      lastYear = book.year;
    }

    // book.pickedBy is null for ~10 real books with no recorded picker —
    // memberById() correctly returns undefined for those, so the chip
    // below is only rendered when there's an actual picker to show.
    const picker = memberById(book.pickedBy);
    const pickerColors = picker ? CHIP_COLORS[picker.id] : null;

    html += `<tr>
      <td>
        <p class="book-num">#${book.id}</p>
        <p class="book-title-cell">${escapeHtml(book.title)}</p>
        ${picker ? `<span class="picker-chip-sm" style="background:${pickerColors.bg};color:${pickerColors.text};">
          <span class="dot" style="background:${picker.color};"></span>${picker.name}
        </span>` : ""}
      </td>`;

    DATA.members.forEach(member => {
      const review = DATA.reviews.find(r => r.bookId === book.id && r.memberId === member.id);
      if (review) {
        const rating = DATA.ratings.find(r => r.bookId === book.id && r.memberId === member.id);
        const colors = CHIP_COLORS[member.id];
        html += `<td>
          <p class="review-text">${escapeHtml(review.text)}</p>
          ${rating ? `<span class="rating-badge" style="background:${colors.bg};color:${colors.text};">${rating.value} ★</span>` : ""}
        </td>`;
      } else if (member.id === currentId) {
        html += `<td><div class="add-review">+ Add review</div></td>`;
      } else {
        html += `<td><p class="text-sm text-muted" style="padding:10px 0;">No review yet</p></td>`;
      }
    });

    html += `</tr>`;
  });

  tbody.innerHTML = html;
  highlightOwnColumn();
}

// --- ACTIVE NAV LINK ---
function highlightActiveNav() {
  document.querySelectorAll(".nav-links a").forEach(link => {
    if (link.href === window.location.href) link.classList.add("active");
  });
}

// --- INIT ---
loadData().then(() => {
  renderProfileBar();
  initCountdown();
  renderRatingsTable();
  renderReviewsTable();
  highlightActiveNav();
}).catch(err => {
  console.error("Failed to load data from Supabase:", err);
});
