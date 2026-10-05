/**
 * The uniform square cell, and the split between raster and presentation —
 * `SUBPIXEL-GEOMETRY.md`, *The recommendation*.
 *
 * `geometry.ts` is the **ideal** mapping: exact, fractional, and `Wpx`-relative.
 * This module quantises it to whole device pixels in the one way that leaves a
 * cell square, and reports where the residual went.
 *
 * ## Why the cell is quantised once rather than per edge
 *
 * The rejected alternative — `edges.ts`'s per-edge snapping, attempt 1 — snapped
 * every grid line independently. A shared edge was literally the same array
 * element, so a gap was unrepresentable and seams measured 0%; that part worked
 * and this module keeps it. What did not work is that a *cell* pairs `xEdges[x]`
 * with `yEdges[y]` — different members of two independently snapped sequences —
 * and so comes out 133 x 132 where the ideal cell is square.
 *
 * `07` **R8** then answers that half pixel with a centre-crop, and a crop against
 * a curve tangent to its box is a **flat chord**: `2 * sqrt(r^2 - (r - c)^2)`,
 * which for a half-pixel shave on a 190 px cell is **19.5 px** — a 39x
 * amplification, and the defect the whole investigation started from.
 *
 * One integer for both axes removes it at the source:
 *
 *     cellDev = round(s * cellSize * dpr)      // ONE integer, both axes
 *
 * A cell is now square *by construction*, so `coverRect` and `object-fit: cover`
 * both crop a square asset into a square box **by nothing**. No crop code changes
 * at all — the crop was never wrong, the rect it was given was.
 *
 * **R6** survives by a shorter argument than the one it replaces: edge `k` is
 * still `originXDev + k * cellDev`, one number serving as cell `k-1`'s right edge
 * and cell `k`'s left edge, so a gap is still unrepresentable — and now the widths
 * are equal as well as adjacent.
 *
 * ## Where the residual goes
 *
 * Quantising a fractional ideal cell has to put the remainder somewhere, and it
 * can only be **assigned**, never discarded. Three of the four places are a
 * reported defect:
 *
 *     into the cells   per-edge snapping -- the chord above
 *     off the edges    `ceil`: R9 clips the overhang, up to one device pixel per
 *                      cell -- 37 CSS px per side on a 76-column grid
 *     into a gutter    `round` presented at the snapped width: the page backdrop
 *                      shows through a band meant to be full-bleed, at 550 of
 *                      1101 measured widths
 *
 * Those three are ranked for the substrate that has to *fit* its box. The DOM
 * substrate does not: it has already given the residual to the box, so the row
 * that matters to it is the third one — and `domGeometry` below takes the second
 * deliberately in order to make the third unrepresentable. See its comment.
 *
 * There is no fourth place **while one coordinate system does two jobs**:
 * rasterising the grid and fitting the layout box. Splitting them produces one —
 * the presentation scale of a single, already-rasterised bitmap, where no internal
 * edges exist to seam. That is what `presentScale` and `presentedWidthCss` are
 * for, and it is the canvas substrate's whole mechanism.
 *
 * Pure, and deliberately so: `.svelte` files cannot be unit-tested in this repo,
 * so everything worth asserting about the fix lives here rather than in the
 * component.
 */

import type { Grid, TileState } from "../types.js";
import {
  alignFraction,
  originX,
  scaleFactor,
  type GridGeometry,
  type Lattice,
} from "./geometry.js";
import { isIdentityTransform, sincos, translationDev, type Matrix } from "./transform.js";

/**
 * Everything a substrate needs in order to draw the uniform grid, plus the
 * numbers that say where the residual landed.
 *
 * Device px throughout except the two `Css` fields, which are what a stylesheet
 * is handed.
 */
