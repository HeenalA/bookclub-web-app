import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarGroup } from "../components/ui/Avatar.jsx";
import { Badge, StatusBadge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card, CardHeader, SectionLabel, Hint } from "../components/ui/Card.jsx";
import { Chip } from "../components/ui/Chip.jsx";
import { Field, FieldRow, ColorField } from "../components/ui/Field.jsx";
import { List, ListRow } from "../components/ui/ListRow.jsx";
import { Modal, ModalActions } from "../components/ui/Modal.jsx";
import { Tabs } from "../components/ui/Tabs.jsx";
import {
  Banner,
  EmptyState,
  LoadingRow,
  Spinner,
} from "../components/ui/Feedback.jsx";
import { Countdown } from "../components/club/Countdown.jsx";
import { memberColors } from "../lib/util/color.js";
import styles from "./StyleGuide.module.css";

/* Hardcoded sample people. This page never reads the database — which is why
   it is safe to open without signing in, and why you can style against it
   before the project is even connected. */
const SAMPLE = [
  { id: "maya", name: "Maya", initials: "M", color: "#7B9EC9" },
  { id: "mina", name: "Mina", initials: "Mi", color: "#C97B9E" },
  { id: "heenal", name: "Heenal", initials: "H", color: "#9E7BC9" },
  { id: "sam", name: "Sam Okafor", initials: "SO", color: "#7BC9A4" },
];

const SURFACES = [
  ["Accent", "--accent"],
  ["Accent strong", "--accent-strong"],
  ["Accent soft", "--accent-soft"],
  ["Page", "--surface-page"],
  ["Sunken", "--surface-sunken"],
  ["Card", "--surface-card"],
  ["Dark", "--surface-dark"],
  ["Border", "--border"],
  ["Border strong", "--border-strong"],
];

const TYPE_SCALE = [
  ["Display", "--text-display", "font-display"],
  ["Title", "--text-title", "font-display"],
  ["Subtitle", "--text-subtitle", "font-body"],
  ["Body", "--text-body", "font-body"],
  ["Small", "--text-small", "font-body"],
  ["Caption", "--text-caption", "font-body"],
  ["Micro", "--text-micro", "font-body"],
];

/**
 * A live gallery of every component in every state.
 *
 * This is the page to keep open while making design changes: edit a token in
 * src/styles/tokens.css and everything that uses it moves here at once, so you
 * can see the whole system respond instead of checking eight pages one at a
 * time.
 */
