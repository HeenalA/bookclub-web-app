import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { useClub, useClubId } from "../lib/hooks/useClub.jsx";
import { useAsync } from "../lib/hooks/useAsync.js";
import {
  getJoinCode,
  regenerateJoinCode,
  approveMember,
  denyMember,
  removeMember,
  setMemberRole,
  updateClubSettings,
  leaveClub,
} from "../lib/api/clubs.js";
import { updateMyProfile } from "../lib/api/members.js";
import { toAppError } from "../lib/api/errors.js";
import { formatMonthYear, relativeTime } from "../lib/util/date.js";
import { Page } from "../components/layout/AppShell.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { SectionLabel, Hint } from "../components/ui/Card.jsx";
import { Field, ColorField } from "../components/ui/Field.jsx";
import { List, ListRow } from "../components/ui/ListRow.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { Banner, ErrorBanner } from "../components/ui/Feedback.jsx";
import styles from "./ClubSettings.module.css";

export default function ClubSettings() {
  const clubId = useClubId();
  const navigate = useNavigate();
  const { member, refreshMember } = useAuth();
  const {
    club,
    activeMembers,
    pendingMembers,
    isAdmin,
    reloadClub,
  } = useClub();

  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [changingColor, setChangingColor] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function run(fn, message) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (message) setNotice(message);
      reloadClub();
    } catch (err) {
      setError(toAppError(err));
    }
  }

  return (
    <Page>
      <h1 className={styles.clubName}>
        {club.name}
        <Badge tone={club.visibility === "public" ? "info" : "neutral"}>
          {club.visibility === "public" ? "Public" : "Private"}
        </Badge>
      </h1>
      <p className={styles.clubMeta}>
        {club.founded_date && `Founded ${formatMonthYear(club.founded_date)} · `}
        {activeMembers.length} active member
        {activeMembers.length === 1 ? "" : "s"}
      </p>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      {notice && (
        <Banner tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {/* ================= Members — visible to everyone ================= */}
      <SectionLabel>Members</SectionLabel>
      <Hint>
        Everyone in the club can see this list. You can change your own colour.
      </Hint>
      <List>
        {activeMembers.map((m) => {
          const isMe = m.id === member.id;
          return (
            <ListRow
              key={m.id}
              lead={<Avatar member={m} size="lg" />}
              name={
                <>
                  {m.name}
                  {isMe && <span style={{ color: "var(--text-muted)" }}>(you)</span>}
                  {m.role === "admin" && <Badge tone="admin">Admin</Badge>}
                </>
              }
              meta={
                <>
                  <span className={styles.swatch} style={{ background: m.color }} />
                  {m.color}
                </>
              }
              actions={
                <>
                  {isMe && (
                    <Button size="sm" variant="primary" onClick={() => setChangingColor(true)}>
                      Change my colour
                    </Button>
                  )}
                  {isAdmin && !isMe && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          run(
                            () =>
                              setMemberRole(
                                clubId,
                                m.id,
                                m.role === "admin" ? "member" : "admin"
                              ),
                            m.role === "admin"
                              ? `${m.name} is no longer an admin.`
                              : `${m.name} is now an admin.`
                          )
                        }
                      >
                        {m.role === "admin" ? "Remove admin" : "Make admin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(
                            () => removeMember(clubId, m.id),
                            `${m.name} removed from the club.`
                          )
                        }
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </>
              }
            />
          );
        })}
      </List>

      {/* ===================== Admin-only sections ====================== */}
      {isAdmin && (
        <div className={styles.adminPanel} style={{ marginTop: "var(--space-8)" }}>
          <p className={styles.adminLabel}>Admin only</p>

          {club.visibility === "private" && <JoinCodeSection clubId={clubId} />}

          <p className={styles.adminSub}>Pending join requests</p>
          {pendingMembers.length === 0 ? (
            <Hint>Nothing waiting.</Hint>
          ) : (
            <List>
              {pendingMembers.map((m) => (
                <ListRow
                  key={m.id}
                  lead={<Avatar member={m} size="lg" />}
                  name={m.name}
                  meta={`${m.email ?? ""} · requested ${relativeTime(m.requested_at)}`}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          run(
                            () => approveMember(clubId, m.id),
                            `${m.name} is now a member.`
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          run(() => denyMember(clubId, m.id), "Request denied.")
                        }
                      >
                        Deny
                      </Button>
                    </>
                  }
                />
              ))}
            </List>
          )}

          <p className={styles.adminSub}>Club details</p>
          <div className={styles.codeRow}>
            <Button size="sm" onClick={() => setRenaming(true)}>
              Rename club
            </Button>
            <Button
              size="sm"
              onClick={() =>
                run(
                  () =>
                    updateClubSettings(clubId, {
                      visibility: club.visibility === "public" ? "private" : "public",
                    }),
                  club.visibility === "public"
                    ? "Club is now private. A join code has been created."
                    : "Club is now public. The old join code has been retired."
                )
              }
            >
              Make {club.visibility === "public" ? "private" : "public"}
            </Button>
          </div>
          <Hint>
            {club.visibility === "public"
              ? "Public clubs are discoverable, and you approve each request to join."
              : "Private clubs are joined with the code above — no approval step."}
          </Hint>
        </div>
      )}

      {/* ========================= Leave club =========================== */}
      <div className={styles.danger}>
        <p className={styles.dangerLabel}>Leave this club</p>
        <Hint>
          Your ratings and reviews are kept, and you can rejoin later. You will
          just stop seeing the club until you do.
        </Hint>
        <Button variant="danger" size="sm" onClick={() => setConfirmLeave(true)}>
          Leave {club.name}
        </Button>
      </div>

      {/* ============================ Modals ============================ */}
      <ColorModal
        open={changingColor}
        onClose={() => setChangingColor(false)}
        onSaved={async () => {
          await refreshMember();
          setChangingColor(false);
          setNotice("Your colour has been updated.");
          reloadClub();
        }}
      />

      <RenameModal
        open={renaming}
        currentName={club.name}
        onClose={() => setRenaming(false)}
        onSaved={(name) => {
          setRenaming(false);
          setNotice(`Club renamed to "${name}".`);
          reloadClub();
        }}
        clubId={clubId}
      />

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={`Leave "${club.name}"?`}
        subtitle="Your ratings and reviews stay exactly where they are."
      >
        <ModalActions>
          <Button
            variant="danger"
            onClick={async () => {
              setError(null);
              try {
                await leaveClub(clubId);
                navigate("/clubs", { replace: true });
              } catch (err) {
                setError(toAppError(err));
                setConfirmLeave(false);
              }
            }}
          >
            Yes, leave the club
          </Button>
          <Button onClick={() => setConfirmLeave(false)}>Stay</Button>
        </ModalActions>
      </Modal>
    </Page>
  );
}

