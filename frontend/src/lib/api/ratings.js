/* ============================================================================
   ratings.js
   ============================================================================
   The jail value needs a word of explanation. A rating of -1000 is the club's
   long-standing way of marking a book as irredeemable; it gets its own row at
   the bottom of the ratings table and counts as 1 when averaging. It is a real
   value in the database with a real check constraint, not a magic null.
   ============================================================================ */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";
import { AppError } from "./errors.js";

export const JAIL_VALUE = -1000;

/** Mirrors the `ratings_value_valid` check constraint in migration 0001, so
 *  the UI can refuse bad input before a round trip. The database remains the
 *  authority — this is for a fast, clear error, not for security. */
export function isValidRating(value) {
  if (value === JAIL_VALUE) return true;
  if (typeof value !== "number" || Number.isNaN(value)) return false;
  if (value < 1 || value > 10) return false;
  return value * 2 === Math.trunc(value * 2);
}

/** Every rating on a club's books.
 *
 *  LEARNING: `books!inner(club_id)` is how you filter by a column on a related
 *  table. The `!inner` makes it an inner join, so a rating only comes back if
 *  its book matches — without it you would get every rating you can see, each
 *  with a null book attached. */
export async function listClubRatings(clubId) {
  return unwrap(
    await sb
      .from("ratings")
      .select("member_id, book_id, value, books!inner ( club_id )")
      .eq("books.club_id", clubId)
  );
}

/** Set (or change) your own rating of a book.
 *
 *  `upsert` means "insert, or update the existing row if one already exists".
 *  It works here because (member_id, book_id) is the table's primary key, so
 *  the database knows what counts as "already exists". */
export async function setMyRating(memberId, bookId, value) {
  if (!isValidRating(value)) {
    throw new AppError(
      "A rating has to be between 1 and 10 in half-point steps, or the jail value."
    );
  }

  return unwrap(
    await sb
      .from("ratings")
      .upsert(
        { member_id: memberId, book_id: bookId, value },
        { onConflict: "member_id,book_id" }
      )
      .select("member_id, book_id, value")
      .single()
  );
}

export async function clearMyRating(memberId, bookId) {
  unwrap(
    await sb
      .from("ratings")
      .delete()
      .eq("member_id", memberId)
      .eq("book_id", bookId)
  );
}

export async function listMyRatings(memberId) {
  return unwrap(
    await sb
      .from("ratings")
      .select("book_id, value, books ( id, title, club_id, clubs ( id, name ) )")
      .eq("member_id", memberId)
      .order("value", { ascending: false })
  );
}

/** The club's average for a book. The jail value counts as 1, per the club's
 *  own rule — so a jailed book drags an average down without -1000 making the
 *  number meaningless. */
export function averageRating(ratings) {
  if (!ratings.length) return null;
  const total = ratings.reduce(
    (sum, r) => sum + (Number(r.value) === JAIL_VALUE ? 1 : Number(r.value)),
    0
  );
  return total / ratings.length;
}
