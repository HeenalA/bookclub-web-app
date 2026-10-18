import styles from "./Button.module.css";

/**
 * Every clickable action in the app.
 *
 * `busy` renders the button disabled with alternate text, which matters for
 * anything that writes to the database: without it, an impatient double-click
 * fires two requests.
 */
export function Button({
  children,
  variant = "secondary",
  size = "md",
  block = false,
  busy = false,
  busyLabel,
  type = "button",
  className = "",
  disabled,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={[
        styles.button,
        styles[variant],
        styles[size],
        block ? styles.block : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {busy ? busyLabel || "Working…" : children}
    </button>
  );
}
