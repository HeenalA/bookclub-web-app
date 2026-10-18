/* announcements.js — short club-wide notes, newest first. */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";
import { AppError } from "./errors.js";

export const ANNOUNCEMENT_MAX_LENGTH = 1000;

export async function listClubAnnouncements(clubId, limit = 5) {
  return unwrap(
    await sb
      .from("announcements")
      .select("id, club_id, member_id, text, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

export async function addAnnouncement(clubId, memberId, text) {
  const body = String(text ?? "").trim();

  if (!body) throw new AppError("An announcement cannot be empty.");
  if (body.length > ANNOUNCEMENT_MAX_LENGTH) {
    throw new AppError(
      `An announcement has to be ${ANNOUNCEMENT_MAX_LENGTH} characters or fewer.`
    );
  }

  return unwrap(
    await sb
      .from("announcements")
      .insert({ club_id: clubId, member_id: memberId, text: body })
      .select("id, club_id, member_id, text, created_at")
      .single()
  );
}

/** Your own, or anyone's if you are an admin — see the
 *  `announcements_delete_own_or_admin` policy. */
export async function deleteAnnouncement(announcementId) {
  unwrap(await sb.from("announcements").delete().eq("id", announcementId));
}
