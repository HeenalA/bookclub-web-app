import styles from "./ListRow.module.css";

/** A bordered list container. */
export function List({ children, className = "" }) {
  return (
    <div className={[styles.list, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/**
 * One row: optional leading element, a name, metadata, and right-aligned
 * actions. This single shape covers the club list, member list, book list,
 * ratings list, pending requests and past meetings across the mockups —
 * which is exactly why it is a component instead of six near-copies.
 */
export function ListRow({ lead, name, meta, actions, children }) {
  return (
    <div className={styles.row}>
      <div className={styles.lead}>
        {lead}
        <div className={styles.main}>
          {name && <div className={styles.name}>{name}</div>}
          {meta && <div className={styles.meta}>{meta}</div>}
          {children}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
