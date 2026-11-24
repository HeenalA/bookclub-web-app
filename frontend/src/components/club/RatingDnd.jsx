import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Chip } from "../ui/Chip.jsx";
import styles from "./RatingDnd.module.css";

/* ============================================================================
   RatingDnd — the drag pieces of the ratings grid.
   ============================================================================
   Dragging a chip from one star row to another IS the edit: the row you drop
   on becomes your rating for that book.

   ACCESSIBILITY, AND WHY THERE IS NO KEYBOARD SENSOR.
   The chips are real <button>s that open a rating picker on click, and that
   is the path keyboard and screen-reader users take. Adding dnd-kit's
   KeyboardSensor would hijack Space and Enter to start a drag instead, which
   would take that path away and replace it with a worse one. So drag is a
   pointer-only enhancement layered on top, and nothing depends on it. That
   is the right shape for drag-and-drop: a faster way to do something that is
   already possible, never the only way.
   ============================================================================ */

export function DraggableChip({ bookId, label, picker, onClick, disabled }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip:${bookId}`,
    disabled,
    data: { bookId },
  });

  return (
    <span
      ref={setNodeRef}
      className={isDragging ? styles.dragging : undefined}
      /* The chip is not transformed as it moves — a copy follows the cursor
         in the DragOverlay instead. Moving the original would make the row
         it came from reflow underneath it. */
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      <Chip
        label={label}
        picker={picker}
        editable={!disabled}
        showHandle={!disabled}
        onClick={onClick}
      />
    </span>
  );
}

/**
 * A cell that accepts a dropped chip. `value` is the rating it represents:
 * a number, JAIL, or null for "unrated", which clears the rating.
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
