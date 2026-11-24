import { Fragment, useMemo, useState } from "react";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { useClub, useClubId } from "../lib/hooks/useClub.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import { listClubBooks } from "../lib/api/books.js";
import { listClubRatings, JAIL_VALUE } from "../lib/api/ratings.js";
import {
  listClubReviews,
  setMyReview,
  deleteMyReview,
  REVIEW_MAX_LENGTH,
} from "../lib/api/reviews.js";
import { toAppError } from "../lib/api/errors.js";
import { Page } from "../components/layout/AppShell.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { ErrorBanner, LoadingRow, EmptyState } from "../components/ui/Feedback.jsx";
import styles from "./ClubTable.module.css";

export default function ClubReviews() {
  const clubId = useClubId();
  const { member } = useAuth();
  const { activeMembers, memberById } = useClub();

  const books = useAsync(() => listClubBooks(clubId), [clubId]);
  const reviews = useAsync(() => listClubReviews(clubId), [clubId]);
  const ratings = useAsync(() => listClubRatings(clubId), [clubId]);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);

  /* Display numbers are per club: #1 is this club's first book, regardless of
     the global `books.id`. Without this, a second club's first book would
     display as "#82". */
  const displayNumbers = useMemo(() => {
    const ascending = [...(books.data ?? [])].sort((a, b) => a.id - b.id);
    return Object.fromEntries(ascending.map((b, i) => [b.id, i + 1]));
  }, [books.data]);

  const reviewByKey = useMemo(
    () =>
      Object.fromEntries(
        (reviews.data ?? []).map((r) => [`${r.member_id}:${r.book_id}`, r.text])
      ),
    [reviews.data]
  );

  const ratingByKey = useMemo(
    () =>
      Object.fromEntries(
        (ratings.data ?? []).map((r) => [
          `${r.member_id}:${r.book_id}`,
          Number(r.value),
        ])
      ),
    [ratings.data]
  );

  /* Rows, newest first, each flagged with whether it opens a new year group.
     The flag compares each book against its predecessor by index rather than
     carrying a running variable. That is deliberate: mutating a variable
     while rendering is unsafe, because React can render a component twice or
     abandon a render part-way, and the leftover value then leaks into the
     next attempt. Comparing by index has no state to leak. */
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...(books.data ?? [])]
      .filter((b) => !term || b.title.toLowerCase().includes(term))
      .sort((a, b) => b.id - a.id);

    return sorted.map((book, index) => ({
      book,
      startsYear: Boolean(book.year) && book.year !== sorted[index - 1]?.year,
    }));
  }, [books.data, search]);

  async function save(bookId, text) {
    setActionError(null);
    try {
      if (text === null) await deleteMyReview(member.id, bookId);
      else await setMyReview(member.id, bookId, text);
      setEditing(null);
      reviews.reload();
    } catch (err) {
      setActionError(toAppError(err));
      throw err;
    }
  }

  if (books.loading || reviews.loading || ratings.loading) {
    return (
      <Page wide>
        <LoadingRow label="Loading reviews…" />
      </Page>
    );
  }

  const loadError = books.error || reviews.error || ratings.error;
  if (loadError) {
    return (
      <Page wide>
        <ErrorBanner
          error={loadError}
          onRetry={() => {
            books.reload();
            reviews.reload();
            ratings.reload();
          }}
        />
      </Page>
    );
  }

  if ((books.data ?? []).length === 0) {
    return (
      <Page wide>
        <EmptyState icon="✍️" title="No books to review yet">
          Add a book on the Books page first.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page wide>
      <div className={styles.header}>
        <span className={styles.title}>Reviews</span>
        <input
          type="search"
          placeholder="Search books…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search books"
          style={{
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--text-small)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            background: "var(--surface-card)",
          }}
        />
      </div>
      <p className={styles.note}>
        Newest books first · you can only edit your own column
      </p>

      <ErrorBanner error={actionError} onDismiss={() => setActionError(null)} />

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.bookCell}>Book</th>
              {activeMembers.map((m) => (
                <th key={m.id} className={m.id === member.id ? styles.ownCol : undefined}>
                  <span className={styles.colHead}>
                    <Avatar member={m} size="md" />
                    {m.name}
                    {m.id === member.id && " (you)"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ book, startsYear }) => {
              const picker = book.picked_by ? memberById[book.picked_by] : null;

              return (
                <Fragment key={book.id}>
                  {startsYear && (
                    <tr className={styles.yearRow}>
                      <td colSpan={activeMembers.length + 1}>{book.year}</td>
                    </tr>
                  )}
                  <tr>
                    <td className={styles.bookCell}>
                      <p className={styles.bookNum}>#{displayNumbers[book.id]}</p>
                      <p className={styles.bookTitle}>{book.title}</p>
                      {picker && (
                        <Badge member={picker} dot>
                          {picker.name}
                        </Badge>
                      )}
                    </td>

                    {activeMembers.map((m) => {
                      const key = `${m.id}:${book.id}`;
                      const text = reviewByKey[key];
                      const rating = ratingByKey[key];
                      const isMine = m.id === member.id;

                      return (
                        <td
                          key={m.id}
                          className={isMine ? styles.ownCol : undefined}
                        >
                          {text ? (
                            <>
                              <p className={styles.reviewText}>{text}</p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "var(--space-2)",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                {rating !== undefined && (
                                  <Badge member={m}>
                                    {rating === JAIL_VALUE ? "jail" : `${rating} ★`}
                                  </Badge>
                                )}
                                {isMine && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setEditing({ book, text, member: m })
                                    }
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : isMine ? (
                            <button
                              type="button"
                              className={styles.addCell}
                              onClick={() =>
                                setEditing({ book, text: "", member: m })
                              }
                            >
                              + Add review
                            </button>
                          ) : (
                            <span className={styles.cellEmpty}>No review yet</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReviewEditor editing={editing} onClose={() => setEditing(null)} onSave={save} />
    </Page>
  );
}

function ReviewEditor({ editing, onClose, onSave }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialised, setInitialised] = useState(null);

  /* Reset the textarea when a different cell is opened. Deriving state from
     props like this (rather than in an effect) is the pattern React
     recommends: it updates during render, so there is no flash of the
     previous book's review. */
  if (editing && initialised !== editing.book.id) {
    setInitialised(editing.book.id);
    setText(editing.text ?? "");
  }

  if (!editing) return null;

  async function submit(nextText) {
    setBusy(true);
    try {
      await onSave(editing.book.id, nextText);
    } catch {
      /* The error banner on the page shows it; keep the modal open so the
         text is not lost. */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing.book.title}
      subtitle="Your review. Only members of this club can read it."
    >
      <Field
        as="textarea"
        label="Review"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={REVIEW_MAX_LENGTH}
        placeholder="What did you think?"
      />
      <ModalActions>
        <Button
          variant="primary"
          busy={busy}
          busyLabel="Saving…"
          onClick={() => submit(text)}
        >
          Save review
        </Button>
        {editing.text && (
          <Button variant="danger" disabled={busy} onClick={() => submit(null)}>
            Delete review
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
