import { memberColorVars, initialsOf } from "../../lib/util/color.js";
import styles from "./Avatar.module.css";

/**
 * A member's initials in their own colour.
 *
 * The colour arrives as a CSS custom property rather than a direct
 * `background` so that the stylesheet stays in charge of how the colour is
 * used — see --member-base in Avatar.module.css.
 */
export function Avatar({ member, size = "md", ringed = false, className = "" }) {
  const label = member?.initials?.trim() || initialsOf(member?.name);

  return (
    <span
      className={[styles.avatar, styles[size], ringed ? styles.ringed : "", className]
        .filter(Boolean)
        .join(" ")}
      style={memberColorVars(member?.color)}
      // The initials are decorative shorthand for a name that is almost
      // always written next to them; the title gives the full name on hover
      // and to assistive tech when it is not.
      title={member?.name || undefined}
    >
      {label}
    </span>
  );
}

/** An overlapping row of avatars, for "who's in this club". */
export function AvatarGroup({ members = [], size = "sm", ringed = false, max = 6 }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;

  return (
    <span className={styles.group}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} ringed={ringed} />
      ))}
      {extra > 0 && (
        <Avatar
          member={{ name: `${extra} more`, initials: `+${extra}`, color: "#8a7a6a" }}
          size={size}
          ringed={ringed}
        />
      )}
    </span>
  );
}
