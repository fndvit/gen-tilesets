/**
 * Snapped edges and the draw list — ADR-006, `08` §13.
 *
 * `geometry.ts` is the **ideal** mapping: exact, fractional, and `Wpx`-relative.
 * This module is what a substrate can actually paint without opening a seam.
 *
 * `07` §5.6 (**R6**) forbids computing a cell's `left` and `size` independently
 * and rounding both, and then licenses the one alternative:
 *
 * > Any snapping — if a substrate needs it — is applied to the shared edge, so
 * > that both cells move together and the seam cannot open.
 *
 * That is exactly this. One array of edges per axis; cell `x`'s right edge and
 * cell `x+1`'s left edge are **the same array element**, not two expressions that
 * happen to agree. A gap between them is not unlikely, it is unrepresentable.
 *
 * **Snapping is in device pixels, not CSS pixels.** That is what also disposes of
 * the second seam cause, which no amount of correct geometry reaches: an asset
 * whose own outer edge sits on its viewBox boundary antialiases that edge into
 * transparency when it is rasterized into a box that is not a whole number of
 * device pixels. Land the box on the device grid and the asset's edge lands on it
 * too, fully covered.
 *
 * Pure, and deliberately so: `.svelte` files cannot be unit-tested in this repo,
 * so everything worth asserting about the fix lives here rather than in the
 * component.
 */

import type { Grid, TileState } from "../types.js";
import { originX, originY, scaleFactor, type GridGeometry } from "./geometry.js";
import { isIdentityTransform, sincos, type Matrix } from "./transform.js";

/**
 * One coordinate, in **whole device pixels**.
 *
 * `Math.round` rather than `floor` or `ceil`: it is the only choice that keeps
 * the snapped edge within half a device pixel of the ideal one, so the grid never
 * drifts from `cellBox` no matter how many columns it has.
 *
 * **Device pixels, not CSS pixels, and integers rather than a snapped CSS-px
 * float.** `Math.round(v * dpr) / dpr` looks equivalent and is not: at a DPR of 3
 * it is not exactly representable, so `left + (right - left) === right` fails by
 * an ulp and the guarantee this module exists to make degrades from *identical*
 * to *very close*. Integers keep it exact, and a substrate that wants CSS px
 * divides at the very end.
 */
export function snap(value: number, dpr: number): number {
  return Math.round(value * dpr);
}

/**
 * `columns + 1` vertical edges, in **device px**, integral.
 *
 * Indexed by grid line, not by cell: `xEdges[x]` is cell `x`'s left edge **and**
 * cell `x-1`'s right edge. Length `columns + 1`, so the last cell has a right
 * edge to read.
 *
 * The snap is applied per edge rather than accumulated, so error does not build
 * up across a row: every edge is within half a device pixel of `cellBox`'s, and
 * adjacent cells differ in width by at most one device pixel.
 */
export function xEdges(g: GridGeometry, dpr: number): number[] {
  const s = scaleFactor(g);
  const ox = originX(g);
  const out: number[] = [];
  for (let k = 0; k <= g.columns; k++) out.push(snap(ox + s * k * g.layout.cellSize, dpr));
  return out;
}

/** `rows + 1` horizontal edges, in device px. The vertical counterpart of `xEdges`. */
export function yEdges(g: GridGeometry, dpr: number): number[] {
  const s = scaleFactor(g);
  const oy = originY(g);
  const out: number[] = [];
  for (let k = 0; k <= g.rows; k++) out.push(snap(oy + s * k * g.layout.cellSize, dpr));
  return out;
}

/** Both axes at once, in device px, since every caller wants both. */
export interface SnappedGrid {
  x: number[];
  y: number[];
}

export function snappedGrid(g: GridGeometry, dpr: number): SnappedGrid {
  return { x: xEdges(g, dpr), y: yEdges(g, dpr) };
}

