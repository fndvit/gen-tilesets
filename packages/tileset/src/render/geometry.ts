/**
 * Geometry — `07-render-contract.md` §5, §8.
 *
 * A map from grid space to render space, parameterized by `Wpx` and by `Layout`.
 *
 * **Invariant S10** — `cellBox` and `cellAt` are exported **pure functions**,
 * independent of the component. The component computes placement from them and
 * `09` draws every overlay from them; neither reimplements the arithmetic.
 *
 * Pure functions rather than component methods for three reasons (`08` §7): they
 * are what `07` **R15**'s geometry vector table tests, with no component mounted;
 * they are callable from a pointer handler that has no component reference; and a
 * method would tie the mapping's availability to a mounted instance when the
 * editor may want a rect before anything is drawn.
 *
 * **Invariant R1** — there is one implementation of the coordinate mapping. An
 * overlay that recomputed it would drift silently: the picture right, the
 * selection box a few pixels off, and nothing anywhere reporting it.
 */

import type { Layout } from "../types.js";

export interface CellBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Everything `07` §5 needs. `rows` and `columns` come from `config`, `Wpx` from the host. */
export interface GridGeometry {
  layout: Layout;
  rows: number;
  columns: number;
  /** The render box's width, in rendered px. */
  Wpx: number;
}

/**
 * `s = Wpx / referenceWidth`, derived from **width alone**. Height never affects
 * scale.
 *
 * `referenceWidth` is stored rather than derived for the reason `02` §7.2 gives:
 * the grid's design width is `columns * cellSize`, which exceeds
 * `referenceWidth` by the intentional bleed. A renderer computing
 * `s = Wpx / (columns * cellSize)` would make the bleed vanish and fit the grid
 * neatly — the outcome the design marks as wrong.
 */
export function scaleFactor(g: GridGeometry): number {
  return g.Wpx / g.layout.referenceWidth;
}

/** Design px. Exceeds `referenceWidth` by the bleed. */
export function gridWidth(g: GridGeometry): number {
  return g.columns * g.layout.cellSize;
}

/**
 * The grid is **horizontally centred**, and `originX` is negative whenever there
 * is bleed.
 *
 * Centring on the render box's centre axis produces the alignment the author
 * selected, automatically, as a consequence of parity — which is why `02` §7.3
 * can say the renderer never reads `horizontalAlignment`. Nothing here reads it.
 *
 * `originX <= 0` is guaranteed by the editor's derivation (`02` §7.1 corrects
 * parity **upward**), but a hand-written config can violate it and the result is
 * well-defined: a narrower grid, centred, with empty margins. `06` §10.4 makes
 * that an advisory diagnostic rather than an error.
 */
export function originX(g: GridGeometry): number {
  return (g.Wpx - scaleFactor(g) * gridWidth(g)) / 2;
}

/**
 * The grid is **top-anchored** and `yOffset` shifts it up, so `originY` is
 * negative for any non-zero `yOffset` and the top of row 0 falls above the render
 * box.
 *
 * This needs no special case: it is the ordinary clipping rule (**R9**) applied
 * to a negative origin.
 */
export function originY(g: GridGeometry): number {
  return -scaleFactor(g) * g.layout.yOffset * g.layout.cellSize;
}

/**
 * Forward: cell to rect — `07` §5.2, §8.1.
 *
 * **Invariant R5** — a function of `Layout`, `rows`, `columns`, and `Wpx` alone.
 * No asset is consulted, loaded, or measured, and no `TileState` is read. This is
 * what makes SSR emit complete geometry, makes assets lazily loadable in any
 * order, and means a missing asset leaves a hole in a laid-out grid rather than
 * collapsing it.
 *
 * **Invariant R6** — a cell box is defined by its four **edges**. Cell `(x, y)`'s
 * right edge is identically cell `(x+1, y)`'s left edge, **by construction**:
 * both evaluate `originX + s * (x+1) * cellSize`. Sizes are derived from edges;
 * edges are never derived from sizes.
 *
 * The failure that rule prevents is specific. Compute each cell's `left` and
 * `size` independently, round both, and adjacent cells either overlap by a
 * fraction or leave a sub-pixel gap. Sub-pixel gaps read as a faint grid of seams
 * across the whole background — highly visible against a flat backdrop, invisible
 * at some widths and obvious at others, and one of the harder things to attribute
 * after the fact.
 */
export function cellBox(g: GridGeometry, x: number, y: number): CellBox {
  const s = scaleFactor(g);
  const ox = originX(g);
  const oy = originY(g);
  const { cellSize } = g.layout;
  return {
    left: ox + s * x * cellSize,
    top: oy + s * y * cellSize,
    right: ox + s * (x + 1) * cellSize,
    bottom: oy + s * (y + 1) * cellSize,
  };
}

/** The cell box's centre in render space — what every transform is taken about (**R7**). */
export function cellCentre(box: CellBox): { cx: number; cy: number } {
  return { cx: (box.left + box.right) / 2, cy: (box.top + box.bottom) / 2 };
}

/**
 * Inverse: point to cell — `07` §8.2.
 *
 * `px` and `py` are **render-space** coordinates: rendered pixels, relative to the
 * render box's top-left corner. Not design px, not client or page coordinates.
 * Converting a pointer event into this space is the caller's job, and `07` §8.2
 * calls it "the single most likely place to get this wrong".
 *
 * **Total, and deliberately not bound-checked.** It may return negative
 * coordinates or coordinates at or beyond `columns` / `rows`. `04` §4.2 permits a
 * `rect` Selection to extend past the grid — "an author dragging a rectangle to
 * the grid edge should not have it silently resized" — so an editor authoring a
 * `rect` needs the out-of-grid coordinates the drag actually reached.
 *
 * Returning `null` outside the grid would lose information the caller cannot
 * recover and add a null branch to every call site, in a package that has twice
 * preferred to remove a case rather than handle it. Bounding is one comparison
 * and belongs to whoever knows whether it wants bounding (`07` **Q6**).
 */
export function cellAt(g: GridGeometry, px: number, py: number): { x: number; y: number } {
  const side = scaleFactor(g) * g.layout.cellSize;
  return {
    x: Math.floor((px - originX(g)) / side),
    y: Math.floor((py - originY(g)) / side),
  };
}

/**
 * The render box's natural height: the box that exactly contains the visible
 * grid, clipping row 0's top by `yOffset` and ending flush with the last row's
 * bottom edge (`07` §5.3).
 *
 * A **default, not a constraint** — `07` §7.3 makes vertical bleed the host's, by
 * giving the box less height than this.
 */
export function naturalHeight(g: GridGeometry): number {
  return scaleFactor(g) * (g.rows - g.layout.yOffset) * g.layout.cellSize;
}

/**
 * The natural aspect ratio — `08` §6.1, **S8**.
 *
 *     referenceWidth : (rows - yOffset) * cellSize
 *
 * A constant of `Layout` and `rows`, with `Wpx` cancelled out. Declaring this
 * rather than a height is what reserves correct space before anything is drawn,
 * on the server, in the initial HTML — and what keeps `07` §7.3's vertical bleed
 * reachable in one line of host CSS.
 */
export function naturalRatio(layout: Layout, rows: number): number {
  return layout.referenceWidth / ((rows - layout.yOffset) * layout.cellSize);
}
