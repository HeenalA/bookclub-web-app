/* ============================================================================
   date.js — date formatting and the countdown maths.
   ============================================================================
   LEARNING: `meeting_date` is a Postgres `date`, which arrives as the plain
   string "2026-07-05" with no time or zone. Passing that to `new Date()`
   directly makes JavaScript read it as UTC midnight, which in a North
   American timezone is the *previous* evening — so a meeting on the 5th
   displays as the 4th. Appending "T00:00:00" makes it parse as local midnight
   instead, which is what a date with no time actually means.
   ============================================================================ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07-05" -> a Date at local midnight. */
export function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-07-05" -> "Jul 5" */
export function formatMonthDay(value) {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "2026-07-05" -> "Jul 5, 2026" */
export function formatFullDate(value) {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "2020-06-01" -> "June 2020", for "Founded ..." */
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMonthYear(value) {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${LONG_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Today as "YYYY-MM-DD" in local time — the right default for a date input. */
export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A timestamptz -> "2 days ago". Used on announcements. */
export function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * Days / hours / minutes until a meeting date (plus optional free-text time).
 * Returns null once the moment has passed, which the countdown shows as
 * "Meeting time!".
 */
export function countdownTo(dateValue, timeValue) {
  const target = parseDateOnly(dateValue);
  if (!target) return null;

  // `meeting_time` is deliberately free text ("6:00 PM PST") so the club can
  // write whatever they like. We make a best effort to read an hour and minute
  // out of it for the countdown, and fall back to end-of-day if we cannot —
  // better than counting down to midnight and saying the meeting is over when
  // it has not started.
  const match = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(timeValue || "");
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    if (hour <= 23 && minute <= 59) target.setHours(hour, minute, 0, 0);
  } else {
    target.setHours(23, 59, 59, 999);
  }

  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
}
