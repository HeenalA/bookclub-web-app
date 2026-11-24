import styles from "./Card.module.css";

export function Card({ children, padded = true, className = "", ...rest }) {
  return (
    <div
      className={[styles.card, padded ? styles.padded : styles.flush, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, children }) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>{title}</span>
      {children}
    </div>
  );
}

/** The small uppercase label above a section ("Currently reading"). */
export function SectionLabel({ children, className = "" }) {
  return (
    <p className={[styles.sectionLabel, className].filter(Boolean).join(" ")}>
      {children}
    </p>
  );
}

/** Explanatory text under a SectionLabel. */
export function Hint({ children }) {
  return <p className={styles.hint}>{children}</p>;
}
