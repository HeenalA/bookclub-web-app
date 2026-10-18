/* books.js — a club's shelf, plus your own books across every club. */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";

const BOOK_FIELDS = "id, club_id, title, author, picked_by, status, year";

/** Every book on one club's shelf, oldest first (so #1 is the club's first). */
export async function listClubBooks(clubId) {
  return unwrap(
    await sb
      .from("books")
      .select(BOOK_FIELDS)
      .eq("club_id", clubId)
      .order("id", { ascending: true })
  );
}

export async function addBook(clubId, { title, author, pickedBy, status, year }) {
  return unwrap(
    await sb
      .from("books")
      .insert({
        club_id: clubId,
        title: title.trim(),
        author: author?.trim() || null,
        picked_by: pickedBy || null,
        status: status || "to_read",
        year: year || new Date().getFullYear(),
      })
      .select(BOOK_FIELDS)
      .single()
  );
}

export async function updateBook(bookId, patch) {
  const next = {};
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.author !== undefined) next.author = patch.author?.trim() || null;
  if (patch.pickedBy !== undefined) next.picked_by = patch.pickedBy || null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.year !== undefined) next.year = patch.year;

  return unwrap(
    await sb.from("books").update(next).eq("id", bookId).select(BOOK_FIELDS).single()
  );
}

/** Admin-only, enforced by the `books_delete_admin` policy. Cascades to
 *  everyone's ratings and reviews of this book — the UI warns about that. */
export async function deleteBook(bookId) {
  unwrap(await sb.from("books").delete().eq("id", bookId));
}

/** Your books across every club you are in — for the user home "Books" tab. */
export async function listMyBooks() {
  return unwrap(
    await sb
      .from("books")
      .select(BOOK_FIELDS + ", clubs ( id, name )")
      .order("id", { ascending: false })
  );
}
