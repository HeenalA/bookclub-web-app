/* ============================================================
   main.js — Loads data from seed_data.json and renders pages.
   LEARNING: fetch() reads seed_data.json, our stand-in database
   for Phase 1. In Phase 2 this becomes a real API call to
   FastAPI/Supabase instead — the HTML and render functions
   below won't need to change, only loadData() will.
   ============================================================ */

let DATA = null;

async function loadData() {
  const res = await fetch("../data/seed_data.json");
  DATA = await res.json();
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

  const nextMeeting = new Date(DATA.club.nextMeeting);

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

    const picker = memberById(book.pickedBy);
    const pickerColors = CHIP_COLORS[picker.id];

    html += `<tr>
      <td>
        <p class="book-num">#${book.id}</p>
        <p class="book-title-cell">${escapeHtml(book.title)}</p>
        <span class="picker-chip-sm" style="background:${pickerColors.bg};color:${pickerColors.text};">
          <span class="dot" style="background:${picker.color};"></span>${picker.name}
        </span>
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
});
