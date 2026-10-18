import { memberColorVars } from "../../lib/util/color.js";
import styles from "./Chip.module.css";

/**
 * A book title as a small coloured tag — the unit the ratings table is built
 * from.
 *
 * When editable it renders as a real <button>, not a styled <span>. That
 * matters: a button is reachable by Tab, activates on Enter and Space, and is
 * announced as a control. A clickable span does none of that, so the ratings
 * table would be unusable without a mouse.
 */
export function Chip({
  label,
  picker = null,
  editable = false,
  showHandle = false,
  onClick,
  title,
  ...rest
}) {
  const className = [
    styles.chip,
    picker ? "" : styles.unpicked,
    editable ? styles.editable : styles.readonly,
  ]
    .filter(Boolean)
    .join(" ");

  const style = picker ? memberColorVars(picker.color) : undefined;

  const content = (
    <>
      {showHandle && (
        <span className={styles.handle} aria-hidden="true">
          ⠿
        </span>
      )}
      <span className={styles.label}>{label}</span>
    </>
  );

  if (!editable) {
    return (
      <span className={className} style={style} title={title || label} {...rest}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      title={title || `Change your rating of ${label}`}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  );
}
