import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import {
  listMyMemberships,
  discoverClubs,
  createClub,
  requestToJoin,
  joinWithCode,
  rejoinClub,
  listPendingApprovals,
  approveMember,
  denyMember,
} from "../lib/api/clubs.js";
import { listMyBooks } from "../lib/api/books.js";
import { listMyRatings, JAIL_VALUE } from "../lib/api/ratings.js";
import { listMyReviews } from "../lib/api/reviews.js";
import { updateMyProfile } from "../lib/api/members.js";
import { toAppError } from "../lib/api/errors.js";
import { formatMonthYear, formatFullDate, relativeTime } from "../lib/util/date.js";
import { AppShell, Page } from "../components/layout/AppShell.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Badge, StatusBadge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card, SectionLabel, Hint } from "../components/ui/Card.jsx";
import { Field, ColorField } from "../components/ui/Field.jsx";
import { List, ListRow } from "../components/ui/ListRow.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";
import {
  Banner,
  EmptyState,
  ErrorBanner,
  LoadingRow,
} from "../components/ui/Feedback.jsx";
import styles from "./UserHome.module.css";

const PAGE_SIZE = 5;

const TABS = [
  { value: "clubs", label: "Clubs" },
  { value: "books", label: "Books" },
  { value: "ratings", label: "Ratings" },
  { value: "reviews", label: "Reviews" },
];

/** Where you land after signing in. */
export default function UserHome() {
  const { member } = useAuth();
  const [tab, setTab] = useState("clubs");
  const [editingProfile, setEditingProfile] = useState(false);

  return (
    <AppShell>
      <Page>
        <div className={styles.userCard}>
          <Avatar member={member} size="xl" />
          <div className={styles.userGrow}>
            <p className={styles.userName}>{member?.name}</p>
            <p className={styles.userEmail}>{member?.email}</p>
          </div>
          <Button size="sm" onClick={() => setEditingProfile(true)}>
            Edit profile
          </Button>
        </div>

        <Tabs tabs={TABS} value={tab} onChange={setTab} />

        {tab === "clubs" && <ClubsTab />}
        {tab === "books" && <MyBooksTab />}
        {tab === "ratings" && <MyRatingsTab />}
        {tab === "reviews" && <MyReviewsTab />}

        <ProfileModal
          open={editingProfile}
          onClose={() => setEditingProfile(false)}
        />
      </Page>
    </AppShell>
  );
}

/* ========================================================================== */
/* Profile                                                                     */
/* ========================================================================== */

const MIN_PASSWORD_LENGTH = 10;

function ProfileModal({ open, onClose }) {
  const { member, refreshMember, updatePassword } = useAuth();
  const [name, setName] = useState(member?.name ?? "");
  const [initials, setInitials] = useState(member?.initials ?? "");
  const [color, setColor] = useState(member?.color ?? "#9E7BC9");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);

  async function onSave() {
    setError(null);
    setBusy(true);
    try {
      await updateMyProfile(member.id, { name, initials, color });
      await refreshMember();
      onClose();
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  /* Changing your own password in the app matters more than it looks: it is
     what lets an admin set someone up with a temporary password in the
     Supabase dashboard and have them change it themselves. That keeps the
     whole invite flow off email, which on the free tier is rate-limited to a
     handful of messages an hour and is explicitly not meant for production. */
  async function onChangePassword() {
    setError(null);
    setPasswordNotice(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        toAppError({
          message: `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you will remember beats a short scramble you will not.`,
        })
      );
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setPasswordNotice("Your password has been changed.");
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit your profile"
      subtitle="Your colour is used for your avatar and your chips across every club."
    >
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <Field
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
      />
      <Field
        label="Initials"
        value={initials}
        onChange={(e) => setInitials(e.target.value)}
        maxLength={3}
        help="Shown in your avatar circle."
      />
      <ColorField label="Your colour" value={color} onChange={setColor} />
      <Hint>
        Your email cannot be changed here — it identifies your account. Ask an
        admin if it needs to change.
      </Hint>

      <ModalActions>
        <Button variant="primary" busy={busy} busyLabel="Saving…" onClick={onSave}>
          Save changes
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "var(--space-6) 0 var(--space-5)",
        }}
      />

      <SectionLabel>Change your password</SectionLabel>
      {passwordNotice && <Banner tone="success">{passwordNotice}</Banner>}
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        help={`At least ${MIN_PASSWORD_LENGTH} characters. Leave blank to keep your current one.`}
      />
      <Button
        busy={busy}
        busyLabel="Changing…"
        disabled={!password}
        onClick={onChangePassword}
      >
        Change password
      </Button>
    </Modal>
  );
}

