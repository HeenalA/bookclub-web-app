import { useMemo, useState } from "react";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { useClubId } from "../lib/hooks/useClub.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import { listClubBooks } from "../lib/api/books.js";
import {
  listClubMeetings,
  nextMeeting,
  pastMeetings,
  addMeeting,
  updateMeeting,
  deleteMeeting,
  setMeetingBooks,
} from "../lib/api/meetings.js";
import { toAppError } from "../lib/api/errors.js";
import { formatFullDate, todayISO } from "../lib/util/date.js";
import { Page } from "../components/layout/AppShell.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card, SectionLabel } from "../components/ui/Card.jsx";
import { Field, FieldRow } from "../components/ui/Field.jsx";
import { List, ListRow } from "../components/ui/ListRow.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import {
  Banner,
  EmptyState,
  ErrorBanner,
  LoadingRow,
} from "../components/ui/Feedback.jsx";
import tableStyles from "./ClubTable.module.css";
import styles from "./ClubMeetings.module.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ClubMeetings() {
  const clubId = useClubId();
  const { member } = useAuth();

  const meetings = useAsync(() => listClubMeetings(clubId), [clubId]);
  const books = useAsync(() => listClubBooks(clubId), [clubId]);

  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const upcoming = useMemo(
    () => (meetings.data ? nextMeeting(meetings.data) : null),
    [meetings.data]
  );
  const past = useMemo(
    () => (meetings.data ? pastMeetings(meetings.data) : []),
    [meetings.data]
  );

  async function save(fields) {
    setActionError(null);
    try {
      if (editing?.id) {
        await updateMeeting(editing.id, fields);
        await setMeetingBooks(editing.id, fields.bookIds);
        setNotice("Meeting updated.");
      } else {
        const created = await addMeeting(clubId, member.id, fields);
        await setMeetingBooks(created.id, fields.bookIds);
        setNotice("Meeting added.");
      }
      setEditing(null);
      meetings.reload();
    } catch (err) {
      setActionError(toAppError(err));
      throw err;
    }
  }

  async function remove(meeting) {
    setActionError(null);
    try {
      await deleteMeeting(meeting.id);
      setConfirmDelete(null);
      setNotice("Meeting deleted. The rest renumbered automatically.");
      meetings.reload();
    } catch (err) {
      setActionError(toAppError(err));
    }
  }

  if (meetings.loading) {
    return (
      <Page>
        <LoadingRow label="Loading meetings…" />
      </Page>
    );
  }

  const date = upcoming ? new Date(`${upcoming.meeting_date}T00:00:00`) : null;

  return (
    <Page>
      <div className={tableStyles.header}>
        <span className={tableStyles.title}>Meetings</span>
        <Button variant="primary" onClick={() => setEditing({})}>
          + Add meeting
        </Button>
      </div>
      <p className={tableStyles.note}>
        Meeting numbers come from date order — deleting one renumbers the rest
        automatically
      </p>

      <ErrorBanner
        error={actionError || meetings.error}
        onDismiss={() => setActionError(null)}
        onRetry={meetings.error ? meetings.reload : undefined}
      />
      {notice && (
        <Banner tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {/* ---- Next meeting ---- */}
      {upcoming ? (
        <div className={styles.nextCard}>
          <div className={styles.dateBlock}>
            <p className={styles.month}>{MONTHS[date.getMonth()]}</p>
            <p className={styles.day}>{date.getDate()}</p>
          </div>
          <div className={styles.info}>
            <p className={styles.num}>#{upcoming.number}</p>
            <h3 className={styles.discussing}>
              {upcoming.books?.length
                ? `Discussing: ${upcoming.books.map((b) => b.title).join(" and ")}`
                : "No book chosen yet"}
            </h3>
            <p className={styles.where}>
              {[upcoming.meeting_time, upcoming.location]
                .filter(Boolean)
                .join(" · ") || "Time and place to be decided"}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              alignItems: "flex-end",
            }}
          >
            <span className={styles.flag}>Drives the home countdown</span>
            <Button size="sm" onClick={() => setEditing(upcoming)}>
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState icon="📅" title="Nothing scheduled">
            Add the next meeting and the home page will count down to it.
          </EmptyState>
        </Card>
      )}

      {/* ---- Past meetings ---- */}
      <SectionLabel>Past meetings</SectionLabel>
      {past.length === 0 ? (
        <Card>
          <EmptyState icon="🕰️" title="No past meetings yet" />
        </Card>
      ) : (
        <List>
          {past.map((meeting) => (
            <ListRow
              key={meeting.id}
              lead={<span className={styles.pastNum}>#{meeting.number}</span>}
              name={
                meeting.books?.length
                  ? meeting.books.map((b) => b.title).join(" · ")
                  : "No book recorded"
              }
              meta={
                [
                  formatFullDate(meeting.meeting_date),
                  meeting.meeting_time,
                  meeting.location,
                ]
                  .filter(Boolean)
                  .join(" · ")
              }
              actions={
                <>
                  <Button size="sm" onClick={() => setEditing(meeting)}>
                    Edit
                  </Button>
                  {/* Any active member can edit or delete a meeting, which
                      matches the meetings_delete_club policy exactly. Gating
                      this to admins in the UI only would have been theatre:
                      the database would still allow it, so the restriction
                      would stop an honest member and nobody else. Deleting a
                      meeting is also not destructive — unlike a book, it
                      cascades to nothing. */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(meeting)}
                  >
                    Delete
                  </Button>
                </>
              }
            />
          ))}
        </List>
      )}

      <MeetingEditor
        editing={editing}
        books={books.data ?? []}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Delete meeting #${confirmDelete?.number}?`}
        subtitle="Later meetings will shift down by one number."
      >
        <ModalActions>
          <Button variant="danger" onClick={() => remove(confirmDelete)}>
            Delete meeting
          </Button>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
        </ModalActions>
      </Modal>
    </Page>
  );
}

