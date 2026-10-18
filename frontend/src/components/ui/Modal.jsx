import { useEffect, useRef } from "react";
import styles from "./Modal.module.css";

/**
 * A dialog for forms and confirmations.
 *
 * Three accessibility behaviours that are easy to leave out and genuinely
 * matter:
 *
 *  - Escape closes it. Expected by everyone, and the only way out for someone
 *    not using a mouse if the close button scrolls off.
 *  - Focus moves into the panel on open, so a keyboard or screen-reader user
 *    is not left behind on the page underneath.
 *  - `aria-modal` plus `role="dialog"` tells assistive tech that the content
 *    behind is inert, rather than reading the whole page as one jumble.
 *
 * Background scrolling is locked while open, otherwise the page behind drifts
 * when you scroll inside the dialog.
 */
export function Modal({ open, onClose, title, subtitle, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first focusable control, or the panel itself.
    const focusable = panelRef.current?.querySelector(
      "input, textarea, select, button, [href]"
    );
    (focusable ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      // Clicking the backdrop closes; clicking inside the panel must not, so
      // the check is that the click landed on the backdrop itself.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {title && <p className={styles.title}>{title}</p>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className={styles.actions}>{children}</div>;
}
