import { useEffect, useState } from "react";
import { memberColorVars } from "../../lib/util/color.js";
import { BookCover } from "../ui/BookCover.jsx";
import { countdownTo, formatFullDate } from "../../lib/util/date.js";
import styles from "./Bookshelf.module.css";

/* ============================================================================
   Bookshelf — the illustrated club scene.
   ============================================================================
   Everything here is driven by real data. Nothing is baked into an image:
   the club name, the member names, the countdown and the current book are all
   live text, which is what lets one component serve every club.

   The division of labour is deliberate. Woodwork — the arch, the shelves, the
   plaque, the book spines — is CSS, because it has to stretch to fit whatever
   it contains and stay sharp doing it. The illustrations that are genuinely
   drawings — the cat, the plant, the globe — are PNGs, used at or below their
   native size.

   Member spines take their colour from the member's own row in the database,
   so adding a fourth person needs no new artwork.
   ============================================================================ */

const ART = "/bookshelf";

/* Spine heights, cycled so a row of books looks like books rather than a bar
   chart. Keyed off position, not member, so the shelf is stable between
   renders. */
/* Decorative books with no owner, to fill the plank. Heights and widths are
   varied so a row reads as books rather than a bar chart. */
const FILLERS_LEFT = [
  { "--spine-height": "126px", "--filler-width": "13px", "--filler-tint": "#5d3f2b" },
  { "--spine-height": "140px", "--filler-width": "17px", "--filler-tint": "#7a5236" },
  { "--spine-height": "118px", "--filler-width": "12px", "--filler-tint": "#4a3324" },
];
const FILLERS_RIGHT = [
  { "--spine-height": "134px", "--filler-width": "15px", "--filler-tint": "#6b4a32" },
  { "--spine-height": "122px", "--filler-width": "12px", "--filler-tint": "#53392737" },
  { "--spine-height": "146px", "--filler-width": "18px", "--filler-tint": "#7d5739" },
  { "--spine-height": "112px", "--filler-width": "13px", "--filler-tint": "#45301f" },
];

const SPINE_HEIGHTS = [152, 138, 160, 144, 166, 132, 156, 146];

