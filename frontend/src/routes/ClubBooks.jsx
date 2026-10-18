import { useMemo, useState } from "react";
import { useClub, useClubId } from "../lib/hooks/useClub.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import { listClubBooks, addBook, updateBook, deleteBook } from "../lib/api/books.js";
import { listClubRatings, averageRating } from "../lib/api/ratings.js";
import { toAppError } from "../lib/api/errors.js";
import { Page } from "../components/layout/AppShell.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Field, FieldRow } from "../components/ui/Field.jsx";
import { List, ListRow } from "../components/ui/ListRow.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";
import {
  Banner,
  EmptyState,
  ErrorBanner,
  LoadingRow,
} from "../components/ui/Feedback.jsx";
import styles from "./ClubTable.module.css";

const STATUS_LABELS = { to_read: "To read", reading: "Reading", finished: "Finished" };
const STATUS_TONES = { to_read: "info", reading: "warning", finished: "success" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "to_read", label: "To read" },
  { value: "finished", label: "Finished" },
];

export default function ClubBooks() {
  const clubId = useClubId();
  const { activeMembers, memberById, isAdmin } = useClub();

  const books = useAsync(() => listClubBooks(clubId), [clubId]);
  const ratings = useAsync(() => listClubRatings(clubId), [clubId]);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const displayNumbers = useMemo(() => {
    const ascending = [...(books.data ?? [])].sort((a, b) => a.id - b.id);
    return Object.fromEntries(ascending.map((b, i) => [b.id, i + 1]));
  }, [books.data]);

  const averages = useMemo(() => {
    const grouped = new Map();
    for (const row of ratings.data ?? []) {
      if (!grouped.has(row.book_id)) grouped.set(row.book_id, []);
      grouped.get(row.book_id).push(row);
    }
    const out = {};
    for (const [bookId, rows] of grouped) out[bookId] = averageRating(rows);
    return out;
  }, [ratings.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(books.data ?? [])]
      .filter((b) => filter === "all" || b.status === filter)
      .filter(
        (b) =>
          !term ||
          b.title.toLowerCase().includes(term) ||
          (b.author ?? "").toLowerCase().includes(term)
      )
      .sort((a, b) => b.id - a.id);
  }, [books.data, filter, search]);

  async function save(fields) {
    setActionError(null);
    try {
      if (editing?.id) {
        await updateBook(editing.id, fields);
        setNotice(`"${fields.title}" updated.`);
      } else {
        await addBook(clubId, fields);
        setNotice(`"${fields.title}" added to the shelf.`);
      }
      setEditing(null);
      books.reload();
    } catch (err) {
      setActionError(toAppError(err));
      throw err;
    }
  }

  async function remove(book) {
    setActionError(null);
    try {
      await deleteBook(book.id);
      setConfirmDelete(null);
      setNotice(`"${book.title}" removed.`);
      books.reload();
      ratings.reload();
    } catch (err) {
      setActionError(toAppError(err));
    }
  }

  if (books.loading) {
    return (
      <Page>
        <LoadingRow label="Loading the shelf…" />
      </Page>
    );
  }

  return (
    <Page>
      <div className={styles.header}>
        <span className={styles.title}>Books</span>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Search title or author…"
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
          <Button variant="primary" onClick={() => setEditing({})}>
            + Add book
          </Button>
        </div>
      </div>

      <Tabs tabs={FILTERS} value={filter} onChange={setFilter} />

      <ErrorBanner
        error={actionError || books.error}
        onDismiss={() => setActionError(null)}
        onRetry={books.error ? books.reload : undefined}
      />
      {notice && (
        <Banner tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="📚" title="Nothing here">
            {search || filter !== "all"
              ? "No books match that."
              : "Add the club's first book."}
          </EmptyState>
        </Card>
      ) : (
        <List>
          {rows.map((book) => {
            const picker = book.picked_by ? memberById[book.picked_by] : null;
            const average = averages[book.id];

            return (
              <ListRow
                key={book.id}
                name={
                  <>
                    <span style={{ color: "var(--text-muted)" }}>
                      #{displayNumbers[book.id]}
                    </span>
                    {book.title}
                    {picker && (
                      <Badge member={picker} dot>
                        {picker.name}
                      </Badge>
                    )}
                  </>
                }
                meta={
                  <>
                    {book.author || "Author unknown"}
                    {book.year ? ` · ${book.year}` : ""}
                    {average != null && ` · avg ${average.toFixed(1)}`}
                  </>
                }
                actions={
                  <>
                    <Badge tone={STATUS_TONES[book.status] ?? "neutral"}>
                      {STATUS_LABELS[book.status] ?? book.status}
                    </Badge>
                    <Button size="sm" onClick={() => setEditing(book)}>
                      Edit
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(book)}
                      >
                        Delete
                      </Button>
                    )}
                  </>
                }
              />
            );
          })}
        </List>
      )}

      <BookEditor
        editing={editing}
        members={activeMembers}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.title}"?`}
        subtitle="This cannot be undone."
      >
        <Banner tone="warning">
          Deleting a book also deletes <strong>everyone's</strong> ratings and
          reviews of it — not just yours. There is no way to get them back.
        </Banner>
        <ModalActions>
          <Button variant="danger" onClick={() => remove(confirmDelete)}>
            Yes, delete it and all its reviews
          </Button>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
        </ModalActions>
      </Modal>
    </Page>
  );
}

function BookEditor({ editing, members, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("to_read");
  const [pickedBy, setPickedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadedId, setLoadedId] = useState(undefined);

  const key = editing ? (editing.id ?? "new") : null;

  if (editing && loadedId !== key) {
    setLoadedId(key);
    setTitle(editing.title ?? "");
    setAuthor(editing.author ?? "");
    setYear(editing.year ? String(editing.year) : String(new Date().getFullYear()));
    setStatus(editing.status ?? "to_read");
    setPickedBy(editing.picked_by ?? "");
  }

  if (!editing) return null;

  async function submit() {
    setBusy(true);
    try {
      await onSave({
        title,
        author,
        year: year ? Number(year) : null,
        status,
        pickedBy: pickedBy || null,
      });
    } catch {
      /* shown by the page's banner */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing.id ? "Edit book" : "Add a book"}
      subtitle={
        editing.id ? undefined : "It will be added to this club's shelf."
      }
    >
      <Field
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={300}
        required
      />
      <Field
        label="Author"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Optional"
      />
      <FieldRow>
        <Field
          label="Year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          min="1400"
          max="2200"
        />
        <Field label="Status">
          {(props) => (
            <select {...props} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="to_read">To read</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
            </select>
          )}
        </Field>
      </FieldRow>
      <Field label="Picked by" help="Chip colours across the club follow the picker.">
        {(props) => (
          <select
            {...props}
            value={pickedBy}
            onChange={(e) => setPickedBy(e.target.value)}
          >
            <option value="">Nobody in particular</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <ModalActions>
        <Button variant="primary" busy={busy} busyLabel="Saving…" onClick={submit}>
          {editing.id ? "Save changes" : "Add book"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