/* ========================================================================== */
/* Clubs tab                                                                   */
/* ========================================================================== */

function ClubsTab() {
  const { member } = useAuth();
  const memberships = useAsync(() => listMyMemberships(), []);
  const approvals = useAsync(() => listPendingApprovals(), []);

  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const grouped = useMemo(() => {
    const rows = memberships.data ?? [];
    return {
      active: rows.filter((r) => r.status === "active" && r.clubs),
      pending: rows.filter((r) => r.status === "pending" && r.clubs),
      inactive: rows.filter((r) => r.status === "inactive" && r.clubs),
    };
  }, [memberships.data]);

  /* Only requests for clubs where I am an admin are actionable. The query
     returns requests for every club I am in; this is the filter that decides
     what to show. */
  const myAdminClubIds = useMemo(
    () =>
      new Set(
        (memberships.data ?? [])
          .filter((r) => r.role === "admin" && r.status === "active")
          .map((r) => r.club_id)
      ),
    [memberships.data]
  );

  const actionable = useMemo(
    () =>
      (approvals.data ?? []).filter(
        (r) => myAdminClubIds.has(r.club_id) && r.member_id !== member?.id
      ),
    [approvals.data, myAdminClubIds, member?.id]
  );

  async function run(fn, successMessage) {
    setActionError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(successMessage);
      memberships.reload();
      approvals.reload();
    } catch (err) {
      setActionError(toAppError(err));
    }
  }

  if (memberships.loading) return <LoadingRow label="Loading your clubs…" />;

  return (
    <>
      <ErrorBanner
        error={memberships.error || actionError}
        onRetry={memberships.error ? memberships.reload : undefined}
        onDismiss={() => setActionError(null)}
      />
      {notice && (
        <Banner tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {/* ---- Your clubs ---- */}
      <section className={styles.section}>
        <SectionLabel>Your book clubs</SectionLabel>
        {grouped.active.length === 0 ? (
          <Card>
            <EmptyState icon="📖" title="No clubs yet">
              Create one below, or join an existing club.
            </EmptyState>
          </Card>
        ) : (
          <List>
            {grouped.active.map((row) => (
              <ListRow
                key={row.club_id}
                name={
                  <>
                    {row.clubs.name}
                    <Badge tone={row.clubs.visibility === "public" ? "info" : "neutral"}>
                      {row.clubs.visibility === "public" ? "Public" : "Private"}
                    </Badge>
                    {row.role === "admin" && <Badge tone="admin">Admin</Badge>}
                  </>
                }
                meta={
                  row.clubs.founded_date
                    ? `Founded ${formatMonthYear(row.clubs.founded_date)}`
                    : null
                }
                actions={
                  <Link to={`/club/${row.club_id}`}>
                    <Button size="sm" variant="primary">
                      Enter club →
                    </Button>
                  </Link>
                }
              />
            ))}
          </List>
        )}
      </section>

      {/* ---- Awaiting approval ---- */}
      {grouped.pending.length > 0 && (
        <section className={styles.section}>
          <SectionLabel>Waiting on approval</SectionLabel>
          <List>
            {grouped.pending.map((row) => (
              <ListRow
                key={row.club_id}
                name={row.clubs.name}
                meta={`Requested ${relativeTime(row.requested_at)}`}
                actions={<StatusBadge status="pending" />}
              />
            ))}
          </List>
        </section>
      )}

      {/* ---- Clubs you have left ---- */}
      {grouped.inactive.length > 0 && (
        <section className={styles.section}>
          <SectionLabel>Was your bookclub</SectionLabel>
          <Hint>Your ratings and reviews are kept. Rejoining restores them.</Hint>
          <List>
            {grouped.inactive.map((row) => (
              <ListRow
                key={row.club_id}
                name={row.clubs.name}
                meta={
                  row.left_at
                    ? `Left ${formatFullDate(row.left_at.slice(0, 10))}`
                    : "No longer a member"
                }
                actions={
                  row.clubs.visibility === "public" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        run(
                          () => rejoinClub(row.club_id),
                          "Rejoin requested — an admin will approve it."
                        )
                      }
                    >
                      Rejoin
                    </Button>
                  ) : (
                    <Badge tone="neutral">Needs a join code</Badge>
                  )
                }
              />
            ))}
          </List>
        </section>
      )}

      {/* ---- Pending requests to approve ---- */}
      {actionable.length > 0 && (
        <section className={styles.section}>
          <SectionLabel>Requests to approve</SectionLabel>
          <Hint>You are an admin of these clubs.</Hint>
          <List>
            {actionable.map((row) => (
              <ListRow
                key={`${row.club_id}-${row.member_id}`}
                lead={<Avatar member={row.members} size="lg" />}
                name={row.members?.name}
                meta={`${row.members?.email ?? ""} · wants to join "${
                  row.clubs?.name
                }" · ${relativeTime(row.requested_at)}`}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        run(
                          () => approveMember(row.club_id, row.member_id),
                          `${row.members?.name} is now a member.`
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        run(
                          () => denyMember(row.club_id, row.member_id),
                          "Request denied."
                        )
                      }
                    >
                      Deny
                    </Button>
                  </>
                }
              />
            ))}
          </List>
        </section>
      )}

      {/* ---- Discovery ---- */}
      <DiscoverSection
        onJoined={(message) => {
          setNotice(message);
          memberships.reload();
        }}
        onCreate={() => setCreating(true)}
      />

      <CreateClubModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(message) => {
          setCreating(false);
          setNotice(message);
          memberships.reload();
        }}
      />
    </>
  );
}

