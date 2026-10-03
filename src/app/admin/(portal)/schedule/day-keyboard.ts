/* The day view's roving focus (issue #351; Figma S5 keyboard frame). The
   day is one focus group: ↑ and ↓ move through one provider's day, ← and →
   keep the time and move to the next provider who has anything that day.
   Pure, so the moves are tested without a browser. */

export type DayMove = "up" | "down" | "left" | "right";

interface Placed {
  readonly top: number;
  readonly height: number;
  readonly lane: number;
}

/** The move an arrow key asks for, or null for any other key. */
export function moveFor(key: string): DayMove | null {
  switch (key) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    default:
      return null;
  }
}

/** How far a cell is from a minute: zero when the minute falls inside it. */
function distance(cell: Readonly<Placed>, minute: number): number {
  if (minute < cell.top) return cell.top - minute;
  if (minute >= cell.top + cell.height) return minute - (cell.top + cell.height) + 1;
  return 0;
}

/** The index of the cell a move lands on, or the current index when there
    is nowhere to go. `cells` are in reading order: by top, then lane. */
export function nextCell(
  cells: readonly Readonly<Placed>[],
  current: number,
  move: DayMove,
): number {
  const from = cells.at(current);
  if (from === undefined) return current;

  if (move === "up" || move === "down") {
    const step = move === "up" ? -1 : 1;
    for (let index = current + step; index >= 0 && index < cells.length; index += step)
      if (cells[index].lane === from.lane) return index;
    return current;
  }

  const lanes = [...new Set(cells.map((cell) => cell.lane))].toSorted((a, b) => a - b);
  const position = lanes.indexOf(from.lane) + (move === "left" ? -1 : 1);
  if (position < 0 || position >= lanes.length) return current;
  const lane = lanes[position];

  let best = current;
  let bestDistance = Infinity;
  cells.forEach((cell, index) => {
    if (cell.lane !== lane) return;
    const gap = distance(cell, from.top);
    if (gap < bestDistance) {
      best = index;
      bestDistance = gap;
    }
  });
  return best;
}
