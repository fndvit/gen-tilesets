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
 * | `rect` drag      | no      | `04` §4.2 — a rectangle dragged to the edge is not silently resized   |
 * | `cellList` brush | yes     | a painted cell outside the grid can never be drawn, seen, or clicked  |
 *
 * The asymmetry follows from `04` §4.4's distinction: a `rect` states an
 * intention that survives the grid growing, where a `cellList` entry states a
 * specific cell. An unremovable-by-eye entry is the failure `06` §10.4's third
 * diagnostic describes, arrived at by painting instead of by resizing.
 */

import {
  cellAt,
  toRenderSpace,
  type BoxMetrics,
  type GridGeometry,
} from "@fndvit/gen-tilesets/render";

/** A painted cell. The wire shape `04` §4.4 gives `cellList`, and a tuple in the file. */
export type Cell = [number, number];

/**
 * The conversion into render space — `BoxMetrics`, `metricsOf`, `toRenderSpace` —
 * lived here until 0.6.0 and now lives in the package's `render/space.ts`, with its
 * reasoning. The keep-out tracker became its second caller, and two copies of
 * `07` §8.2's "single most likely place to get this wrong" is **R1**'s failure. It
 * is re-exported so this module's callers and tests are unchanged.
 */
export { metricsOf, toRenderSpace, type BoxMetrics } from "@fndvit/gen-tilesets/render";

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