export interface UniformGeometry {
  /** `s * cellSize * dpr` — fractional, and the thing being quantised. */
  idealCell: number;
  /**
   * The quantised side. Every cell is exactly this, on **both** axes.
   *
   * `Math.round` rather than `ceil`: `ceil` exists only to guarantee overhang so
   * **R9** hides a gutter, and under the ideal presentation there is no gutter to
   * hide — a gutter is unrepresentable there, because the presented width *is* the
   * ideal width. `round` also halves the residual.
   *
   * `max(1, …)` because a grid narrower than one device pixel per cell is
   * degenerate rather than an error, and a zero would make every edge coincide.
   */
  cellDev: number;
  /** The grid's width in the raster. Integral by construction. */
  gridWidthDev: number;
  /**
   * `yOffset`'s shift, **rounded to a whole device pixel** like everything else
   * here. An unrounded origin would put every horizontal edge back on a fraction
   * and undo the entire exercise.
   */
  originYDev: number;
  /**
   * The raster's height, derived from the **snapped** origin rather than from
   * `yOffset` directly:
   *
   *     rasterHeightDev = rows * cellDev + originYDev        // = the last y edge
   *
   * `(rows - yOffset) * cellDev` looks equivalent and is not. `originYDev` is
   * rounded, so for a fractional `yOffset` the two differ by up to half a device
   * pixel and the last row lands just inside or just outside — either a hairline
   * of backdrop under the bottom row or a shaved bottom row, which is the class of
   * defect this module exists to remove. Reading the height off the edge
   * arithmetic cannot disagree with the edge arithmetic.
   */
  rasterHeightDev: number;
  /**
   * `idealCell / cellDev` — the single isotropic scale the presented canvas is
   * given, and the entire residual under the ideal presentation.
   *
   * Bounded by `1 +/- 1 / (2 * cellDev)`, which is only a comfortable bound while
   * `cellDev` is: the footer preset at DPR 1 in a 341 px box has `cellDev = 4` and
   * reaches **12.17%**. Measured there, with **zero gaps** — the seamlessness holds
   * across the whole span of cell sizes this layout produces, 4 device px to 190.
   * It is *soft* at 4 px, which is the `1 / cellDev` law and a separate axis.
   *
   * Identically 1 at any width where nothing has to be rounded.
   */
  presentScale: number;
  /**
   * What the canvas is given in CSS px: the **ideal** grid width straight out of
   * `geometry.ts`, fractions and all — not `gridWidthDev / dpr`.
   *
   * The two differ by exactly the residual, and handing over the ideal one *is*
   * the mechanism. A disagreement between this and `s * columns * cellSize` would
   * mean the raster and the presentation had drifted apart, which is the one
   * failure mode the split introduces that the old geometry could not have.
   */
  presentedWidthCss: number;
  /**
   * The ideal fractional left offset — `originX(g)`, negative whenever the author
   * designed bleed. What the presented canvas is nudged by, so the bleed presented
   * is the bleed designed, to the pixel.
   */
  originXCss: number;
  /**
   * The grid centred in the box at an integer origin, so an integer origin plus
   * an integer pitch makes every edge a whole device pixel.
   *
   * Under canvas this is not used and the draw list is passed 0: there is no box
   * to centre in, because the canvas *is* the grid. The centring moved to the
   * presentation, where it is done at the ideal fractional `originXCss`.
   *
   * **Its sign is two-valued, and that is why the DOM substrate does not read
   * it.** `cellDev` is `round`ed, so the grid is sometimes wider than the box
   * (negative — the grid overhangs and **R9** clips it) and sometimes narrower
   * (positive — a gutter shows the page backdrop through a band meant to be full
   * bleed). Half of all widths gutter on a zero-bleed design. `domGeometry`
   * exists to remove that half; this field is kept because it is the honest
   * centring of *this* cell, and a host doing its own snapped layout wants it.
   */
  originXDev: number;
}

export function uniformGeometry(g: GridGeometry, dpr: number): UniformGeometry {
  const s = scaleFactor(g);
  const idealCell = s * g.layout.cellSize * dpr;
  const cellDev = Math.max(1, Math.round(idealCell));

  const gridWidthDev = g.columns * cellDev;
  const originYDev = -Math.round(g.layout.yOffset * cellDev);

  return {
    idealCell,
    cellDev,
    gridWidthDev,
    originYDev,
    rasterHeightDev: g.rows * cellDev + originYDev,
    presentScale: idealCell / cellDev,
    presentedWidthCss: s * g.columns * g.layout.cellSize,
    originXCss: originX(g),
    originXDev: pinnedOriginXDev(g, cellDev, dpr),
  };
}