/**
 * One cell, ready to draw. Render space, in **device px**, every coordinate
 * integral.
 *
 * `matrix` is `null` for an identity cell — the overwhelmingly common case, and
 * the one a substrate can draw with a single unrotated blit.
 */
export interface DrawItem {
  /** `(tileId, assetId)` per `07` §4.1 — `assetKey`'s output. */
  key: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /**
   * The rect the substrate actually fills, **before** `matrix` is applied —
   * `blitRect`. Identical to the cell rect for every cell except a quarter-turned
   * one, where it is the cell rect's pre-image under the rotation.
   */
  bx: number;
  by: number;
  bw: number;
  bh: number;
  /** The cell centre — what **D11** and **R7** take every transform about. */
  cx: number;
  cy: number;
  /** `07` §6.2's affine six-tuple, or `null` when the cell is untransformed. */
  matrix: Matrix | null;
  alpha: number;
}

/**
 * The grid as a list of draw operations, in **row-major order** — `07` **R10**.
 *
 * `grid.cells` is stored row-major, so iterating it gives the paint order for
 * free, which is what `07` §7.4 predicts: "the correct behaviour is the free one
 * and any deviation costs effort." Later rows are lower on screen and read as
 * nearer the viewer, so painting them last is what anything with implied depth
 * wants.
 *
 * Empty cells (`02` **G4** — `tileId` or `assetId` null) are omitted rather than
 * emitted with a null key, so a consumer never has to branch on one.
 *
 * **No asset is consulted.** The list is complete before a single byte of image
 * data exists, which is `07` **R5**'s substance surviving ADR-006's break with
 * its letter: geometry is committed before resolution is attempted and is never
 * revised as a result of it. What ADR-006 gives up is only that `Wpx` and `dpr`
 * are now measured; what a cell's rect is, given them, still reads nothing.
 *
 * Coordinates are integral device px, so `dx + dw` is *exactly* the next cell's
 * `dx` — an integer identity, not a floating-point near-miss.
 */
export function drawList(
  g: GridGeometry,
  grid: Grid<TileState>,
  dpr: number,
  keyOf: (tileId: string, assetId: string) => string,
): DrawItem[] {
  const { x: ex, y: ey } = snappedGrid(g, dpr);
  const out: DrawItem[] = [];

  for (let i = 0; i < grid.cells.length; i++) {
    const cell = grid.cells[i]!;
    if (cell.tileId === null || cell.assetId === null) continue;

    const x = i % grid.columns;
    const y = Math.floor(i / grid.columns);
    const dx = ex[x]!;
    const dy = ey[y]!;
    const dw = ex[x + 1]! - dx;
    const dh = ey[y + 1]! - dy;
    const b = blitRect(cell, dx, dy, dw, dh);

    out.push({
      key: keyOf(cell.tileId, cell.assetId),
      x,
      y,
      dx,
      dy,
      dw,
      dh,
      bx: b.bx,
      by: b.by,
      bw: b.bw,
      bh: b.bh,
      cx: dx + dw / 2,
      cy: dy + dh / 2,
      matrix: isIdentityTransform(cell) ? null : cellMatrix(cell, dx, dy, dw, dh),
      alpha: cell.opacity,
    });
  }

  return out;
}

