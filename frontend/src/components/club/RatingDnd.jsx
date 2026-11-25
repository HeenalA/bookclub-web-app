import { useRef } from "react";
import { createPortal } from "react-dom";
import { useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core";
import { Chip } from "../ui/Chip.jsx";
import styles from "./RatingDnd.module.css";

/* ============================================================================
   RatingDnd — the drag pieces of the ratings grid.
   ============================================================================
   Dragging a chip from one star row to another IS the edit: the row you drop
   on becomes your rating for that book.

   ACCESSIBILITY, AND WHY THERE IS NO KEYBOARD SENSOR.
   The chips are real <button>s that open a rating picker on click, and that
   is the path keyboard and screen-reader users take. dnd-kit's KeyboardSensor
   would hijack Space and Enter to start a drag instead, taking that path away
   and replacing it with a worse one. Drag is a pointer-only addition; nothing
   depends on it.
   ============================================================================ */

/**
 * A draggable chip.
 *
 * Only ever rendered for the signed-in member's own column. That is not just
 * a permission check — it is what keeps every draggable id unique. The same
 * book appears in all three columns, so an id of "chip:<bookId>" was shared
 * by three different elements, and dnd-kit then treated them as one: picking
 * up your copy visibly dimmed everyone else's too.
 */
export function DraggableChip({ memberId, bookId, label, picker, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip:${memberId}:${bookId}`,
    data: { bookId },
  });

  /* A drag ends with a pointerup over the chip, and the browser follows that
     with a click — which would open the rating picker on top of the drop you
     just made. Comparing where the pointer went down and came up tells the
     two apart. */
  const downAt = useRef(null);

  return (
    <span
      ref={setNodeRef}
      className={isDragging ? styles.dragging : undefined}
      onPointerDownCapture={(e) => {
        downAt.current = { x: e.clientX, y: e.clientY };
      }}
      onClickCapture={(e) => {
        const from = downAt.current;
        if (!from) return;
        const moved = Math.hypot(e.clientX - from.x, e.clientY - from.y);
        if (moved > 8) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      {...listeners}
      {...attributes}
    >
      <Chip label={label} picker={picker} editable showHandle onClick={onClick} />
    </span>
  );
}

/**
 * A cell that accepts a dropped chip. `value` is the rating it represents:
 * a number, the jail value, or null for "unrated", which clears the rating.
 */
export function DropCell({ id, value, disabled, children, className }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:${id}`,
    disabled,
    data: { value },
  });

  return (
    <td
      ref={disabled ? undefined : setNodeRef}
      className={[className, isOver ? styles.over : ""].filter(Boolean).join(" ")}
    >
      {children}
    </td>
  );
}

/**
 * The chip that follows the cursor.
 *
 * Rendered into document.body rather than in place. DragOverlay positions
 * itself with `position: fixed`, and any ancestor with a transform, filter or
 * will-change turns itself into the containing block for fixed children — so
 * the floating chip lands somewhere else on the page entirely. A portal puts
 * it outside every such ancestor.
 */
export function RatingDragOverlay({ book, picker }) {
  return createPortal(
    <DragOverlay dropAnimation={null} zIndex={9999}>
      {book ? <Chip label={book.title} picker={picker} showHandle /> : null}
    </DragOverlay>,
    document.body
  );
}