/**
 * The grid's left edge at an integer device pixel, pinned the way `alignX` says.
 *
 * **Fluid always centres**, whatever `alignX` is. In exact arithmetic the design
 * box is the render box and every pin agrees, but a quantised cell makes the grid
 * a few device px wider or narrower than its ideal, and centring is the one pin
 * that splits that residual between the two sides instead of handing it all to
 * one — `domGeometry`'s comment is about why a one-edged residual is the worse
 * defect.
 *
 * Fixed pins the **design box** (`referenceWidth / cellSize` cells) and then
 * places the grid inside it with its designed bleed. At `"center"` that is the
 * original expression, kept verbatim so an unchanged host moves by nothing.
 */
function pinnedOriginXDev(g: GridGeometry, cellDev: number, dpr: number): number {
  const b = g.sizing === "fixed" ? alignFraction(g.alignX, 0.5) : 0.5;
  if (b === 0.5) return Math.round((g.Wpx * dpr - g.columns * cellDev) / 2);
  const refCells = g.layout.referenceWidth / g.layout.cellSize;
  return Math.round(b * (g.Wpx * dpr - refCells * cellDev) + ((refCells - g.columns) * cellDev) / 2);
}

/**
 * The vertical counterpart: shift a top-anchored origin so the grid's
 * `heightDev` sits in the render box the way `alignY` says.
 *
 * Against the **quantised** height, not `naturalHeight`: when the host sets no
 * height the box is exactly `heightDev` tall (it takes its height from it), so the
 * shift is exactly zero and there is no feedback between the height a substrate
 * reports and the shift it is given.
 */
function alignedOriginYDev(
  g: GridGeometry,
  topDev: number,
  heightDev: number,
  dpr: number,
): number {
  const b = alignFraction(g.alignY, 0);
  if (b === 0 || g.Hpx === undefined) return topDev;
  const shift = Math.round(b * (g.Hpx * dpr - heightDev));
  // A zero shift returns `topDev` itself: `-0 + 0` is `+0`, and a box at its own
  // height should place its cells by exactly the numbers a top-aligned one does.
  return shift === 0 ? topDev : topDev + shift;
}

/**
 * How the canvas is presented once it rasterises only the columns that can be
 * seen — the split, restricted to a column range.
 *
 * "The canvas *is* the grid" becomes "the canvas is the grid's visible columns".
 * Everything the split argued still holds of it: the raster is an exact multiple
 * of `cellDev` wide, it is presented at the ideal fractional width of those
 * columns, and so the residual is still one isotropic resample of one bitmap. What
 * changes is the size of the bitmap. Under `"fixed"` a 76-column grid on a phone
 * shows about eight of them, and rasterising the rest would put a 10k-device-px
 * canvas behind a 375 px box — past iOS's canvas area budget at DPR 3.
 *
 * With the full range this is `UniformGeometry`'s presentation exactly:
 * `widthCss` is `presentedWidthCss` and `leftCss` is `originXCss`, by the same
 * expressions.
 */
export interface CanvasPresentation {
  x0: number;
  x1: number;
  /** `(x1 - x0) * cellDev`, at least 1. */
  rasterWidthDev: number;
  /** The CSS width the canvas is given: the ideal width of its columns. */
  widthCss: number;
  /** The canvas's left edge in the box: `originX` plus the culled columns. */
  leftCss: number;
  /**
   * The vertical alignment shift, in CSS px. Applied with `position: relative;
   * top`, which moves the canvas **without changing the height its wrapper takes
   * from it** — a margin would, and a bottom-aligned margin is then a fixed point
   * at any value.
   */
  topCss: number;
  /** The lattice these cells are presented on — what the keep-out mask reads. */
  lattice: Lattice;
}

export function canvasPresentation(
  g: GridGeometry,
  u: UniformGeometry,
  dpr: number,
  range: { x0: number; x1: number },
): CanvasPresentation {
  const s = scaleFactor(g);
  const pitch = s * g.layout.cellSize;
  const n = range.x1 - range.x0;
  const ox = originX(g);
  // `height: auto` from the intrinsic ratio: widthCss * rasterHeight / rasterWidth,
  // which reduces to this with no dependence on the range.
  const heightCss = (u.rasterHeightDev * u.presentScale) / dpr;
  const b = alignFraction(g.alignY, 0);
  const topCss = b === 0 || g.Hpx === undefined ? 0 : b * (g.Hpx - heightCss);
  return {
    x0: range.x0,
    x1: range.x1,
    rasterWidthDev: Math.max(1, n * u.cellDev),
    widthCss: s * n * g.layout.cellSize,
    leftCss: range.x0 === 0 ? ox : ox + range.x0 * pitch,
    topCss,
    lattice: { originX: ox, originY: topCss + (u.originYDev * u.presentScale) / dpr, pitch },
  };
}

