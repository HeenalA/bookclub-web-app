/* reviews.js — prose reviews, one per member per book. */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";
import { AppError } from "./errors.js";

export const REVIEW_MAX_LENGTH = 5000;

export async function listClubReviews(clubId) {
  return unwrap(
    await sb
      .from("reviews")
      .select("member_id, book_id, text, books!inner ( club_id )")
      .eq("books.club_id", clubId)
  );
}

/** Write or rewrite your own review of a book. */
export async function setMyReview(memberId, bookId, text) {
  const body = String(text ?? "").trim();

  if (!body) throw new AppError("A review cannot be empty.");
  if (body.length > REVIEW_MAX_LENGTH) {
    throw new AppError(
      `A review has to be ${REVIEW_MAX_LENGTH} characters or fewer. Yours is ${body.length}.`
    );
  }

  return unwrap(
    await sb
      .from("reviews")
      .upsert(
        { member_id: memberId, book_id: bookId, text: body },
        { onConflict: "member_id,book_id" }
      )
      .select("member_id, book_id, text")
      .single()
  );
}

export async function deleteMyReview(memberId, bookId) {
  unwrap(
    await sb
      .from("reviews")
      .delete()
      .eq("member_id", memberId)
      .eq("book_id", bookId)
  );
}

export async function listMyReviews(memberId) {
  return unwrap(
    await sb
      .from("reviews")
      .select("book_id, text, books ( id, title, club_id, clubs ( id, name ) )")
      .eq("member_id", memberId)
      .order("book_id", { ascending: false })
  );
}
