import { useEffect, useState } from "react";
import { countdownTo, formatMonthDay } from "../../lib/util/date.js";
import styles from "./Countdown.module.css";

/**
 * Live countdown to the next meeting.
 *
 * The meeting date comes from the `meetings` table now. It used to be a
 * hardcoded constant in main.js — which had quietly drifted into the past, so
 * the home page was permanently showing "Meeting time!".
 *
 * LEARNING: the interval is created inside useEffect and cleared in the
 * function it returns. Without that cleanup, navigating away leaves the timer
 * running forever, still calling setState on a component that no longer
 * exists — a memory leak that compounds with every visit.
 */
export function Countdown({ meeting }) {
  const [remaining, setRemaining] = useState(() =>
    meeting ? countdownTo(meeting.meeting_date, meeting.meeting_time) : null
  );

  useEffect(() => {
    if (!meeting) return;

    function tick() {
      setRemaining(countdownTo(meeting.meeting_date, meeting.meeting_time));
    }

    tick();
    // Once a minute is enough — the display has no seconds, so a one-second
    // interval would re-render 60 times to show the same thing.
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meeting]);

  if (!meeting) {
    return (
      <div className={styles.card}>
        <p className={styles.label}>Next meeting</p>
        <p className={styles.empty}>Nothing scheduled yet</p>
      </div>
    );
  }

  const when = `${formatMonthDay(meeting.meeting_date)}${
    meeting.meeting_time ? ` · ${meeting.meeting_time}` : ""
  }`;

  if (!remaining) {
    return (
      <div className={styles.card}>
        <p className={styles.label}>Next meeting</p>
        <p className={styles.now}>Meeting time!</p>
        <p className={styles.date}>{when}</p>
      </div>
    );
  }

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className={styles.card}>
      <p className={styles.label}>Next meeting</p>
      <div className={styles.nums}>
        <span className={styles.block}>
          <span className={styles.n}>{pad(remaining.days)}</span>
          <span className={styles.u}>days</span>
        </span>
        <span className={styles.sep}>:</span>
        <span className={styles.block}>
          <span className={styles.n}>{pad(remaining.hours)}</span>
          <span className={styles.u}>hrs</span>
        </span>
        <span className={styles.sep}>:</span>
        <span className={styles.block}>
          <span className={styles.n}>{pad(remaining.minutes)}</span>
          <span className={styles.u}>min</span>
        </span>
      </div>
      <p className={styles.date}>{when}</p>
    </div>
  );
}