/**
 * What the DOM substrate places a cell with — `domGeometry`'s output.
 *
 * Device px throughout, every field an integer, and deliberately only four of
 * them: this substrate has no raster and no presentation, so `UniformGeometry`'s
 * `presentScale` and `presentedWidthCss` would be numbers with no consumer, and a
 * field with no consumer is a field that drifts.
 */
export interface DomGeometry {
  /** `ceil(idealCell)`. Every cell is exactly this, on **both** axes. */
  cellDev: number;
  /**
   * The grid centred in the box. **`<= 0` for any design with non-negative
   * bleed**, which is the whole guarantee on this axis: the grid covers its box
   * and **R9** clips the overhang, so no gutter can open at the sides.
   */
  originXDev: number;
  /**
   * `yOffset`'s shift, rounded to a whole device pixel like everything else here.
   * `0` when `yOffset` is 0, negative otherwise (**R9** — the top of row 0 falls
   * above the box).
   *
   * `round` and not `floor`, even though `floor` would guarantee overhang the way
   * `ceil` does horizontally. **The vertical axis does not need the guarantee**,
   * because `gridHeightDev` below is what the box's height is *taken from* rather
   * than compared against: there is no independently-declared height left for this
   * to fall short of. `round` keeps row 0's clip closest to the designed
   * `yOffset`, and leaves `uniformGeometry` and this function differing in exactly
   * one thing — the cell.
   */
  originYDev: number;
  /**
   * The **last horizontal edge** of the top-anchored grid, `rows * cellDev +
   * originYDev` before any `alignY` shift, and therefore the height of the visible
   * grid. This is what the DOM box takes its height from — which is why it ignores
   * `alignY`: the shift is measured against the box, so a height that moved with
   * the shift would feed back into it.
   *
   * Read off the edge arithmetic rather than from `yOffset`, for the reason
   * `UniformGeometry.rasterHeightDev`'s comment gives at length: `originYDev` is
   * rounded, so `(rows - yOffset) * cellDev` differs from this by up to half a
   * device pixel and the last row lands just inside or just outside. A height that
   * comes from the same expression as the cell placement cannot disagree with the
   * cell placement.
   *
   * **This field is the fix for the bottom row.** The box used to declare
   * `naturalRatio` — the *ideal*, unquantised height — while the grid inside it was
   * quantised, and because the grid is top-anchored the whole of that disagreement
   * landed on the bottom edge: up to `rows` device px of the bottom row shaved off,
   * which on a 10-row grid with a 15 device px cell is most of the row. Horizontally
   * the same residual is centred and each side gets half; vertically it is one-edged.
   * That asymmetry is why `ceil` reads as acceptable on one axis and not on the other,
   * and why the answer here is not a different rounding but a box that measures its
   * own contents.
   */
  gridHeightDev: number;
}