export default function StyleGuide() {
  const [tab, setTab] = useState("one");
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [color, setColor] = useState("#9E7BC9");

  const soon = new Date();
  soon.setDate(soon.getDate() + 12);
  const sampleMeeting = {
    meeting_date: soon.toISOString().slice(0, 10),
    meeting_time: "6:00 PM PST",
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>Style guide</h1>
      <p className={styles.lede}>
        Every component, in every state, on one page. Change a value in{" "}
        <code>src/styles/tokens.css</code> and watch it propagate here. Nothing
        on this page touches the database — the people below are made up.
        <br />
        <Link to="/clubs" style={{ color: "var(--accent-strong)", textDecoration: "underline" }}>
          Back to the app
        </Link>
      </p>

      {/* ---- Colour ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Colour</h2>
        <p className={styles.caption}>Surfaces and accents — edit under BRAND &amp; SURFACES.</p>
        <div className={styles.swatches}>
          {SURFACES.map(([name, token]) => (
            <div key={token} className={styles.swatch}>
              <div className={styles.swatchChip} style={{ background: `var(${token})` }} />
              <p className={styles.swatchName}>{name}</p>
              <p className={styles.swatchVar}>{token}</p>
            </div>
          ))}
        </div>

        <p className={styles.caption} style={{ marginTop: "var(--space-6)" }}>
          Member colours are <strong>not</strong> tokens — they come from the
          database and their chip shades are derived. Any colour works:
        </p>
        <div className={styles.swatches}>
          {SAMPLE.map((m) => {
            const c = memberColors(m.color);
            return (
              <div key={m.id} className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: c.base }} />
                <div
                  className={styles.swatchChip}
                  style={{ background: c.bg, color: c.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-micro)" }}
                >
                  {m.name}
                </div>
                <p className={styles.swatchVar}>{m.color}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Type ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Type</h2>
        {TYPE_SCALE.map(([name, token, family]) => (
          <div key={token} className={styles.typeRow}>
            <span
              style={{
                fontSize: `var(${token})`,
                fontFamily: `var(--${family})`,
              }}
            >
              To Read or Not to Read
            </span>
            <span className={styles.typeMeta}>
              {" "}
              · {name} · {token}
            </span>
          </div>
        ))}
      </section>

      {/* ---- Buttons ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Buttons</h2>
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className={styles.row}>
          <Button variant="primary" size="sm">Small primary</Button>
          <Button size="sm">Small secondary</Button>
          <Button variant="primary" busy>Busy</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* ---- Avatars ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Avatars</h2>
        <div className={styles.row}>
          {["sm", "md", "lg", "xl"].map((size) => (
            <Avatar key={size} member={SAMPLE[2]} size={size} />
          ))}
          <AvatarGroup members={SAMPLE} size="lg" />
        </div>
        <p className={styles.caption}>On the dark hero band, ringed:</p>
        <div className={styles.darkBox}>
          <AvatarGroup members={SAMPLE} size="lg" ringed />
        </div>
      </section>

      {/* ---- Badges ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Badges</h2>
        <div className={styles.row}>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="admin">Admin</Badge>
        </div>
        <div className={styles.row}>
          <StatusBadge status="active" />
          <StatusBadge status="pending" />
          <StatusBadge status="inactive" />
        </div>
        <p className={styles.caption}>Member-toned, with a dot:</p>
        <div className={styles.row}>
          {SAMPLE.map((m) => (
            <Badge key={m.id} member={m} dot>
              Picked by {m.name}
            </Badge>
          ))}
          {SAMPLE.map((m) => (
            <Badge key={`r-${m.id}`} member={m}>
              9.5 ★
            </Badge>
          ))}
        </div>
      </section>

      {/* ---- Chips ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Chips</h2>
        <p className={styles.caption}>
          Coloured by who picked the book. Editable chips are real buttons —
          Tab to them.
        </p>
        <div className={styles.row}>
          {SAMPLE.map((m) => (
            <Chip key={m.id} label="A Darker Shade of Magic" picker={m} />
          ))}
        </div>
        <div className={styles.row}>
          <Chip label="Editable, with handle" picker={SAMPLE[0]} editable showHandle />
          <Chip label="Read-only" picker={SAMPLE[1]} />
          <Chip label="Nobody picked this" />
          <Chip
            label="A very long book title that has to be truncated somewhere"
            picker={SAMPLE[2]}
          />
        </div>
      </section>

      {/* ---- Cards, labels, lists ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Cards &amp; lists</h2>
        <SectionLabel>Section label</SectionLabel>
        <Hint>A hint line that explains the section below it.</Hint>
        <div className={styles.row} style={{ alignItems: "stretch" }}>
          <Card style={{ flex: 1, minWidth: 220 }}>Padded card.</Card>
          <Card padded={false} style={{ flex: 1, minWidth: 220 }}>
            <CardHeader title="With a header">
              <Button size="sm">Action</Button>
            </CardHeader>
            <div style={{ padding: "var(--space-4)" }}>Flush card body.</div>
          </Card>
        </div>

        <List>
          <ListRow
            lead={<Avatar member={SAMPLE[0]} size="lg" />}
            name={<>Maya <Badge tone="admin">Admin</Badge></>}
            meta="maya@example.com · joined June 2020"
            actions={<><Button size="sm">Make admin</Button><Button size="sm" variant="ghost">Remove</Button></>}
          />
          <ListRow
            lead={<Avatar member={SAMPLE[3]} size="lg" />}
            name="Sam Okafor"
            meta="sam@example.com · requested 2 days ago"
            actions={<><Button size="sm" variant="primary">Approve</Button><Button size="sm">Deny</Button></>}
          />
        </List>
      </section>

      {/* ---- Forms ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Form controls</h2>
        <div style={{ maxWidth: 420 }}>
          <Field label="Text input" placeholder="you@email.com" />
          <FieldRow>
            <Field label="Date" type="date" />
            <Field label="Time" placeholder="6:00 PM PST" />
          </FieldRow>
          <Field label="Select">
            {(props) => (
              <select {...props}>
                <option>To read</option>
                <option>Reading</option>
                <option>Finished</option>
              </select>
            )}
          </Field>
          <Field
            as="textarea"
            label="Textarea with counter"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
            placeholder="What did you think?"
          />
          <Field label="With help text" help="This explains the field." />
          <Field label="With an error" error="That does not look right." />
          <ColorField label="Colour picker" value={color} onChange={setColor} />
        </div>
      </section>

      {/* ---- Tabs ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Tabs</h2>
        <Tabs
          tabs={[
            { value: "one", label: "Clubs" },
            { value: "two", label: "Books" },
            { value: "three", label: "Ratings" },
            { value: "four", label: "Reviews" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </section>

      {/* ---- Feedback ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Feedback</h2>
        <Banner tone="error" onDismiss={() => {}}>Something went wrong.</Banner>
        <Banner tone="success">Saved.</Banner>
        <Banner tone="warning">This cannot be undone.</Banner>
        <Banner tone="info">Accounts are created by invitation.</Banner>
        <div className={styles.row}>
          <Spinner />
          <LoadingRow label="Loading ratings…" />
        </div>
        <Card>
          <EmptyState
            icon="📚"
            title="Nothing here yet"
            action={<Button variant="primary">Add the first book</Button>}
          >
            An empty state explains what to do next instead of showing a blank
            box.
          </EmptyState>
        </Card>
      </section>

      {/* ---- Countdown ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Countdown</h2>
        <div className={styles.darkBox}>
          <div className={styles.row} style={{ marginBottom: 0 }}>
            <Countdown meeting={sampleMeeting} />
            <Countdown meeting={null} />
          </div>
        </div>
      </section>

      {/* ---- Modal ---- */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Modal</h2>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open a modal
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="A dialog"
          subtitle="Escape closes it, and focus moves inside."
        >
          <Field label="Something" placeholder="Type here" />
          <ModalActions>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Save
            </Button>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          </ModalActions>
        </Modal>
      </section>
    </div>
  );
}
