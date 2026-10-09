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

/**
 * How a cell's size responds to the render box.
 *
 * - `"fluid"` — `07` §5.3's model and the only one before 0.6.0: every quantity is
 *   a fixed fraction of `Wpx`, so the picture is one design scaled.
 * - `"fixed"` — a design px **is** a CSS px (`s = 1`). Cells keep `layout.cellSize`
 *   at every width and the box crops the grid instead, on the side `align` says.
 *
 * A **host** choice rather than a `Layout` field: the same file can be hosted
 * either way, and keeping it out of the file keeps the file size-independent and
 * needs no `schemaVersion` bump. Rejected: growing `columns` to fill a wide box in
 * fixed mode — that is `RESPONSIVE-HOSTING.md`'s Route D, refuted there for three
 * reasons that still hold.
 */
export type Sizing = "fluid" | "fixed";

/**
 * Which edge of the **design box** is pinned to the render box.
 *
 * The design box is `referenceWidth` wide and `(rows - yOffset) * cellSize` tall,
 * scaled by `s`. Under `"fluid"` it *is* the render box horizontally, so all three
 * horizontal values give identical geometry — a consequence of the definition, not
 * a special case. Under `"fixed"` they choose what gets cropped: `"left"` keeps
 * the design's left edge and crops from the right, `"right"` the reverse, and
 * `"center"` crops both sides equally.
 */
export type AlignX = "left" | "center" | "right";

/**
 * The vertical counterpart of {@link AlignX}. Only matters when the render box is
 * a different height from the design box — which the component never causes on
 * its own (**S8**: the box takes its height from the grid) and a host causes by
 * setting one, `07` §7.3's vertical bleed. `"top"` is `07` §7.3's top anchoring
 * and the default.
 */
export type AlignY = "top" | "center" | "bottom";

/** Everything `07` §5 needs. `rows` and `columns` come from `config`, `Wpx` from the host. */
export interface GridGeometry {
  layout: Layout;
  rows: number;
  columns: number;
  /** The render box's width, in rendered px. */
  Wpx: number;
  /** Default `"fluid"`. See {@link Sizing}. */
  sizing?: Sizing | undefined;
  /** Default `"center"`. See {@link AlignX}. */
  alignX?: AlignX | undefined;
  /** Default `"top"`. See {@link AlignY}. */
  alignY?: AlignY | undefined;
  /**
   * The render box's height, in rendered px. Read only when `alignY` is not
   * `"top"`; absent means "the design box's own height", which shifts nothing.
   */
  Hpx?: number | undefined;
}

/**
 * `0`, `0.5` or `1`: how much of the difference between the render box and the
 * design box lands *before* the design box. One coefficient serves both axes.
 */
