/* ============================================================
   main.js — Static data and basic interactivity
   LEARNING: In Phase 1 we use hardcoded JS data instead of
   a real database. When we add the backend in Phase 2, we'll
   replace this data with API calls — but the HTML won't change.
   ============================================================ */

// --- STATIC DATA ---
// This mirrors what our database will eventually store.
// The structure here matches our data models in CLAUDE.md.

const MEMBERS = {
  maya:   { name: "Maya",   color: "#7B9EC9", initials: "M"  },
  mina:   { name: "Mina",   color: "#C97B9E", initials: "Mi" },
  heenal: { name: "Heenal", color: "#9E7BC9", initials: "H"  }
};

const CLUB = {
  name: "To Read or Not to Read",
  founded: "June 2020",
  bookCount: 78,
  meetingCount: 76,
  nextMeeting: new Date("2026-07-05T18:00:00-07:00"),
  pickerOrder: ["maya", "mina", "heenal"],
  nextPickerIndex: 0  // Maya is next
};

const ANNOUNCEMENTS = [
  { text: "Meeting rescheduled to June 5 — same time, new location. Check the group chat.", author: "maya", daysAgo: 2 },
  { text: "Reminder: rate Bandit Queens! It has been two weeks.", author: "heenal", daysAgo: 5 }
];

const CURRENT_BOOK = {
  title: "Everything I Never Told You",
  author: "Celeste Ng",
  pickedBy: "heenal",
  readers: ["maya", "mina", "heenal"]
};

// Sample books for ratings table (subset of the full 78)
const SAMPLE_RATINGS = [
  {
    title: "A Darker Shade of Magic", pickedBy: "maya",
    ratings: { maya: 10, mina: 10, heenal: 10 }
  },
  {
    title: "Tomorrow and Tomorrow and Tomorrow", pickedBy: "mina",
    ratings: { maya: 10, mina: null, heenal: 10 }
  },
  {
    title: "Mistborn", pickedBy: "maya",
    ratings: { maya: 10, mina: 10, heenal: null }
  },
  {
    title: "Fourth Wing", pickedBy: "heenal",
    ratings: { maya: 9, mina: 10, heenal: null }
  },
  {
    title: "Remarkably Bright Creatures", pickedBy: "maya",
    ratings: { maya: 9.5, mina: 9.5, heenal: 9.5 }
  },
  {
    title: "Flames of Chaos", pickedBy: "heenal",
    ratings: { maya: -1000, mina: -1000, heenal: -1000 }
  },
  {
    title: "Everything I Never Told You", pickedBy: "heenal",
    ratings: { maya: null, mina: null, heenal: null }
  }
];

// --- COUNTDOWN TIMER ---
// LEARNING: setInterval runs a function repeatedly on a timer.
// Here we update the countdown display every second.

function updateCountdown() {
  const now = new Date();
  const diff = CLUB.nextMeeting - now;

  if (diff <= 0) {
    const el = document.getElementById("countdown");
    if (el) el.innerHTML = '<span style="color:#9E7BC9;font-family:Lora,serif;">Meeting time!</span>';
    return;
  }

  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const el = document.getElementById("countdown");
  if (el) {
    el.querySelector(".cnt-days").textContent  = String(days).padStart(2, "0");
    el.querySelector(".cnt-hours").textContent = String(hours).padStart(2, "0");
    el.querySelector(".cnt-mins").textContent  = String(mins).padStart(2, "0");
  }
}

// Start countdown if the element exists on this page
if (document.getElementById("countdown")) {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// --- ACTIVE NAV LINK ---
// Highlight the current page in the nav
document.querySelectorAll(".nav-links a").forEach(link => {
  if (link.href === window.location.href) link.classList.add("active");
});
