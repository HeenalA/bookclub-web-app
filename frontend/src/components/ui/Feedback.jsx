import styles from "./Feedback.module.css";
import { Button } from "./Button.jsx";

export function Spinner() {
  return <span className={styles.spinner} role="status" aria-label="Loading" />;
}

export function LoadingRow({ label = "Loading…" }) {
  return (
    <div className={styles.loadingRow}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

/**
 * An inline message.
 *
 * `role="alert"` on errors makes a screen reader announce it immediately —
 * without it, someone who cannot see the banner appear gets no indication that
 * their save just failed.
 */
export function Banner({ tone = "error", children, onDismiss }) {
  const toneClass = {
    error: styles.bannerError,
    success: styles.bannerSuccess,
    info: styles.bannerInfo,
    warning: styles.bannerWarning,
  }[tone];

  return (
    <div
      className={[styles.banner, toneClass].join(" ")}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className={styles.bannerBody}>{children}</span>
      {onDismiss && (
        <button className={styles.bannerClose} onClick={onDismiss} type="button">
          Dismiss
        </button>
      )}
    </div>
  );
}

/** Shows an AppError, or nothing when there is no error. */
export function ErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null;
  return (
    <Banner tone="error" onDismiss={onDismiss}>
      {error.message}
      {onRetry && (
        <>
          {" "}
          <button
            type="button"
            className={styles.bannerClose}
            onClick={onRetry}
          >
            Try again
          </button>
        </>
      )}
    </Banner>
  );
}

export function EmptyState({ icon = "📚", title, children, action }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden="true">
        {icon}
      </div>
      {title && <p className={styles.emptyTitle}>{title}</p>}
      {children && <p className={styles.emptyBody}>{children}</p>}
      {action}
    </div>
  );
}

export { Button };
