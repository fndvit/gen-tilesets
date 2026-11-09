/**
 * The brush — `09-editor.md` §7.3.
 *
 * `05` §5.1 flags `cellList` as "the reason `09` cannot generate every control
 * mechanically", and it is the one exception to **E9**'s totality — permitted
 * because the schema names it explicitly rather than because the mapping ran out.
 * So this file exists for exactly one parameter type.
 *
 * ## The two halves, and only one of them is arithmetic
 *
 * `07` §8.2 assigns the caller one job — get the pointer into **render space** —
 * and warns that it "is the single most likely place to get this wrong". Then
 * `cellAt` does the rest, and the editor never reimplements it (`08` **S10**,
 * `07` **R1**). Everything below the conversion is list bookkeeping.
 *
 * ## Bounding
 *
 * `07` open question 6, resolved by §7.3: **`cellAt` stays unbounded and the
 * brush bounds at the call site.** The two tools want opposite answers and both
 * are one comparison:
 *
 * | Tool             | Bounds? | Why                                                                   |
 * | ---------------- | ------- | --------------------------------------------------------------------- |
 * | `rect` drag      | the result, not the gesture | batch 02 D-01, see `rectFrom` below          |
 * | `cellList` brush | yes     | a painted cell outside the grid can never be drawn, seen, or clicked  |
 *
 * The `rect` row used to read "no", after `04` §4.2. Pol's batch 02 D-01 split it:
 * the dragged outline follows the pointer past the edge, but the rectangle written
 * covers only cells the grid has. The *selection* still may extend past the grid —
 * typed into the fields, it is not clamped — and `cellAt` still stays unbounded,
 * because the outline needs the coordinates the drag actually reached.
 *
 * The asymmetry follows from `04` §4.4's distinction: a `rect` states an
 * intention that survives the grid growing, where a `cellList` entry states a
 * specific cell. An unremovable-by-eye entry is the failure `06` §10.4's third
 * diagnostic describes, arrived at by painting instead of by resizing.
 */

import type { ParamSchema } from "@vit-foundation/gen-tilesets";
import {
  cellAt,
  toRenderSpace,
  type BoxMetrics,
  type GridGeometry,
} from "@vit-foundation/gen-tilesets/render";

/** A painted cell. The wire shape `04` §4.4 gives `cellList`, and a tuple in the file. */
export type Cell = [number, number];

/**
 * The conversion into render space — `BoxMetrics`, `metricsOf`, `toRenderSpace` —
 * lived here until 0.6.0 and now lives in the package's `render/space.ts`, with its
 * reasoning. The keep-out tracker became its second caller, and two copies of
 * `07` §8.2's "single most likely place to get this wrong" is **R1**'s failure. It
 * is re-exported so this module's callers and tests are unchanged.
 */
export { metricsOf, toRenderSpace, type BoxMetrics } from "@vit-foundation/gen-tilesets/render";

/**
 * The cell under a pointer, or `null` outside the grid.
 *
 * The bound is §7.3's, applied **here** rather than inside `cellAt`, which stays
 * total and unbounded because `rect` needs the out-of-grid coordinates a drag
 * actually reached (`07` §8.2).
 *
 * `null` rather than an unbounded pair, because every caller in this file wants
 * the same answer: a cell outside the grid is not paintable, and `04` §4.4 makes
 * a `cellList` entry a claim about a specific cell rather than an intention that
 * outlives the grid's size.
 */
export function cellUnder(
  g: GridGeometry,
  box: BoxMetrics,
  clientX: number,
  clientY: number,
): Cell | null {
  const { px, py } = toRenderSpace(box, clientX, clientY);
  const { x, y } = cellAt(g, px, py);
  if (x < 0 || y < 0 || x >= g.columns || y >= g.rows) return null;
  return [x, y];
}

// ---------------------------------------------------------------------------
// The list — `04` §4.4, `06` §7.2
// ---------------------------------------------------------------------------

export function hasCell(cells: readonly Cell[], [x, y]: Cell): boolean {
  return cells.some((c) => c[0] === x && c[1] === y);
}

/**
 * Idempotent, so a drag that re-enters a cell it already painted does nothing.
 *
 * A duplicate entry would be legal and invisible — `cellList`'s predicate is a
 * membership test, so the second copy changes no output — which is exactly why
 * it must not accumulate: it would grow the file on every stroke with nothing to
 * show for it and nothing to remove it by.
 */