/**
 * The **DOM** substrate's quantisation of the same ideal cell — everything
 * `domPlacement` needs, and nothing else.
 *
 * A separate function rather than a mode on `uniformGeometry`, because the two
 * differ in exactly one thing and it is not a setting: **which way the remainder
 * is allowed to fall.** Both quantise the one ideal mapping in `geometry.ts`, so
 * **R1** is untouched — there is still a single coordinate system, quantised twice
 * for two presentations that want different guarantees from it.
 *
 * ## Why `ceil` here and `round` there
 *
 * `round` is right for canvas: the presentation undoes the quantisation exactly,
 * so what matters is the residual's *magnitude*, and `round` halves it —
 * `presentScale` is then bounded by `1 +/- 1 / (2 * cellDev)`.
 *
 * The DOM substrate has no presentation to undo anything. It has already given the
 * residual to the **box**, so the magnitude buys it nothing and the **sign** is
 * the whole of what it can feel:
 *
 *     gridWidthDev > Wpx * dpr    the grid overhangs, R9 clips it   -- wanted
 *     gridWidthDev < Wpx * dpr    a gutter shows the page backdrop  -- the defect
 *
 * Under `round` the sign alternates with width. Swept over 3,000 widths of the
 * 76-column zero-bleed footer preset, **about half of them gutter** — 1470/3000 at
 * DPR 1, 1450 at DPR 2, 1446 at DPR 3 — by up to **19 device px per side**, down
 * both edges of a grid whose whole point is to be full bleed. `ceil` is the
 * smallest integer cell that cannot fall short, so the same sweep gutters at
 * **0/3000 widths at every DPR**.
 *
 * **The cost, which is real and is a shift rather than a saving.** The clip's range
 * goes from a signed `[-19, +19]` device px per side to `[0, 38]`: the worst-case
 * cut doubles, about 2.5 columns at DPR 1 on that preset. The jump at a width where
 * the cell steps by one device pixel does not go away either — that is `columns`
 * device px of grid width arriving at once, and it is intrinsic to an integer cell.
 * What goes away is the half of it that showed backdrop.
 *
 * **This is not attempt 3.** That applied `ceil` to a substrate that had to *fit*
 * its box, where clipping five columns off each end was pure loss. Here the grid
 * already does not fit — `SUBPIXEL-GEOMETRY.md`'s *The recommendation* states that
 * as the DOM substrate's accepted trade for per-cell hit-testing — so `ceil` is not
 * introducing a clip, it is choosing the clip over the gutter.
 *
 * The cell must track the **design's** scale, so it is `ceil(idealCell)` and never
 * `ceil(Wpx * dpr / columns)`. The second looks like the tighter fit and is
 * `geometry.ts`'s named error: it makes the author's designed bleed vanish.
 *
 * ## The two axes are not symmetric, and only one of them wants this
 *
 * Everything above is about the **horizontal** axis, where the box's width is the
 * host's and cannot be negotiated. Vertically the box's height is the component's
 * own — it used to be declared from `naturalRatio`, the *ideal* unquantised height,
 * and since the grid is top-anchored the entire vertical residual landed on the
 * bottom edge as a shaved bottom row rather than being split between two edges.
 * `ceil` made that residual one-signed and as large as `rows` device px, which on a
 * 10-row grid with a 15 device px cell is most of the row.
 *
 * So the vertical answer is not a rounding at all: it is `gridHeightDev`, which the
 * box takes its height *from*. There is then nothing for the grid to fall short of
 * or overhang, and `originYDev` can stay `round` — see its comment.
 */
export function domGeometry(g: GridGeometry, dpr: number): DomGeometry {
  const idealCell = scaleFactor(g) * g.layout.cellSize * dpr;
  // `max(1, ...)` for `uniformGeometry`'s reason: a grid narrower than one device
  // pixel per cell is degenerate rather than an error, and a zero would make every
  // edge coincide.
  const cellDev = Math.max(1, Math.ceil(idealCell));

  const originYDev = -Math.round(g.layout.yOffset * cellDev);

  // The last horizontal edge of the *top-anchored* grid, and the height the box is
  // given. Not `(rows - yOffset) * cellDev` -- see the field's comment.
  const gridHeightDev = g.rows * cellDev + originYDev;

  return {
    cellDev,
    originXDev: pinnedOriginXDev(g, cellDev, dpr),
    originYDev: alignedOriginYDev(g, originYDev, gridHeightDev, dpr),
    gridHeightDev,
  };
}

/** The DOM substrate's lattice in CSS px — every cell is placed on exactly this. */
export function domLattice(d: DomGeometry, dpr: number): Lattice {
  return { originX: d.originXDev / dpr, originY: d.originYDev / dpr, pitch: d.cellDev / dpr };
}

/**
 * One cell, ready to draw. Render space, device px, every coordinate integral.
 *
 * There is no `bw`/`bh` beside `dx`/`dy`, and no `blitRect` to produce them.
 * `edges.ts` needed that pair because a quarter turn applied to a 133 x 132 rect
 * yields 132 x 133 and leaves half a device pixel of the cell uncovered down each
 * side — so the substrate had to fill the cell rect's transposed *pre-image*. A
 * square rect quarter-turned **is** the same rect, so the uniform cell removes the
 * special case rather than needing it.
 *
 * That was recorded as a falsifiable prediction before it was read, and the
 * reading confirmed it: the 90-degree panel is indistinguishable from the identity
 * panel (`SUBPIXEL-GEOMETRY.md`, attempt 14).
 */