function DiscoverSection({ onJoined, onCreate }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [codes, setCodes] = useState({});
  const [error, setError] = useState(null);

  /* One extra row is requested so we can tell whether a next page exists
     without a second COUNT query. */
  const results = useAsync(
    () =>
      discoverClubs({
        search: query,
        limit: PAGE_SIZE + 1,
        offset: page * PAGE_SIZE,
      }),
    [query, page]
  );

  const rows = results.data ?? [];
  const visible = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  async function join(row) {
    setError(null);
    try {
      if (row.visibility === "private") {
        const code = (codes[row.club_id] ?? "").trim();
        if (!code) {
          setError(toAppError({ message: "Enter the club's join code first." }));
          return;
        }
        await joinWithCode(row.club_id, code);
        onJoined(`You have joined "${row.name}".`);
      } else {
        await requestToJoin(row.club_id);
        onJoined(`Request sent to "${row.name}". An admin will approve it.`);
      }
      results.reload();
    } catch (err) {
      setError(toAppError(err));
    }
  }

  return (
    <section className={styles.section}>
      <SectionLabel>Could be your bookclub</SectionLabel>

      <div className={styles.searchRow}>
        <input
          type="search"
          placeholder="Search book clubs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setQuery(search);
              setPage(0);
            }
          }}
          aria-label="Search book clubs"
        />
        <Button
          onClick={() => {
            setQuery(search);
            setPage(0);
          }}
        >
          Search
        </Button>
        <Button variant="primary" onClick={onCreate}>
          + Create book club
        </Button>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {results.loading ? (
        <LoadingRow label="Looking for clubs…" />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon="🔍" title="No clubs to show">
            {query
              ? `Nothing matches "${query}".`
              : "There are no other clubs to join yet. Create one instead."}
          </EmptyState>
        </Card>
      ) : (
        <List>
          {visible.map((row) => (
            <ListRow
              key={row.club_id}
              name={
                <>
                  {row.name}
                  <Badge tone={row.visibility === "public" ? "info" : "neutral"}>
                    {row.visibility === "public" ? "Public" : "Private"}
                  </Badge>
                </>
              }
              meta={
                <>
                  {row.member_count} active member
                  {Number(row.member_count) === 1 ? "" : "s"}
                  {row.visibility === "private" && " · join code required"}
                  {row.my_status === "pending" && " · you have a request pending"}
                  {row.my_status === "inactive" && " · you were a member before"}
                </>
              }
              actions={
                row.my_status === "pending" ? (
                  <StatusBadge status="pending" />
                ) : row.visibility === "private" ? (
                  <span className={styles.codeRow}>
                    <input
                      placeholder="Code"
                      value={codes[row.club_id] ?? ""}
                      onChange={(e) =>
                        setCodes((prev) => ({
                          ...prev,
                          [row.club_id]: e.target.value,
                        }))
                      }
                      aria-label={`Join code for ${row.name}`}
                    />
                    <Button size="sm" variant="primary" onClick={() => join(row)}>
                      Join
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" onClick={() => join(row)}>
                    Request to join
                  </Button>
                )
              }
            />
          ))}

          {(page > 0 || hasNext) && (
            <div className={styles.pagination}>
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ‹ Prev
              </Button>
              <span>Page {page + 1}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </Button>
            </div>
          )}
        </List>
      )}
    </section>
  );
}

function CreateClubModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await createClub({ name, visibility });
      setName("");
      onCreated(`"${name.trim()}" created. You are its admin.`);
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a book club"
      subtitle="You will be its admin."
    >
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <Field
        label="Club name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Sci-Fi Sunday"
        maxLength={60}
        help="Must be unique among active clubs."
      />

      <Field label="Visibility">
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            variant={visibility === "public" ? "primary" : "secondary"}
            onClick={() => setVisibility("public")}
            block
          >
            Public
          </Button>
          <Button
            variant={visibility === "private" ? "primary" : "secondary"}
            onClick={() => setVisibility("private")}
            block
          >
            Private
          </Button>
        </div>
      </Field>

      <Hint>
        {visibility === "public"
          ? "Anyone can find this club and request to join. You approve each request."
          : "Hidden behind a join code that you share. Anyone with the code is in — no approval step."}
      </Hint>

      <ModalActions>
        <Button variant="primary" busy={busy} busyLabel="Creating…" onClick={onSubmit}>
          Create club
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}

/* ========================================================================== */
/* Your own history, across every club                                         */
/* ========================================================================== */

function MyBooksTab() {
  const books = useAsync(() => listMyBooks(), []);

  if (books.loading) return <LoadingRow label="Loading your books…" />;
  if (books.error) return <ErrorBanner error={books.error} onRetry={books.reload} />;

  const rows = books.data ?? [];
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="No books yet">
          Books added in any of your clubs will show up here.
        </EmptyState>
      </Card>
    );
  }

  const STATUS_TONES = { reading: "warning", to_read: "info", finished: "success" };
  const STATUS_LABELS = { reading: "Reading", to_read: "To read", finished: "Finished" };

  return (
    <List>
      {rows.map((book) => (
        <ListRow
          key={book.id}
          name={book.title}
          meta={
            <>
              {book.clubs?.name}
              {book.author ? ` · ${book.author}` : ""}
              {book.year ? ` · ${book.year}` : ""}
            </>
          }
          actions={
            <Badge tone={STATUS_TONES[book.status] ?? "neutral"}>
              {STATUS_LABELS[book.status] ?? book.status}
            </Badge>
          }
        />
      ))}
    </List>
  );
}

function MyRatingsTab() {
  const { member } = useAuth();
  const ratings = useAsync(() => listMyRatings(member.id), [member.id]);

  if (ratings.loading) return <LoadingRow label="Loading your ratings…" />;
  if (ratings.error)
    return <ErrorBanner error={ratings.error} onRetry={ratings.reload} />;

  const rows = (ratings.data ?? []).filter((r) => r.books);
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon="⭐" title="No ratings yet">
          Open a club's ratings table to start rating books.
        </EmptyState>
      </Card>
    );
  }

  return (
    <List>
      {rows.map((row) => (
        <ListRow
          key={row.book_id}
          name={row.books.title}
          meta={row.books.clubs?.name}
          actions={
            <Badge member={member}>
              {Number(row.value) === JAIL_VALUE ? "jail" : `${row.value} ★`}
            </Badge>
          }
        />
      ))}
    </List>
  );
}

function MyReviewsTab() {
  const { member } = useAuth();
  const reviews = useAsync(() => listMyReviews(member.id), [member.id]);

  if (reviews.loading) return <LoadingRow label="Loading your reviews…" />;
  if (reviews.error)
    return <ErrorBanner error={reviews.error} onRetry={reviews.reload} />;

  const rows = (reviews.data ?? []).filter((r) => r.books);
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon="✍️" title="No reviews yet">
          Open a club's reviews table to write your first one.
        </EmptyState>
      </Card>
    );
  }

  return (
    <List>
      {rows.map((row) => (
        <div key={row.book_id} className={styles.reviewBlock}>
          <p className={styles.reviewTitle}>{row.books.title}</p>
          <p className={styles.reviewMeta}>{row.books.clubs?.name}</p>
          <p className={styles.reviewText}>{row.text}</p>
        </div>
      ))}
    </List>
  );
}