function JoinCodeSection({ clubId }) {
  const code = useAsync(() => getJoinCode(clubId), [clubId]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function regenerate() {
    setError(null);
    setBusy(true);
    try {
      await regenerateJoinCode(clubId);
      code.reload();
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.data ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard access can be blocked; the code is visible to read off. */
    }
  }

  return (
    <>
      <p className={styles.adminSub} style={{ marginTop: 0 }}>
        Join code
      </p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <div className={styles.codeRow}>
        <span className={styles.codePill}>{code.loading ? "……" : code.data ?? "—"}</span>
        <Button size="sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" busy={busy} busyLabel="Working…" onClick={regenerate}>
          Regenerate
        </Button>
      </div>
      <Hint>
        Anyone with this code can join immediately. Regenerating it stops the
        old one working — do that if it has been shared too widely.
      </Hint>
    </>
  );
}

function ColorModal({ open, onClose, onSaved }) {
  const { member } = useAuth();
  const [color, setColor] = useState(member?.color ?? "#9E7BC9");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await updateMyProfile(member.id, { color });
      await onSaved();
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
      title="Change your colour"
      subtitle="Used for your avatar, and for the chips of books you picked."
    >
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <ColorField label="Your colour" value={color} onChange={setColor} />
      <ModalActions>
        <Button variant="primary" busy={busy} busyLabel="Saving…" onClick={save}>
          Save colour
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}

function RenameModal({ open, currentName, clubId, onClose, onSaved }) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await updateClubSettings(clubId, { name });
      onSaved(name.trim());
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rename club">
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <Field
        label="Club name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        help="Must be unique among active clubs."
      />
      <ModalActions>
        <Button variant="primary" busy={busy} busyLabel="Saving…" onClick={save}>
          Save name
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </ModalActions>
    </Modal>
  );
}
