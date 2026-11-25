import { useState } from "react";
import { memberColorVars } from "../../lib/util/color.js";
import styles from "./BookCover.module.css";

/**
 * A book's cover, with a graceful fallback.
 *
 * Covers are hotlinked from an external host, so three things can go wrong
 * and all three land in the same place: the book has no cover_url, the host
 * is unreachable, or the image 404s. Rather than leaving a broken-image icon,
 * any of those falls back to the title on the picker's colour — which keeps
 * rows the same height and the page from reflowing when one image fails.
 */
export function BookCover({ book, picker = null, size = "sm", className = "" }) {
  const [failed, setFailed] = useState(false);
  const show = book?.cover_url && !failed;

  return (
    <span
      className={[styles.wrap, styles[size], className].filter(Boolean).join(" ")}
      style={picker ? memberColorVars(picker.color) : undefined}
    >
      {show ? (
        <img
          className={styles.img}
          src={book.cover_url}
          /* The title is already beside this in every place it is used, so
             repeating it here would make a screen reader say it twice. */
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={[styles.fallback, size === "lg" ? styles.fallbackLg : ""]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          {book?.title?.slice(0, size === "lg" ? 40 : 14)}
        </span>
      )}
    </span>
  );
}