export function addCell(cells: readonly Cell[], cell: Cell): Cell[] {
  return hasCell(cells, cell) ? [...cells] : [...cells, cell];
}

export function removeCell(cells: readonly Cell[], [x, y]: Cell): Cell[] {
  return cells.filter((c) => !(c[0] === x && c[1] === y));
}

/**
 * Which cells a design-width change has stranded outside the grid.
 *
 * Not repaired, and not repairable here — §9.4: "nothing is migrated, ever", and
 * undo is the repair (**E6**). This only *names* them, which is what §9.3's
 * confirmation needs to say and what the brush cannot say for itself, since a
 * stranded cell is by definition one the author cannot see or click.
 *
 * `06` §10.4's third diagnostic is the same condition reached through `rect`.
 */
export function strandedCells(cells: readonly Cell[], columns: number, rows: number): Cell[] {
  return cells.filter(([x, y]) => x < 0 || y < 0 || x >= columns || y >= rows);
}

// ---------------------------------------------------------------------------
// The rectangle drag — batch 02 T-01, B-011
// ---------------------------------------------------------------------------

/** A `rect` Selection's parameters: the four integers `04` §4.2 gives it. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The cell under a pointer, **unbounded**: the coordinates a drag actually
 * reached, which may be `-2` or past the last column. `cellUnder`'s null is the
 * brush's answer; the rectangle drag wants the point, so the dragged outline can
 * follow the pointer off the grid (D-01).
 */
export function cellReached(
  g: GridGeometry,
  box: BoxMetrics,
  clientX: number,
  clientY: number,
): Cell {
  const { px, py } = toRenderSpace(box, clientX, clientY);
  const { x, y } = cellAt(g, px, py);
  return [x, y];
}

/**
 * The rectangle spanned by two cells: the smaller corner, and an **inclusive**
 * size, so a click (both cells the same) is a 1×1 rectangle and a drag in any of
 * the four directions gives the same rectangle as its reverse.
 *
 * With `bound`, both cells are first clamped into `[0, columns-1] × [0, rows-1]`:
 * Pol's batch 02 D-01 — the gesture follows the pointer past the edge, the result
 * covers no cell the grid does not have. Clamping the *cells* rather than the
 * rectangle is what makes that true in every direction: dragging up-left off the
 * grid pins the corner at 0 instead of growing a negative `x`. Without `bound` it
 * is the outline the pointer traced, which is what the layer draws.
 *
 * Rejected: clamping in `cellAt` (it stays total, `07` **Q6**), and leaving the
 * result unclamped (D-01 B), which writes columns nobody can see — the surprise
 * B-014 had to clean up. A grid with no columns or rows has no cell to clamp to;
 * the caller never mounts the layer there, and the bound is skipped rather than
 * producing a negative size.
 */
export function rectFrom(a: Cell, b: Cell, bound?: { columns: number; rows: number }): Rect {
  let [ax, ay] = a;
  let [bx, by] = b;
  if (bound !== undefined && bound.columns > 0 && bound.rows > 0) {
    const cx = (v: number) => Math.min(Math.max(v, 0), bound.columns - 1);
    const cy = (v: number) => Math.min(Math.max(v, 0), bound.rows - 1);
    [ax, bx, ay, by] = [cx(ax), cx(bx), cy(ay), cy(by)];
  }
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return { x, y, width: Math.abs(ax - bx) + 1, height: Math.abs(ay - by) + 1 };
}

const RECT_KEYS = ["height", "width", "x", "y"] as const;

/**
 * Whether a Selection's parameters are a rectangle: **exactly** the integers
 * `x`, `y`, `width`, `height`, and nothing else.
 *
 * Decided by the parameter *shape*, not the Selection's name. The editor builds
 * every control from `ParamSchema` (**E9**) and names no Selection type, so a
 * `selectionType === "rect"` check would be the first. A registry flag
 * ("draggable") was the other option, and rejected: it changes the Registry
 * contract, which is a big task, to say something the four parameters already say.
 * Exactly, because a Selection with a fifth parameter is not "a rectangle" and a
 * drag would leave that parameter unexplained.
 */
export function rectParams(schema: ParamSchema): boolean {
  const keys = Object.keys(schema).sort();
  return (
    keys.length === RECT_KEYS.length &&
    keys.every((k, i) => k === RECT_KEYS[i] && schema[k]!.type === "integer")
  );
}