function Countdown({ meeting }) {
  const [left, setLeft] = useState(() =>
    meeting ? countdownTo(meeting.meeting_date, meeting.meeting_time) : null
  );

  useEffect(() => {
    if (!meeting) return undefined;
    const tick = () =>
      setLeft(countdownTo(meeting.meeting_date, meeting.meeting_time));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meeting]);

  if (!meeting) {
    return (
      <div className={styles.plaque}>
        <p className={styles.plaqueLabel}>Next meeting</p>
        <p className={styles.plaqueEmpty}>Nothing scheduled yet</p>
      </div>
    );
  }

  const cells = left
    ? [
        ["Days", left.days],
        ["Hours", left.hours],
        ["Min", left.minutes],
      ]
    : null;

  return (
    <div className={styles.plaque}>
      <p className={styles.plaqueLabel}>Next meeting</p>
      <p className={styles.plaqueDate}>
        {formatFullDate(meeting.meeting_date)}
        {meeting.meeting_time ? ` · ${meeting.meeting_time}` : ""}
      </p>
      {cells ? (
        <div className={styles.countdown}>
          {cells.map(([unit, value]) => (
            <span key={unit} className={styles.timeCell}>
              <span className={styles.timeNum}>
                {String(value).padStart(2, "0")}
              </span>
              <span className={styles.timeUnit}>{unit}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.plaqueDate}>Meeting time!</p>
      )}
    </div>
  );
}

export function Bookshelf({
  clubName,
  members = [],
  currentBook = null,
  nextMeeting = null,
  memberById = {},
  onMemberClick,
}) {
  const picker = currentBook?.picked_by
    ? memberById[currentBook.picked_by]
    : null;

  return (
    <section className={styles.scene} aria-label={`${clubName} bookshelf`}>
      {/* Decorative only — empty alt so a screen reader skips it. */}
      <img src={`${ART}/vine.png`} alt="" className={styles.vine} />

      <header className={styles.arch}>
        <h2 className={styles.clubName}>
          <span className={styles.sprig} aria-hidden="true">
            ❧
          </span>
          {clubName}
          <span className={styles.sprig} aria-hidden="true">
            ❧
          </span>
        </h2>
      </header>

      <div className={styles.interior}>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.bay}>
        {/* ---- upper shelf: meeting and current book ---- */}
        <div>
          <div className={styles.row}>
            <Countdown meeting={nextMeeting} />

            <img
              src={`${ART}/candle.png`}
              alt=""
              className={styles.art}
              style={{ maxHeight: 70 }}
            />

            {currentBook ? (
              <div className={styles.currentWrap}>
                <span className={styles.ribbon}>Currently reading</span>
                {currentBook.cover_url ? (
                  /* A real cover beats a drawn stand-in, so when the book has
                     one it is shown as the book itself. */
                  <BookCover book={currentBook} picker={picker} size="lg" />
                ) : (
                  <div
                    className={styles.currentBook}
                    style={memberColorVars(picker?.color ?? "#4b3b7a")}
                  >
                    <p className={styles.currentTitle}>{currentBook.title}</p>
                    {currentBook.author && (
                      <p className={styles.currentAuthor}>{currentBook.author}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.currentWrap}>
                <span className={styles.ribbon}>Currently reading</span>
                <div className={styles.currentBook}>
                  <p className={styles.currentAuthor}>
                    Nothing on the go. Mark a book as reading.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className={styles.plank} />
        </div>

        {/* ---- lower shelf: the members ---- */}
        <div>
          <div className={styles.labelRow}>
            <span className={styles.shelfLabel}>
              Members ({members.length})
            </span>
          </div>

          <div className={`${styles.row} ${styles.membersRow}`}>
            <span className={styles.fillerGroup}>
              {FILLERS_LEFT.map((f, i) => (
                <span key={i} className={styles.filler} style={f} />
              ))}
            </span>

            {members.length === 0 ? (
              <p className={styles.empty}>No members yet.</p>
            ) : (
              members.map((member, i) => (
                <button
                  key={member.id}
                  type="button"
                  className={styles.memberBook}
                  style={{
                    ...memberColorVars(member.color),
                    "--spine-height": `${SPINE_HEIGHTS[i % SPINE_HEIGHTS.length]}px`,
                  }}
                  onClick={() => onMemberClick?.(member)}
                  aria-label={`${member.name}${
                    member.role === "admin" ? ", admin" : ""
                  }`}
                >
                  <span className={styles.memberName}>{member.name}</span>
                  {member.role === "admin" && (
                    <span className={styles.memberRole}>Admin</span>
                  )}
                </button>
              ))
            )}

            <span className={`${styles.fillerGroup} ${styles.fillerGroupGrow}`}>
              {FILLERS_RIGHT.map((f, i) => (
                <span key={i} className={styles.filler} style={f} />
              ))}
            </span>

            <img
              src={`${ART}/plant.png`}
              alt=""
              className={`${styles.art} ${styles.artTall} ${styles.artPushed}`}
            />
          </div>
          <div className={styles.plank} />
        </div>
      </div>

      {/* ---- the narrow decorative bay ---- */}
      <aside className={styles.column} aria-hidden="true">
        <div>
          <div className={styles.nook}>
            <img src={`${ART}/globe.png`} alt="" className={styles.art} />
            <img src={`${ART}/picture_frame.png`} alt="" className={styles.art} />
          </div>
          <div className={styles.plank} />
        </div>
        <div>
          <div className={styles.nook}>
            <img src={`${ART}/teacup.png`} alt="" className={styles.art} />
            <img src={`${ART}/snow_globe.png`} alt="" className={styles.art} />
          </div>
          <div className={styles.plank} />
        </div>
        <div>
          <div className={styles.nook}>
            <img src={`${ART}/cat.png`} alt="" className={styles.art} />
          </div>
          <div className={styles.plank} />
        </div>
        <div>
          <div className={styles.nook}>
            <img src={`${ART}/lantern.png`} alt="" className={styles.art} />
            <img src={`${ART}/jar_light.png`} alt="" className={styles.art} />
            <img src={`${ART}/pen_cup.png`} alt="" className={styles.art} />
          </div>
          <div className={styles.plank} />
        </div>
      </aside>
      </div>
    </section>
  );
}