export function alignFraction(align: AlignX | AlignY | undefined, fallback: 0 | 0.5): number {
  switch (align) {
    case "left":
    case "top":
      return 0;
    case "center":
      return 0.5;
    case "right":
    case "bottom":
      return 1;
    default:
      return fallback;
  }
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
  // Fixed sizing is `s = 1` and nothing else: every expression below is written
  // in `s`, so the whole of the mode lives in this line and in `originX`'s pin.
  if (g.sizing === "fixed") return 1;
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
  // Fluid keeps its original expression, not the general one below: they are
  // equal in exact arithmetic (the design box is the render box, so the pin term
  // is zero), but not always to the last bit, and 0.x's drawn output for an
  // unchanged host must not move because a mode was added beside it.
  if (g.sizing !== "fixed") return (g.Wpx - scaleFactor(g) * gridWidth(g)) / 2;
  // Pin the design box by `alignX`, then place the grid inside it with the
  // designed bleed. At "center" this is `(Wpx - gridWidth) / 2` again.
  const s = scaleFactor(g);
  const ref = g.layout.referenceWidth;
  return alignFraction(g.alignX, 0.5) * (g.Wpx - s * ref) + (s * (ref - gridWidth(g))) / 2;
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
  const top = -scaleFactor(g) * g.layout.yOffset * g.layout.cellSize;
  const b = alignFraction(g.alignY, 0);
  // No `Hpx`, or top-aligned: exactly the original expression.
  if (b === 0 || g.Hpx === undefined) return top;
  return top + b * (g.Hpx - naturalHeight(g));
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

/** A cell's placement, expressed as percentages of `Wpx` — see `cellPlacementPercent`. */
export interface CellPlacement {
  /** `cellBox().left` as a percentage of `Wpx`. */
  leftPercent: number;
  /** `cellBox().top` as a percentage of `Wpx` — of the **width**, not the height. */
  topPercent: number;
  /** The cell's side as a percentage of `Wpx`. Cells are square (`02` §7). */
  sidePercent: number;
}

/**
 * `cellBox` with `Wpx` cancelled out — `07` §5.3, `08` §6.3.
 *
 * Every quantity in §5.2 is `Wpx` times a constant of `Layout` and `columns`, so
 * dividing the box through by `Wpx` leaves a set of constants:
 *
 *     sidePercent = cellSize / referenceWidth * 100
 *     leftPercent = ((referenceWidth - columns * cellSize) / (2 * cellSize) + x) * sidePercent
 *     topPercent  = (y - yOffset) * sidePercent
 *
 * `leftPercent / 100 * Wpx` is `cellBox(g, x, y).left` exactly, and likewise for
 * `top`. **`topPercent` is a fraction of the width too**, not of the height: the
 * vertical pitch is `s * cellSize`, the same quantity as the horizontal one,
 * because cells are square. A percentage resolved against the box's height would
 * stretch cells the moment a host overrode that height, which `08` **S8**
 * explicitly permits it to do for `07` §7.3's vertical bleed.
 *
 * **Invariant S10** — this exists so the component does not reimplement the
 * arithmetic. It is the same mapping as `cellBox`, in the units a stylesheet can
 * consume, and `R6`'s shared edge survives the change of units: cell `x`'s
 * `leftPercent + sidePercent` is cell `x+1`'s `leftPercent`, because both sides
 * evaluate the same expression.
 *
 * Percentages rather than px for `07` §5.3's reasons — no measurement, correct at
 * every width, complete geometry under SSR where `Wpx` is unknown.
 */
export function cellPlacementPercent(
  layout: Layout,
  columns: number,
  x: number,
  y: number,
): CellPlacement {
  const sidePercent = (layout.cellSize / layout.referenceWidth) * 100;
  const leftBase = (layout.referenceWidth - columns * layout.cellSize) / (2 * layout.cellSize);
  return {
    leftPercent: (leftBase + x) * sidePercent,
    topPercent: (y - layout.yOffset) * sidePercent,
    sidePercent,
  };
}

/**
 * One length as `pct% of a basis + px` — the shape every placement quantity has
 * once `sizing` and `align` are in play. `pct` is a percentage (0–100), not a
 * fraction, because that is what a stylesheet is handed.
 */
export interface Affine {
  pct: number;
  px: number;
}

/**
 * A cell's placement as affine lengths, so it can be written into CSS **before
 * anything is measured** — `cellPlacementPercent` generalised to every
 * `(sizing, alignX, alignY)`.
 *
 * `side`, `left` and `marginTop` are against the render box's **width** (a
 * percentage margin resolves against the containing block's width, which is the
 * trick `Tileset.svelte`'s `cellStyle` comment explains). `topPct` is against its
 * **height**: it is what a non-top `alignY` needs, and a percentage `top` is the
 * one CSS length that resolves against height.
 *
 * Under `"fluid"` with top alignment this is `cellPlacementPercent` exactly —
 * the same numbers, by the same expressions — so the server-rendered HTML of an
 * unchanged host is byte-identical to 0.5.0's.
 */
export interface CellPlacementAffine {
  side: Affine;
  left: Affine;
  marginTop: Affine;
  topPct: number;
}

/**
 * @param translate the cell's `translateX`/`translateY`, in cells. Placement is
 *   linear in the cell's position with the side as its coefficient, so a
 *   translation is the position moved by `t` — exact here, because nothing before
 *   measurement is quantised; after measurement the DOM rounds it to a device
 *   pixel with everything else (`translationDev`). Omitted, it is `0`, and every
 *   number is the one this function returned before 0.8.0.
 */
export function cellPlacementAffine(
  g: Omit<GridGeometry, "Wpx" | "Hpx">,
  cellX: number,
  cellY: number,
  translate: { translateX: number; translateY: number } = { translateX: 0, translateY: 0 },
): CellPlacementAffine {
  const x = cellX + translate.translateX;
  const y = cellY + translate.translateY;
  const { layout, rows, columns } = g;
  const bY = alignFraction(g.alignY, 0);
  const topPct = bY * 100;

  if (g.sizing !== "fixed") {
    const p = cellPlacementPercent(layout, columns, x, y);
    // The design box is `(rows - yOffset)` cells tall, in the same width-relative
    // percentage every other vertical quantity here is in.
    const shift = bY === 0 ? 0 : bY * (rows - layout.yOffset) * p.sidePercent;
    return {
      side: { pct: p.sidePercent, px: 0 },
      left: { pct: p.leftPercent, px: 0 },
      marginTop: { pct: bY === 0 ? p.topPercent : p.topPercent - shift, px: 0 },
      topPct,
    };
  }

  const { cellSize, referenceWidth: ref, yOffset } = layout;
  const bX = alignFraction(g.alignX, 0.5);
  return {
    side: { pct: 0, px: cellSize },
    left: { pct: bX * 100, px: (ref - columns * cellSize) / 2 - bX * ref + x * cellSize },
    marginTop: { pct: 0, px: (y - yOffset) * cellSize - bY * (rows - yOffset) * cellSize },
    topPct,
  };
}

/**
 * An {@link Affine} as a CSS length. `px === 0` is tested first so a fluid
 * placement comes out as a bare percentage, exactly the string 0.5.0 wrote.
 */
export function cssLength(a: Affine): string {
  if (a.px === 0) return `${a.pct}%`;
  if (a.pct === 0) return `${a.px}px`;
  return `calc(${a.pct}% + ${a.px}px)`;
}

/**
 * A square lattice in render space: the cell grid **as a substrate actually
 * draws it**, in CSS px relative to the render box's top-left.
 *
 * Not `cellBox` under another name. Each substrate quantises the ideal mapping
 * differently (`uniform.ts`), and anything that must agree with the picture to
 * the pixel — the keep-out mask, culling — has to ask the substrate for the
 * lattice it painted rather than recompute the ideal one. Canvas's lattice is the
 * ideal one (its presentation cancels the quantisation); DOM's is `domGeometry`'s.
 */
export interface Lattice {
  originX: number;
  originY: number;
  pitch: number;
}

/** A half-open cell range, clamped to the grid: `[x0, x1) x [y0, y1)`. */
export interface CellRange {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * The cells whose lattice square intersects `rect` with **positive area**,
 * clamped to the grid.
 *
 * Positive area rather than closed intersection, so a rect that only touches a
 * cell's edge does not claim it. Cell `x` spans `[ox + x*p, ox + (x+1)*p)`; it
 * meets `(left, right)` with positive area exactly when
 * `floor((left - ox) / p) <= x < ceil((right - ox) / p)`, and likewise for `y`.
 *
 * O(1): the range is arithmetic, so a caller pays for the cells it then visits
 * and never for the grid.
 */
export function latticeRange(
  lattice: Lattice,
  columns: number,
  rows: number,
  rect: CellBox,
): CellRange {
  const { originX: ox, originY: oy, pitch: p } = lattice;
  const clamp = (v: number, hi: number): number => Math.min(hi, Math.max(0, v));
  return {
    x0: clamp(Math.floor((rect.left - ox) / p), columns),
    x1: clamp(Math.ceil((rect.right - ox) / p), columns),
    y0: clamp(Math.floor((rect.top - oy) / p), rows),
    y1: clamp(Math.ceil((rect.bottom - oy) / p), rows),
  };
}

/**
 * The columns worth drawing: those whose lattice square meets the box's width,
 * widened by `margin` cells each side for drawables that spill (`maxSpill`).
 *
 * **Columns only.** A substrate culls horizontally and keeps every row, because
 * the box's height is taken *from* the grid (**S8**), and a grid that culled its
 * own rows would change the height it is measured by.
 */
export function visibleColumns(
  lattice: Lattice,
  columns: number,
  Wpx: number,
  margin: number,
): { x0: number; x1: number } {
  const pad = margin * lattice.pitch;
  const r = latticeRange(lattice, columns, 1, {
    left: -pad,
    right: Wpx + pad,
    top: -Infinity,
    bottom: Infinity,
  });
  return { x0: r.x0, x1: Math.max(r.x0, r.x1) };
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
