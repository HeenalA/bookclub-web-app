/* ============================================================================
   errors.js — turn database errors into sentences a person can act on.
   ============================================================================
   Two different kinds of error arrive from Supabase and they need opposite
   treatment:

   1. Errors RAISED BY OUR OWN FUNCTIONS in db/migrations/0004_rpc.sql. Those
      messages were written to be read by a user ("You are the only admin.
      Make someone else an admin before you leave.") and should be shown as-is.

   2. Raw Postgres errors from a direct table write. Those read like
      'new row for relation "ratings" violates check constraint
      "ratings_value_valid"' — accurate, useless to a person. These get
      translated by constraint name.

   LEARNING: there is a security dimension to error text. Saying "that email is
   not registered" on a failed login tells an attacker which addresses have
   accounts. Supabase deliberately returns one generic message for bad email
   and bad password alike, and the login screen passes it through unchanged.
   ============================================================================ */

/* Friendly text for each database constraint that a user could realistically
   trip. Keyed by the constraint names defined in migration 0001. */
const CONSTRAINT_MESSAGES = {
  ratings_value_valid:
    "A rating has to be between 1 and 10 in half-point steps, or the jail value.",
  reviews_text_len:
    "A review needs to be between 1 and 5000 characters.",
  books_title_len:
    "A book title needs to be between 1 and 300 characters.",
  books_status_valid:
    "A book can only be on the to-read list, being read, or finished.",
  books_year_range: "That year does not look right.",
  members_color_format:
    "A colour has to be a six-digit hex value like #9E7BC9.",
  members_name_len: "A name needs to be between 1 and 60 characters.",
  members_email_unique: "That email address is already in use.",
  clubs_name_len: "A club name needs to be between 2 and 60 characters.",
  clubs_active_name_unique: "A book club with that name already exists.",
  announcements_text_len:
    "An announcement needs to be between 1 and 1000 characters.",
  meetings_location_len: "That location is too long (120 characters max).",
  meetings_date_range: "That date does not look right.",
};

export class AppError extends Error {
  constructor(message, { code = null, cause = null } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}

export function toAppError(error) {
  if (!error) return new AppError("Something went wrong.");
  if (error instanceof AppError) return error;

  const code = error.code || null;
  const raw = error.message || "";

  // A constraint violation — translate it.
  const hit = Object.keys(CONSTRAINT_MESSAGES).find((name) =>
    raw.includes(name)
  );
  if (hit) return new AppError(CONSTRAINT_MESSAGES[hit], { code, cause: error });

  // PostgREST: `.single()` matched no rows.
  if (code === "PGRST116") {
    return new AppError("That record could not be found.", { code, cause: error });
  }

  // A row was rejected by Row Level Security. Worth its own message because
  // this is the one users will hit if their membership lapses mid-session.
  if (code === "42501" && !raw.trim()) {
    return new AppError(
      "You do not have permission to do that. If you were just removed from a club, try signing out and back in.",
      { code, cause: error }
    );
  }

  // Offline / DNS / CORS failures surface as a TypeError from fetch.
  if (error.name === "TypeError" || /fetch|network/i.test(raw)) {
    return new AppError(
      "Could not reach the server. Check your connection and try again.",
      { code, cause: error }
    );
  }

  // Everything else: our RPCs raise messages that are already user-facing.
  return new AppError(raw || "Something went wrong.", { code, cause: error });
}

/**
 * Unwrap a Supabase `{ data, error }` response, throwing a friendly error.
 *
 * LEARNING: supabase-js does NOT throw on a failed query — it resolves with an
 * `error` property instead. That means a missing `if (error)` check is silent:
 * the code carries on with `data` set to null and fails later somewhere
 * confusing. Funnelling every call through here makes forgetting impossible.
 */
export function unwrap(response) {
  if (response.error) throw toAppError(response.error);
  return response.data;
}
