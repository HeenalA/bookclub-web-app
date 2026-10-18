import { useId } from "react";
import styles from "./Field.module.css";

/**
 * A labelled form control.
 *
 * LEARNING: `useId()` generates a unique id so the <label> can point at its
 * input with htmlFor. That association is what lets a screen reader announce
 * "Email, edit text" instead of just "edit text", and what makes clicking the
 * label focus the field. Hardcoding ids breaks the moment a form is rendered
 * twice on one page.
 */
export function Field({
  label,
  error,
  help,
  children,
  as = "input",
  maxLength,
  value,
  ...rest
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, help ? `${id}-help` : null]
    .filter(Boolean)
    .join(" ");

  const className = [
    styles.control,
    as === "textarea" ? styles.textarea : "",
    error ? styles.invalid : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id,
    className,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    ...rest,
  };

  const length = typeof value === "string" ? value.length : 0;
  const over = maxLength ? length > maxLength : false;

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}

      {children ? (
        /* A caller-supplied control (a <select>, a colour picker) still gets
           the label wiring by cloning in the generated id. */
        <div>{typeof children === "function" ? children(shared) : children}</div>
      ) : as === "textarea" ? (
        <textarea {...shared} />
      ) : (
        <input {...shared} />
      )}

      {maxLength && (
        <p className={[styles.counter, over ? styles.counterOver : ""].join(" ")}>
          {length} / {maxLength}
        </p>
      )}
      {help && (
        <p className={styles.help} id={`${id}-help`}>
          {help}
        </p>
      )}
      {error && (
        <p className={styles.error} id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldRow({ children }) {
  return <div className={styles.row}>{children}</div>;
}

/** A native colour picker plus the hex value, for "change my colour". */
export function ColorField({ label, value, onChange, help }) {
  const id = useId();
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={styles.colorRow}>
        <input
          id={id}
          type="color"
          className={styles.colorInput}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <code style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>
          {value}
        </code>
      </div>
      {help && <p className={styles.help}>{help}</p>}
    </div>
  );
}
