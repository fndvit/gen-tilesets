/**
 * The one derivation in editor code — `02-generation-contract.md` §7.1.
 *
 * ```
 * n = ceil(referenceWidth / cellSize)
 * if parity(n) does not match horizontalAlignment: n += 1
 * columns = n
 * ```
 *
 * **Invariant E1** — several of the package's guarantees are *manufactured* here
 * and checked nowhere. Two of them are this function's:
 *
 * - `columns * cellSize >= referenceWidth`, so `originX <= 0` and there are never
 *   gutters at the viewport edges (`07` §5.2). Nothing checks it — `06` §10.4's
 *   fourth diagnostic is its shadow.
 * - `columns`' parity matches `horizontalAlignment`. Nothing checks that either
 *   — `06` §10.4's first diagnostic is its shadow.
 *
 * An editor that writes a file violating one has failed to meet the
 * specification, not merely produced awkward output. So `columns` is derived
 * here and written by the transitions of `document.ts`, and is **displayed,
 * never edited** (`09` §9.1): editing it directly would break the first
 * guarantee from inside the editor, which E1 forbids.
 */

import type { Layout } from "@tileset/core";

/**
 * **Parity is always corrected upward.** Rounding down would leave gaps at the
 * grid edges; rounding up produces symmetric bleed, which is the intended look
 * (`02` §7.1).
 *
 * `"column"` requires **odd** `columns` — the centre axis falls through a cell.
 * `"gutter"` requires **even** — the axis falls on a boundary.
 *
 * The renderer never reads `horizontalAlignment` (`02` §7.3). Centring the grid
 * on the render box's centre axis produces the selected alignment automatically,
 * as a consequence of the parity this function fixes. That is the whole of the
 * field's function.
 */
export function deriveColumns(
  referenceWidth: number,
  cellSize: number,
  horizontalAlignment: Layout["horizontalAlignment"],
): number {
  const n = Math.ceil(referenceWidth / cellSize);
  const wanted = horizontalAlignment === "column" ? 1 : 0;
  return n % 2 === wanted ? n : n + 1;
}

/**
 * The intentional bleed, in design px — `02` §7.2.
 *
 * `referenceWidth != columns * cellSize`, and the difference is the point:
 * a renderer that assumed a grid-width design would make the bleed vanish and
 * fit the grid neatly, "exactly the outcome the design marks as wrong".
 *
 * Displayed beside `columns` so the author can see what the derivation did.
 * Nothing reads it.
 */
export function bleed(referenceWidth: number, cellSize: number, columns: number): number {
  return columns * cellSize - referenceWidth;
}