/**
 * The rect a substrate fills for this cell, **before** its transform is applied.
 *
 * For all but one case this is the cell rect, and the transform carries the
 * drawable off it as far as it likes — `07` §7.1 makes spilling the point of the
 * attribute set, and a 45deg drawable cannot cover its own cell's corners no
 * matter what rect it starts from.
 *
 * **The exception is a quarter turn, and it is the seam.** `07` **R7** says a
 * drawable at unit scale occupies exactly its cell box, and a quarter turn is
 * unit scale. But the rect it is applied to is the *snapped* one, and snapping
 * the two axes against different fractional origins routinely makes that rect
 * non-square by one device pixel — 133 x 132 where the ideal cell is square.
 * Rotating a 133 x 132 rect a quarter turn about its own centre yields a
 * 132 x 133 rect: half a device pixel of the cell is left uncovered down each
 * side, and the unrotated neighbour covers exactly its own cell, so the
 * shortfall shows as a backdrop hairline. That is why a *varying* rotation seams
 * and a constant 180deg does not — 180deg preserves the extents, 90deg
 * transposes them.
 *
 * So under a quarter turn the substrate fills the cell rect's **pre-image**: the
 * transposed rect about the same centre, which the rotation maps onto the cell
 * rect exactly. `cx` and `cy` may be half-integers, but every product here is
 * exact in binary floating point and `sincos` keeps the matrix exactly
 * axis-aligned, so the mapped corners are the snapped integer corners rather
 * than values near them.
 *
 * Scale is untouched: `S` is taken about the same centre after the transpose, so
 * a quarter-turned cell at `scale = 2` covers twice the cell box about its
 * centre, exactly as an unrotated one does.
 *
 * `07` §6.2's matrix is not modified by any of this. What changes is the rect it
 * is applied to.
 */
export function blitRect(
  attrs: TileState,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): { bx: number; by: number; bw: number; bh: number } {
  if (Math.abs(attrs.rotation % 180) !== 90) return { bx: dx, by: dy, bw: dw, bh: dh };
  const cx = dx + dw / 2;
  const cy = dy + dh / 2;
  return { bx: cx - dh / 2, by: cy - dw / 2, bw: dh, bh: dw };
}

/**
 * `07` §6.2's matrix, taken about the **snapped** cell's centre.
 *
 * `transformMatrix` in `transform.ts` takes a `CellBox`, which is the ideal
 * fractional rect. A transformed cell is drawn against its snapped rect, so its
 * centre is the snapped one — a transform taken about a centre half a device
 * pixel away from the box it is applied to would shear the drawable off its own
 * cell. The arithmetic is `transformMatrix`'s, restated against the rect that is
 * actually painted rather than duplicated: same `M = T(c) · R · S · T(-c)`.
 */
function cellMatrix(attrs: TileState, dx: number, dy: number, dw: number, dh: number): Matrix {
  const cx = dx + dw / 2;
  const cy = dy + dh / 2;
  const { sin, cos } = sincos(attrs.rotation);
  const sx = attrs.scaleX * attrs.scale;
  const sy = attrs.scaleY * attrs.scale;

  const a = sx * cos;
  const b = sx * sin;
  const c = -sy * sin;
  const d = sy * cos;

  return [a, b, c, d, cx - (a * cx + c * cy), cy - (b * cx + d * cy)];
}

/**
 * **R8**'s centre-crop, computed rather than declared.
 *
 * In the DOM substrate this is `object-fit: cover` and costs nothing: nothing is
 * measured and `07` §6.4's "the renderer never learns an aspect ratio" holds. A
 * canvas has no such property, so the source rect must be derived from the
 * asset's intrinsic size — the one place ADR-006 makes the renderer read
 * something about an asset. `07` §6.4's *rule* is broken; its *purpose* (no
 * geometry depends on an asset) is not, because the destination rect is already
 * fixed by `drawList` before this is called.
 *
 * Returns the largest centred source rect with the destination's aspect ratio,
 * which is what `cover` means.
 */
export function coverRect(
  naturalWidth: number,
  naturalHeight: number,
  dw: number,
  dh: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0 || dw <= 0 || dh <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(naturalWidth, 0), sh: Math.max(naturalHeight, 0) };
  }
  const want = dw / dh;
  const have = naturalWidth / naturalHeight;

  if (have > want) {
    // Source is wider: crop its sides.
    const sw = naturalHeight * want;
    return { sx: (naturalWidth - sw) / 2, sy: 0, sw, sh: naturalHeight };
  }
  // Source is taller (or equal): crop its top and bottom.
  const sh = naturalWidth / want;
  return { sx: 0, sy: (naturalHeight - sh) / 2, sw: naturalWidth, sh };
}
