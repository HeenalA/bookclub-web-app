/* members.js — the signed-in person's own profile row. */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";
import { AppError } from "./errors.js";

/**
 * The `members` row belonging to the current auth account.
 *
 * Returns null when there is no row — which should not happen, because the
 * trigger in db/migrations/0002_auth_link.sql creates one for every new auth
 * account. If it does, the account was created before that migration ran, and
 * the UI says so rather than showing a blank app.
 */
export async function getMyMember(authUserId) {
  const rows = unwrap(
    await sb
      .from("members")
      .select("id, name, color, initials, email")
      .eq("auth_user_id", authUserId)
      .limit(1)
  );
  return rows[0] ?? null;
}

/** Update your own display details. The column grant in migration 0005 is
 *  what makes it impossible to reach `email` or `auth_user_id` from here. */
export async function updateMyProfile(memberId, { name, color, initials }) {
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (color !== undefined) patch.color = color;
  if (initials !== undefined) patch.initials = initials.trim().slice(0, 3);

  if (Object.keys(patch).length === 0) {
    throw new AppError("Nothing to update.");
  }

  return unwrap(
    await sb
      .from("members")
      .update(patch)
      .eq("id", memberId)
      .select("id, name, color, initials, email")
      .single()
  );
}
