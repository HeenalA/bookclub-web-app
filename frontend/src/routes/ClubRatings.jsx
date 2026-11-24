import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
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
import { DraggableChip, DropCell } from "../components/club/RatingDnd.jsx";
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
  const [draggingBook, setDraggingBook] = useState(null);

  /* An 8px threshold before a press counts as a drag. Without it every click
     on a chip starts a drag and the rating picker never opens. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  /**
   * Write a rating, updating the screen first and rolling back if the write
   * fails.
   *
   * LEARNING: for a drag this is not a nicety. Reloading the whole table
   * after each drop means the chip snaps back to where it was for as long as
   * the round trip takes, then jumps to its new row — which reads as the drag
   * having failed. Applying the change locally and reverting only on a real
   * error keeps the chip where it was dropped.
   */
  async function save(bookId, value) {
    setActionError(null);
    const previous = ratings.data;

    ratings.setData((previous ?? []).filter(
      (r) => !(r.member_id === member.id && r.book_id === bookId)
    ).concat(
      value === null ? [] : [{ member_id: member.id, book_id: bookId, value }]
    ));
    setEditing(null);

    try {
      if (value === null) await clearMyRating(member.id, bookId);
      else await setMyRating(member.id, bookId, value);
    } catch (err) {
      ratings.setData(previous);
      setActionError(toAppError(err));
    }
  }

  function handleDragEnd(event) {
    setDraggingBook(null);
    const { active, over } = event;
    if (!over) return;

    const bookId = active.data.current?.bookId;
    const target = over.data.current?.value;   // number, JAIL_VALUE, or null
    if (bookId == null || target === undefined) return;

    const current = index.byMemberBook.get(`${member.id}:${bookId}`);
    // Dropping a chip back where it started is not an edit.
    if (current === target || (current === undefined && target === null)) return;

    save(bookId, target);
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
        <DraggableChip
          key={bookId}
          bookId={bookId}
          label={book.title}
          picker={picker}
          disabled={!isMine}
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
        drag a chip to another row to change its rating, or click it to pick
        one
      </p>

      <ErrorBanner error={actionError} onDismiss={() => setActionError(null)} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setDraggingBook(bookById[e.active.data.current?.bookId])}
        onDragCancel={() => setDraggingBook(null)}
        onDragEnd={handleDragEnd}
      >
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
                  <DropCell
                    key={m.id}
                    id={`${m.id}:${value}`}
                    value={value}
                    disabled={m.id !== member.id}
                    className={[
                      styles.cell,
                      m.id === member.id ? styles.ownCol : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cell(m.id, value)}
                  </DropCell>
                ))}
              </tr>
            ))}

            {/* Jail. Counts as 1 when averaging, per the club's own rule. */}
            <tr>
              <td className={styles.scaleCol}>
                <span className={styles.scaleLabelSmall}>−1000</span>
              </td>
              {activeMembers.map((m) => (
                <DropCell
                  key={m.id}
                  id={`${m.id}:jail`}
                  value={JAIL_VALUE}
                  disabled={m.id !== member.id}
                  className={[styles.cell, m.id === member.id ? styles.ownCol : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {cell(m.id, JAIL_VALUE)}
                </DropCell>
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
                  /* Dropping here clears the rating, which is the only way to
                     un-rate a book by dragging. */
                  <DropCell
                    key={m.id}
                    id={`${m.id}:unrated`}
                    value={null}
                    disabled={!isMine}
                    className={[styles.cell, isMine ? styles.ownCol : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {pending.length === 0 ? (
                      <span className={styles.cellEmpty}>all rated</span>
                    ) : (
                      pending.map((book) => (
                        <DraggableChip
                          key={book.id}
                          bookId={book.id}
                          label={book.title}
                          picker={book.picked_by ? memberById[book.picked_by] : null}
                          disabled={!isMine}
                          onClick={
                            isMine
                              ? () => setEditing({ book, current: null })
                              : undefined
                          }
                        />
                      ))
                    )}
                  </DropCell>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* A copy of the chip follows the cursor. Dragging the original would
          make the row it came from reflow under the pointer. */}
      <DragOverlay dropAnimation={null}>
        {draggingBook ? (
          <Chip
            label={draggingBook.title}
            picker={
              draggingBook.picked_by ? memberById[draggingBook.picked_by] : null
            }
            showHandle
          />
        ) : null}
      </DragOverlay>
      </DndContext>

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
