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
 * ## The drawn tile, not the lattice cell
 *
 * A cell is hidden when its **drawn tile at rest** meets a keep-out rect: the
 * tile's axis-aligned bounding box after its generated scale, rotation and
 * translation. A tile moved, scaled or turned over a heading disappears, wherever
 * its home cell is; one whose home cell is under the heading but which was moved
 * clear of it stays.
 *
 * **Until 0.8.0 the test was the lattice square**, and that was declined-for
 * reasons worth keeping: it is the simpler rule, and "it does not change when an
 * attribute does" was what kept a future animated transform from turning a
 * per-layout mask into a per-frame one. Translation broke the first — a tile three
 * cells off its home sat visibly on the text while its empty home square was
 * hidden, which no reader would call predictable. The second is kept by a
 * narrower rule: the mask reads the **rest pose**, the generated transform, which
 * is fixed per grid. An animation never reaches it. The mask still changes only
 * when the layout, the rects or the grid do, and a hover effect that grows a tile
 * over text does not hide it.
 *
 * **The bounding box, not the exact quad.** For translation and scale it is exact.
 * For a rotation off the quarter turns it is conservative — a 45-degree tile is
 * hidden when a rect touches the empty corner of its box — which errs on the side
 * of the text, costs four comparisons, and is the same box `maxSpill` culls by. An
 * exact rotated-square test is the upgrade if over-hiding is ever reported.
 *
 * **Scale and rotation spill are covered too**, not only translation: the reason
 * is the same. Before 0.8.0 `padding` was the knob for a design whose tiles
 * spilled; it is now only clearance.
 *
 * **To the pixel.** The bounds take the translation the painter took —
 * `translationDev`'s whole device px on that substrate's cell — and sit on the
 * substrate's own lattice, so a tile is hidden exactly when its pixels would have
 * met the rect.
 */

import type { Grid } from "../types.js";
import { latticeRange, type Lattice } from "./geometry.js";
import type { RenderRect } from "./space.js";
import {
  drawnHalfExtents,
  isIdentityTransform,
  maxSpill,
  translationDev,
  type TransformAttributes,
  type Translation,
} from "./transform.js";

/**
 * One byte per cell, row-major like `grid.cells`: `1` hides the cell.
 *
 * A byte array rather than a `Set` of indices, because every consumer asks one
 * question — "is cell `i` hidden?" — in a loop over cells, and the array answers
 * it with an index.
 */
export type OcclusionMask = Uint8Array;

/**
 * Each cell's drawn tile at rest, in **cells**, in the shape the mask reads it —
 * the part of the test that depends on the grid and not on the width, computed
 * once per generation beside `maxSpill`.
 */
export interface DrawnTiles {
  /** Per cell, `drawnHalfExtents`. `0.5` for an untransformed tile. */
  halfW: Float64Array;
  halfH: Float64Array;
  /** Per cell, `translateX`/`translateY`, exact — rounded per substrate at mask time. */
  translateX: Float64Array;
  translateY: Float64Array;
  /** `maxSpill(grid)`: how far beyond a rect a home cell can be and still reach it. */
  spill: number;
  /**
   * Whether any cell is transformed or translated. `false` is the fast path: every
   * drawn tile is its lattice square, and the mask is the lattice rule, byte for
   * byte.
   */
  transformed: boolean;
}

export function drawnTiles(grid: Grid<TransformAttributes & Translation>): DrawnTiles {
  const n = grid.cells.length;
  const out: DrawnTiles = {
    halfW: new Float64Array(n),
    halfH: new Float64Array(n),
    translateX: new Float64Array(n),
    translateY: new Float64Array(n),
    spill: maxSpill(grid),
    transformed: false,
  };
  for (let i = 0; i < n; i++) {
    const cell = grid.cells[i]!;
    const { halfW, halfH } = drawnHalfExtents(cell);
    out.halfW[i] = halfW;
    out.halfH[i] = halfH;
    out.translateX[i] = cell.translateX;
    out.translateY[i] = cell.translateY;
    if (cell.translateX !== 0 || cell.translateY !== 0 || !isIdentityTransform(cell)) {
      out.transformed = true;
    }
  }
  return out;
}