function MeetingEditor({ editing, books, onClose, onSave }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [bookIds, setBookIds] = useState([""]);
  const [busy, setBusy] = useState(false);
  const [loadedId, setLoadedId] = useState(undefined);

  const key = editing ? (editing.id ?? "new") : null;

  if (editing && loadedId !== key) {
    setLoadedId(key);
    setDate(editing.meeting_date ?? todayISO());
    setTime(editing.meeting_time ?? "");
    setLocation(editing.location ?? "");
    setBookIds(
      editing.books?.length ? editing.books.map((b) => String(b.id)) : [""]
    );
  }

  if (!editing) return null;

  async function submit() {
    setBusy(true);
    try {
      const chosen = bookIds.filter(Boolean).map(Number);
      await onSave({
        date,
        time,
        location,
        // Kept for the meetings row itself; the join table is the real record
        // and its trigger keeps this in step.
        bookId: chosen[0] ?? null,
        bookIds: chosen,
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
      title={editing.id ? `Edit meeting #${editing.number ?? ""}` : "Add a meeting"}
      subtitle="The soonest upcoming meeting becomes the home page countdown."
    >
      <FieldRow>
        <Field
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Field
          label="Time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="6:00 PM PST"
          maxLength={40}
          help="Free text."
        />
      </FieldRow>
      <Field
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="e.g. Maya's place, or Zoom"
        maxLength={120}
      />
      {/* A meeting often covers two books, so this is a list rather than one
          picker. The first is the meeting's main book. */}
      <Field
        label={bookIds.length > 1 ? "Books being discussed" : "Book being discussed"}
        help="The first is the main book. Add another if you discussed two."
      >
        {(props) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {bookIds.map((id, i) => (
              <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
                <select
                  {...(i === 0 ? props : {})}
                  className={props.className}
                  value={id}
                  aria-label={`Book ${i + 1}`}
                  onChange={(e) => {
                    const next = [...bookIds];
                    next[i] = e.target.value;
                    setBookIds(next);
                  }}
                >
                  <option value="">Not decided</option>
                  {[...books]
                    .sort((a, b) => b.id - a.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                </select>
                {bookIds.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBookIds(bookIds.filter((_, j) => j !== i))}
                    aria-label={`Remove book ${i + 1}`}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <div>
              <Button size="sm" onClick={() => setBookIds([...bookIds, ""])}>
                + Add another book
              </Button>
            </div>
          </div>
        )}
      </Field>

      <ModalActions>
        <Button variant="primary" busy={busy} busyLabel="Saving…" onClick={submit}>
          {editing.id ? "Save changes" : "Add meeting"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
