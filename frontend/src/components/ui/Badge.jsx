import { memberColorVars } from "../../lib/util/color.js";
import styles from "./Badge.module.css";

/**
 * A small status or label pill.
 *
 * Pass `member` instead of `tone` to colour it with that member's colour —
 * used for picker credits and rating badges.
 */
export function Badge({
  children,
  tone = "neutral",
  member = null,
  dot = false,
  className = "",
}) {
  const isMemberToned = Boolean(member);

  return (
    <span
      className={[
        styles.badge,
        isMemberToned ? styles.member : styles[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={isMemberToned ? memberColorVars(member.color) : undefined}
    >
      {dot && (
        <span
          className={styles.dot}
          style={isMemberToned ? { background: member.color } : undefined}
        />
      )}
      {children}
    </span>
  );
}

/** Maps a membership status to the right tone, in one place. */
export function StatusBadge({ status }) {
  const tones = {
    active: "success",
    pending: "warning",
    inactive: "neutral",
  };
  const labels = {
    active: "Active",
    pending: "Pending",
    inactive: "Inactive",
  };
  return <Badge tone={tones[status] || "neutral"}>{labels[status] || status}</Badge>;
}
