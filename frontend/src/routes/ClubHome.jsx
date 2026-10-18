import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { useClub, useClubId } from "../lib/hooks/useClub.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import { listClubBooks } from "../lib/api/books.js";
import { listClubMeetings, nextMeeting } from "../lib/api/meetings.js";
import {
  listClubAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  ANNOUNCEMENT_MAX_LENGTH,
} from "../lib/api/announcements.js";
import { toAppError } from "../lib/api/errors.js";
import { formatMonthYear, relativeTime } from "../lib/util/date.js";
import { memberColorVars } from "../lib/util/color.js";
import { AvatarGroup, Avatar } from "../components/ui/Avatar.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card, SectionLabel } from "../components/ui/Card.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { ErrorBanner, LoadingRow, EmptyState } from "../components/ui/Feedback.jsx";
import { Countdown } from "../components/club/Countdown.jsx";
import styles from "./ClubHome.module.css";

export default function ClubHome() {
  const clubId = useClubId();
  const { club, activeMembers, memberById } = useClub();

  const books = useAsync(() => listClubBooks(clubId), [clubId]);
  const meetings = useAsync(() => listClubMeetings(clubId), [clubId]);
  const announcements = useAsync(() => listClubAnnouncements(clubId), [clubId]);

  const upcoming = useMemo(
    () => (meetings.data ? nextMeeting(meetings.data) : null),
    [meetings.data]
  );

  const reading = useMemo(
    () => (books.data ?? []).filter((b) => b.status === "reading"),
    [books.data]
  );

  /**
   * Picker order, derived rather than stored.
   *
   * Whoever picked longest ago is up next. Someone who has never picked goes
   * first. Deriving this means there is no "picker order" setting to maintain
   * and no way for it to fall out of step with who actually picked what.
   */
  const pickerOrder = useMemo(() => {
    const lastPick = new Map();
    for (const book of books.data ?? []) {
      if (!book.picked_by) continue;
      const current = lastPick.get(book.picked_by) ?? -1;
      if (book.id > current) lastPick.set(book.picked_by, book.id);
    }

    return [...activeMembers].sort(
      (a, b) => (lastPick.get(a.id) ?? -1) - (lastPick.get(b.id) ?? -1)
    );
  }, [books.data, activeMembers]);

  const bookCount = books.data?.length ?? 0;
  const meetingCount = meetings.data?.length ?? 0;

  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div>
            <h1 className={styles.title}>{club.name}</h1>
            <p className={styles.sub}>
              {club.founded_date && `Founded ${formatMonthYear(club.founded_date)} · `}
              {bookCount} book{bookCount === 1 ? "" : "s"} · {meetingCount} meeting
              {meetingCount === 1 ? "" : "s"}
            </p>
            <div className={styles.avatars}>
              <AvatarGroup members={activeMembers} size="lg" ringed />
            </div>
          </div>
          <Countdown meeting={upcoming} />
        </div>
      </div>

      <div className={styles.body}>
        <div>
          {/* ---- Currently reading ---- */}
          <section className={styles.section}>
            <SectionLabel>Currently reading</SectionLabel>
            {books.loading ? (
              <LoadingRow />
            ) : books.error ? (
              <ErrorBanner error={books.error} onRetry={books.reload} />
            ) : reading.length === 0 ? (
              <Card>
                <EmptyState icon="📖" title="Nothing on the go">
                  Mark a book as "Reading" on the{" "}
                  <Link to={`/club/${clubId}/books`}>Books</Link> page and it
                  will show up here.
                </EmptyState>
              </Card>
            ) : (
              reading.map((book) => {
                const picker = book.picked_by ? memberById[book.picked_by] : null;
                return (
                  <Card
                    key={book.id}
                    className={styles.readingCard}
                    style={memberColorVars(picker?.color)}
                  >
                    <div className={styles.spine}>
                      <span className={styles.spineText}>{book.title}</span>
                    </div>
                    <div>
                      <h3 className={styles.readingTitle}>{book.title}</h3>
                      {book.author && (
                        <p
                          style={{
                            fontSize: "var(--text-caption)",
                            color: "var(--text-secondary)",
                            marginTop: "var(--space-1)",
                          }}
                        >
                          {book.author}
                        </p>
                      )}
                      {picker && (
                        <div style={{ marginTop: "var(--space-2)" }}>
                          <Badge member={picker} dot>
                            Picked by {picker.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </section>

          {/* ---- Announcements ---- */}
          <AnnouncementsSection clubId={clubId} state={announcements} />

          {/* ---- Picker order ---- */}
          <section className={styles.section}>
            <SectionLabel>Picker order</SectionLabel>
            <Card>
              {pickerOrder.length === 0 ? (
                <p style={{ fontSize: "var(--text-small)", color: "var(--text-muted)" }}>
                  No active members yet.
                </p>
              ) : (
                pickerOrder.map((member, index) => (
                  <div key={member.id} className={styles.pickerRow}>
                    <span className={styles.pickerNum}>{index + 1}</span>
                    <Avatar member={member} size="sm" />
                    <span className={styles.pickerName}>{member.name}</span>
                    {index === 0 && <Badge tone="accent">Next</Badge>}
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>

        {/* ---- Shelf placeholder ---- */}
        <div>
          <SectionLabel>Group shelf</SectionLabel>
          <div className={styles.shelf}>
            <div className={styles.shelfIcon} aria-hidden="true">
              📚
            </div>
            <p className={styles.shelfTitle}>Bookshelf coming soon</p>
            <p className={styles.shelfSub}>
              Top rated books · jail section · member icons
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function AnnouncementsSection({ clubId, state }) {
  const { member } = useAuth();
  const { isAdmin, memberById } = useClub();

  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function post() {
    setError(null);
    setBusy(true);
    try {
      await addAnnouncement(clubId, member.id, text);
      setText("");
      setComposing(false);
      state.reload();
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setError(null);
    try {
      await deleteAnnouncement(id);
      state.reload();
    } catch (err) {
      setError(toAppError(err));
    }
  }

  const rows = state.data ?? [];

  return (
    <section className={styles.section}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SectionLabel>Announcements</SectionLabel>
        <Button size="sm" onClick={() => setComposing(true)}>
          + Post
        </Button>
      </div>

      <ErrorBanner error={error || state.error} onDismiss={() => setError(null)} />

      {state.loading ? (
        <LoadingRow />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon="📣" title="No announcements">
            Post a note for the club — a date change, a nudge to rate a book.
          </EmptyState>
        </Card>
      ) : (
        rows.map((row) => {
          const author = memberById[row.member_id];
          const canDelete = row.member_id === member.id || isAdmin;
          return (
            <div
              key={row.id}
              className={styles.announce}
              style={memberColorVars(author?.color)}
            >
              <p className={styles.announceText}>{row.text}</p>
              <p className={styles.announceMeta}>
                {author?.name ?? "Someone"} · {relativeTime(row.created_at)}
                {canDelete && (
                  <span className={styles.announceDelete}>
                    <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>
                      Delete
                    </Button>
                  </span>
                )}
              </p>
            </div>
          );
        })
      )}

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="Post an announcement"
        subtitle="Everyone in the club will see this."
      >
        <Field
          as="textarea"
          label="Announcement"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={ANNOUNCEMENT_MAX_LENGTH}
          placeholder="e.g. Meeting moved to the 12th — same time."
        />
        <ModalActions>
          <Button variant="primary" busy={busy} busyLabel="Posting…" onClick={post}>
            Post
          </Button>
          <Button onClick={() => setComposing(false)}>Cancel</Button>
        </ModalActions>
      </Modal>
    </section>
  );
}
