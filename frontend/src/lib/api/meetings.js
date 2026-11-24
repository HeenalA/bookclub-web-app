/* ============================================================================
   meetings.js
   ============================================================================
   There is no `meeting_number` column in the database, on purpose (see
   docs/DECISIONS.md). Display numbers are derived from date order here, so
   deleting meeting #2 renumbers the rest automatically with no update to run
   and no chance of the stored numbers drifting out of order.
   ============================================================================ */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";

const MEETING_FIELDS =
  "id, club_id, meeting_date, meeting_time, location, book_id, created_by";

/**
 * A club's meetings, oldest first, each tagged with its display number.
 * Number 1 is the club's first-ever meeting.
 */
export async function listClubMeetings(clubId) {
  const rows = unwrap(
    await sb
      .from("meetings")
      .select(MEETING_FIELDS + ", books ( id, title )")
      .eq("club_id", clubId)
      .order("meeting_date", { ascending: true })
  );

  return rows.map((row, index) => ({ ...row, number: index + 1 }));
}

/**
 * The next meeting from today onward — what the home page counts down to.
 * Returns null when nothing is scheduled, which the countdown handles by
 * inviting someone to add one.
 */
export function nextMeeting(meetings) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return (
    meetings.find((m) => new Date(`${m.meeting_date}T00:00:00`) >= startOfToday) ??
    null
  );
}

/** Past meetings, most recent first — the order the Meetings page lists them. */
export function pastMeetings(meetings) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return meetings
    .filter((m) => new Date(`${m.meeting_date}T00:00:00`) < startOfToday)
    .reverse();
}

export async function addMeeting(clubId, memberId, fields) {
  return unwrap(
    await sb
      .from("meetings")
      .insert({
        club_id: clubId,
        created_by: memberId,
        meeting_date: fields.date,
        meeting_time: fields.time?.trim() || null,
        location: fields.location?.trim() || null,
        book_id: fields.bookId || null,
      })
      .select(MEETING_FIELDS)
      .single()
  );
}

export async function updateMeeting(meetingId, fields) {
  const patch = {};
  if (fields.date !== undefined) patch.meeting_date = fields.date;
  if (fields.time !== undefined) patch.meeting_time = fields.time?.trim() || null;
  if (fields.location !== undefined)
    patch.location = fields.location?.trim() || null;
  if (fields.bookId !== undefined) patch.book_id = fields.bookId || null;

  return unwrap(
    await sb
      .from("meetings")
      .update(patch)
      .eq("id", meetingId)
      .select(MEETING_FIELDS)
      .single()
  );
}

export async function deleteMeeting(meetingId) {
  unwrap(await sb.from("meetings").delete().eq("id", meetingId));
}
