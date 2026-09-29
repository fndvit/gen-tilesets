/**
 * The keep-out mask — which cells to hide so that page content stays readable.
 *
 * ## A render-space channel, not a config rewrite
 *
 * `RESPONSIVE-HOSTING.md` Route B measured the same rects and **appended clearing
 * Operations to the config**, then regenerated. That was rejected for what it
 * costs: a full `generate()` on every resize, a file that stopped being the whole
 * story, and the one function in the package flowing from render back into the
 * engine. This module keeps every one of those intact by never touching the
 * config. The grid is generated once, exactly as before, and the mask is a
 * separate per-cell boolean the substrate reads when it paints.
 *
 * So `generate()`'s output for an unchanged `(config, seed, loadSalt)` is
 * byte-identical with or without a mask, **R12**'s "a resize is a pure rescale"
 * still holds, and a cell uncovered at another width comes back as the same tile
 * — not because a hash was re-evaluated to the same value, but because nothing
 * was re-evaluated at all.
 *
 * Also rejected: a CSS `clip-path`/`mask-image` with holes at the element rects.
 * It cuts tiles in half at the rect's edge, where the brief is *whole tiles
 * hidden*; snapping its holes to the lattice would rebuild this mask, less
 * inspectably, and leave no per-cell hook for a later fade.
 *
 * ## The lattice cell, not the painted bounds
 *
 * A cell is hidden when its **lattice square** meets a keep-out rect. A tile
 * scaled past its cell can still spill over text from a neighbouring cell; the
 * painted-bounds test would catch that, and was declined for the simpler and more
 * predictable rule — the hidden region is exactly the cells under the element,
 * and it does not change when an attribute does. That last property is what keeps
 * a future animated transform from turning a per-layout mask into a per-frame one.
 * `padding` is the knob for a design whose tiles spill.
 */

import { latticeRange, type Lattice } from "./geometry.js";
import type { RenderRect } from "./space.js";

/**
 * One byte per cell, row-major like `grid.cells`: `1` hides the cell.
 *
 * A byte array rather than a `Set` of indices, because every consumer asks one
 * question — "is cell `i` hidden?" — in a loop over cells, and the array answers
 * it with an index.
 */
export type OcclusionMask = Uint8Array;

/**
 * The mask for `rects` on `lattice`.
 *
 * Each rect, grown by `padding` CSS px, claims the cells whose lattice square it
 * meets with positive area (`latticeRange`) — so a rect only touching an edge
 * claims nothing. Rects are OR'd, so overlapping elements need no special case.
 *
 * **A rect of zero area is ignored, and that is tested before padding.** An
 * element with `display: none`, or one detached since it was resolved, reports a
 * `0 x 0` rect at the viewport origin; padded first, it would hide a block of
 * cells in the corner for an element that is not there.
 *
 * O(K + cells claimed): the range is arithmetic, so the cost is the cells marked
 * and never the grid.
 */
export function occlusionMask(
  lattice: Lattice,
  columns: number,
  rows: number,
  rects: readonly RenderRect[],
  padding: number,
): OcclusionMask {
  const mask = new Uint8Array(columns * rows);
  for (const r of rects) {
    if (!(r.right > r.left && r.bottom > r.top)) continue;
    const { x0, x1, y0, y1 } = latticeRange(lattice, columns, rows, {
      left: r.left - padding,
      top: r.top - padding,
      right: r.right + padding,
      bottom: r.bottom + padding,
    });
    for (let y = y0; y < y1; y++) {
      mask.fill(1, y * columns + x0, y * columns + x1);
    }
  }
  return mask;
}

/** Whether two masks hide the same cells. */
export function sameMask(a: OcclusionMask | null, b: OcclusionMask | null): boolean {
  if (a === b) return true;
  if (a === null || b === null || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * `next`, unless it hides exactly what `prev` does — then `prev`, by identity.
 *
 * **This is where the lattice's hysteresis is collected.** The measured rects move
 * on every frame of a resize, while the mask changes only when one of them crosses
 * a cell edge. Handing back the previous object for an unchanged mask means a
 * reactive consumer sees no change at all, so the DOM substrate writes no
 * attribute and the canvas does not repaint for a mask that did not move.
 */
export function stableMask(prev: OcclusionMask | null, next: OcclusionMask): OcclusionMask {
  return prev !== null && sameMask(prev, next) ? prev : next;
}
