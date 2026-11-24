import { useMemo, useState } from "react";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { useClub, useClubId } from "../lib/hooks/useClub.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import { listClubBooks } from "../lib/api/books.js";
import {
  listClubRatings,
  setMyRating,
  clearMyRating,
  JAIL_VALUE,
} from "../lib/api/ratings.js";
import { toAppError } from "../lib/api/errors.js";
import { Page } from "../components/layout/AppShell.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Chip } from "../components/ui/Chip.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { ErrorBanner, LoadingRow, EmptyState } from "../components/ui/Feedback.jsx";
import styles from "./ClubTable.module.css";

/* The whole scale, so every row exists whether or not anyone has used it yet.
   Half steps appear only when someone has actually given one, which keeps the
   table from being 19 rows tall by default. */
const WHOLE_VALUES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const ALL_PICKER_VALUES = [
  10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1,
];

export default function ClubRatings() {
  const clubId = useClubId();
  const { member } = useAuth();
  const { activeMembers, memberById } = useClub();

  const books = useAsync(() => listClubBooks(clubId), [clubId]);
  const ratings = useAsync(() => listClubRatings(clubId), [clubId]);

  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const bookById = useMemo(
    () => Object.fromEntries((books.data ?? []).map((b) => [b.id, b])),
    [books.data]
  );

  /* ratings indexed by "memberId:bookId" and by "memberId:value", so a cell
     is a lookup instead of a filter over every rating in the club. */
  const index = useMemo(() => {
    const byMemberValue = new Map();
    const byMemberBook = new Map();

    for (const row of ratings.data ?? []) {
      const value = Number(row.value);
      byMemberBook.set(`${row.member_id}:${row.book_id}`, value);

      const key = `${row.member_id}:${value}`;
      if (!byMemberValue.has(key)) byMemberValue.set(key, []);
      byMemberValue.get(key).push(row.book_id);
    }

    return { byMemberValue, byMemberBook };
  }, [ratings.data]);

  /* Which rows to render: the whole numbers always, plus any half step
     somebody has used. */
  const scaleRows = useMemo(() => {
    const used = new Set(
      (ratings.data ?? [])
        .map((r) => Number(r.value))
        .filter((v) => v !== JAIL_VALUE)
    );
    return [...new Set([...WHOLE_VALUES, ...used])].sort((a, b) => b - a);
  }, [ratings.data]);

  const unratedByMember = useMemo(() => {
    const out = {};
    for (const m of activeMembers) {
      out[m.id] = (books.data ?? []).filter(
        (b) => !index.byMemberBook.has(`${m.id}:${b.id}`)
      );
    }
    return out;
  }, [activeMembers, books.data, index]);

  async function save(bookId, value) {
    setActionError(null);
    try {
      if (value === null) await clearMyRating(member.id, bookId);
      else await setMyRating(member.id, bookId, value);
      setEditing(null);
      ratings.reload();
    } catch (err) {
      setActionError(toAppError(err));
    }
  }

  if (books.loading || ratings.loading) {
    return (
      <Page wide>
        <LoadingRow label="Loading ratings…" />
      </Page>
    );
  }

  const loadError = books.error || ratings.error;
  if (loadError) {
    return (
      <Page wide>
        <ErrorBanner
          error={loadError}
          onRetry={() => {
            books.reload();
            ratings.reload();
          }}
        />
      </Page>
    );
  }

  if ((books.data ?? []).length === 0) {
    return (
      <Page wide>
        <EmptyState icon="⭐" title="No books to rate yet">
          Add a book on the Books page and it will appear here.
        </EmptyState>
      </Page>
    );
  }

  function cell(memberId, value) {
    const bookIds = index.byMemberValue.get(`${memberId}:${value}`) ?? [];
    const isMine = memberId === member.id;

    if (bookIds.length === 0) {
      return <span className={styles.cellEmpty}>—</span>;
    }

    return bookIds.map((bookId) => {
      const book = bookById[bookId];
      if (!book) return null;
      const picker = book.picked_by ? memberById[book.picked_by] : null;

      return (
        <Chip
          key={bookId}
          label={book.title}
          picker={picker}
          editable={isMine}
          showHandle={isMine}
          onClick={isMine ? () => setEditing({ book, current: value }) : undefined}
        />
      );
    });
  }

  return (
    <Page wide>
      <div className={styles.header}>
        <span className={styles.title}>Book ratings</span>
        <div className={styles.legend}>
          {activeMembers.map((m) => (
            <span key={m.id} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: m.color }}
              />
              {m.name} picked
            </span>
          ))}
        </div>
      </div>
      <p className={styles.note}>
        Chip colour = who picked the book · you can only edit your own column ·
        click any of your chips to change its rating
      </p>

      <ErrorBanner error={actionError} onDismiss={() => setActionError(null)} />

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.scaleCol} />
              {activeMembers.map((m) => (
                <th
                  key={m.id}
                  className={m.id === member.id ? styles.ownCol : undefined}
                >
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
            {scaleRows.map((value) => (
              <tr key={value}>
                <td className={styles.scaleCol}>
                  <span className={styles.scaleLabel}>{value}</span>
                </td>
                {activeMembers.map((m) => (
                  <td
                    key={m.id}
                    className={[
                      styles.cell,
                      m.id === member.id ? styles.ownCol : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cell(m.id, value)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Jail. Counts as 1 when averaging, per the club's own rule. */}
            <tr>
              <td className={styles.scaleCol}>
                <span className={styles.scaleLabelSmall}>−1000</span>
              </td>
              {activeMembers.map((m) => (
                <td
                  key={m.id}
                  className={[styles.cell, m.id === member.id ? styles.ownCol : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {cell(m.id, JAIL_VALUE)}
                </td>
              ))}
            </tr>

            {/* Everything each person has not rated yet. */}
            <tr>
              <td className={styles.scaleCol}>
                <span className={styles.scaleLabelSmall}>unrated</span>
              </td>
              {activeMembers.map((m) => {
                const isMine = m.id === member.id;
                const pending = unratedByMember[m.id] ?? [];
                return (
                  <td
                    key={m.id}
                    className={[styles.cell, isMine ? styles.ownCol : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {pending.length === 0 ? (
                      <span className={styles.cellEmpty}>all rated</span>
                    ) : (
                      pending.map((book) => (
                        <Chip
                          key={book.id}
                          label={book.title}
                          picker={book.picked_by ? memberById[book.picked_by] : null}
                          editable={isMine}
                          onClick={
                            isMine
                              ? () => setEditing({ book, current: null })
                              : undefined
                          }
                        />
                      ))
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <RatingPicker
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Page>
  );
}

function RatingPicker({ editing, onClose, onSave }) {
  const [busy, setBusy] = useState(false);

  if (!editing) return null;

  async function choose(value) {
    setBusy(true);
    try {
      await onSave(editing.book.id, value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing.book.title}
      subtitle="Pick your rating. Half points are allowed."
    >
      <div className={styles.pickerGrid}>
        {ALL_PICKER_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            className={[
              styles.pickerCell,
              editing.current === value ? styles.pickerCellOn : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => choose(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <ModalActions>
        <Button
          variant={editing.current === JAIL_VALUE ? "primary" : "secondary"}
          disabled={busy}
          onClick={() => choose(JAIL_VALUE)}
        >
          Send to jail (−1000)
        </Button>
        {editing.current !== null && (
          <Button variant="danger" disabled={busy} onClick={() => choose(null)}>
            Clear my rating
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