/**
 * The mask for `rects` on `lattice`.
 *
 * Each rect, grown by `padding` CSS px, hides the cells whose drawn tile (see
 * the header) it meets with positive area — so a rect only touching an edge hides
 * nothing. Rects are OR'd, so overlapping elements need no special case.
 *
 * `tiles` is the grid's {@link drawnTiles}, and `cellDev` the device-px cell of
 * the substrate that painted `lattice`, for the translation's rounding. Omitted,
 * every tile is taken to be its lattice square — the rule before 0.8.0.
 *
 * **A rect of zero area is ignored, and that is tested before padding.** An
 * element with `display: none`, or one detached since it was resolved, reports a
 * `0 x 0` rect at the viewport origin; padded first, it would hide a block of
 * cells in the corner for an element that is not there.
 *
 * **Cost.** Untransformed, O(K + cells claimed): the range is arithmetic, so the
 * cost is the cells marked and never the grid. Transformed, each rect is grown by
 * the grid's spill to find the home cells whose tile could reach it, and only
 * those are tested — O(K x (cells under the rect + a spill-wide border)). One
 * far-translated tile widens that border for every rect, the same shared-margin
 * cost culling pays.
 */
export function occlusionMask(
  lattice: Lattice,
  columns: number,
  rows: number,
  rects: readonly RenderRect[],
  padding: number,
  drawn?: { tiles: DrawnTiles; cellDev: number },
): OcclusionMask {
  const mask = new Uint8Array(columns * rows);
  const tiles = drawn !== undefined && drawn.tiles.transformed ? drawn.tiles : null;
  const { originX: ox, originY: oy, pitch: p } = lattice;

  for (const r of rects) {
    if (!(r.right > r.left && r.bottom > r.top)) continue;
    const left = r.left - padding;
    const top = r.top - padding;
    const right = r.right + padding;
    const bottom = r.bottom + padding;

    if (tiles === null) {
      const { x0, x1, y0, y1 } = latticeRange(lattice, columns, rows, { left, top, right, bottom });
      for (let y = y0; y < y1; y++) {
        mask.fill(1, y * columns + x0, y * columns + x1);
      }
      continue;
    }

    // Only a home cell within `spill` cells of the rect can have a tile that
    // reaches it -- that is what `spill` means -- so the candidates are the
    // lattice range of the rect grown by it, and the rest of the grid is never
    // visited.
    const reach = tiles.spill * p;
    const { x0, x1, y0, y1 } = latticeRange(lattice, columns, rows, {
      left: left - reach,
      top: top - reach,
      right: right + reach,
      bottom: bottom + reach,
    });
    const cellDev = drawn!.cellDev;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * columns + x;
        if (mask[i] === 1) continue;
        // The translation the painter used, back in cells. Written as
        // `x + (0.5 - halfW) + t` so an untransformed tile's left edge is
        // `ox + x * p` exactly -- the lattice square, to the bit.
        const { tx, ty } = translationDev(
          { translateX: tiles.translateX[i]!, translateY: tiles.translateY[i]! },
          cellDev,
        );
        const cl = ox + (x + (0.5 - tiles.halfW[i]!) + tx / cellDev) * p;
        const cr = ox + (x + (0.5 + tiles.halfW[i]!) + tx / cellDev) * p;
        const ct = oy + (y + (0.5 - tiles.halfH[i]!) + ty / cellDev) * p;
        const cb = oy + (y + (0.5 + tiles.halfH[i]!) + ty / cellDev) * p;
        if (Math.min(cr, right) - Math.max(cl, left) > 0 && Math.min(cb, bottom) - Math.max(ct, top) > 0) {
          mask[i] = 1;
        }
      }
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