export interface UniformItem {
  /** `(tileId, assetId)` per `07` §4.1 — `assetKey`'s output. */
  key: string;
  /** `y * columns + x`, the cell's index in `grid.cells` — what the keep-out mask is indexed by. */
  index: number;
  x: number;
  y: number;
  /**
   * The cell's top-left in the raster. Integral: a multiple of `cellDev` off the
   * origin, plus the cell's translation in whole device px (`translationDev`).
   */
  dx: number;
  dy: number;
  /** The cell's side. `cellDev` for every cell — the whole point. */
  side: number;
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
 * data exists — `07` **R5**'s substance: geometry is committed before resolution
 * is attempted and is never revised as a result of it. That is why a missing asset
 * leaves a hole in a laid-out grid rather than collapsing it.
 *
 * `originXDev` is passed rather than read off `u` because the two substrates want
 * different answers to the same question: canvas passes 0 (the canvas is the grid,
 * with no box to centre in), DOM passes `u.originXDev`. Making the caller say
 * which keeps the difference visible at the call site instead of hidden behind a
 * mode flag.
 */
export function uniformDrawList(
  g: GridGeometry,
  grid: Grid<TileState>,
  dpr: number,
  originXDev: number,
  keyOf: (tileId: string, assetId: string) => string,
  range: { x0: number; x1: number } = { x0: 0, x1: grid.columns },
): UniformItem[] {
  const { cellDev, originYDev } = uniformGeometry(g, dpr);
  const out: UniformItem[] = [];

  // `range` culls columns (`canvasPresentation`): cell `x0` is drawn at the
  // raster's left edge, so `dx` counts from there. The default is every column,
  // which makes this the list it was before culling existed.
  for (let i = 0; i < grid.cells.length; i++) {
    const cell = grid.cells[i]!;
    if (cell.tileId === null || cell.assetId === null) continue;

    const x = i % grid.columns;
    if (x < range.x0 || x >= range.x1) continue;
    const y = Math.floor(i / grid.columns);
    // The translation is placement, not transform -- see `translationDev`. It
    // moves `dx`/`dy`, and so `cx`/`cy`, which is where the matrix pivots: the
    // tile turns about where it landed. A tile moved off the raster is clipped by
    // the canvas, and the raster's size is the lattice's -- it never grows for it.
    const { tx, ty } = translationDev(cell, cellDev);
    const dx = originXDev + (x - range.x0) * cellDev + tx;
    const dy = originYDev + y * cellDev + ty;

    out.push({
      key: keyOf(cell.tileId, cell.assetId),
      index: i,
      x,
      y,
      dx,
      dy,
      side: cellDev,
      cx: dx + cellDev / 2,
      cy: dy + cellDev / 2,
      matrix: isIdentityTransform(cell) ? null : cellMatrix(cell, dx, dy, cellDev),
      alpha: cell.opacity,
    });
  }

  return out;
}

/**
 * `07` §6.2's matrix, taken about the cell's own centre — `M = T(c) . R . S . T(-c)`.
 *
 * The arithmetic is `transformMatrix`'s, restated against the square device rect
 * that is actually painted rather than duplicated: `transformMatrix` takes a
 * `CellBox`, which is the ideal fractional rect, and a transform taken about a
 * centre half a device pixel away from the box it is applied to would shear the
 * drawable off its own cell.
 *
 * `sincos` keeps a quarter turn exactly axis-aligned rather than `6.12e-17` off,
 * so the mapped corners are the integer corners rather than values near them.
 */
function cellMatrix(attrs: TileState, dx: number, dy: number, side: number): Matrix {
  const cx = dx + side / 2;
  const cy = dy + side / 2;
  const { sin, cos } = sincos(attrs.rotation);
  const sx = attrs.scaleX * attrs.scale;
  const sy = attrs.scaleY * attrs.scale;

  const a = sx * cos;
  const b = sx * sin;
  const c = -sy * sin;
  const d = sy * cos;

  return [a, b, c, d, cx - (a * cx + c * cy), cy - (b * cx + d * cy)];
}
