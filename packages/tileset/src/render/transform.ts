/**
 * Transforms — `07-render-contract.md` §6, `03-domain-model.md` §6.3.
 *
 * **Invariant D11** — scale is applied **before** rotation, both about the
 * drawable's centre. Non-uniform scale does not commute with rotation, so the
 * order must be pinned or two conformant renderers can disagree.
 *
 * **Invariant R7** — a drawable at `scaleX = 1, scaleY = 1, rotation = 0` occupies
 * exactly its cell box. The **drawable box** is the cell box at scale 1, and it
 * is the reference every transform is taken against.
 *
 * `cellSize` fixes the drawable's size *at scale 1*; scale is unbounded in both
 * directions (`03` §5.4) and free to exceed it. `07` §6.1 writes this down
 * because it reads as contradicting `02` §7 and does not — the two statements are
 * about different things, one about what the attribute may hold and the other
 * about what the number `1` means.
 */

import { sincos } from "../angle.js";
import type { CellBox } from "./geometry.js";
import { cellCentre } from "./geometry.js";

/** The standard affine six-tuple: `x' = a*x + c*y + e`, `y' = b*x + d*y + f`. */
export type Matrix = [a: number, b: number, c: number, d: number, e: number, f: number];

export interface TransformAttributes {
  /** Uniform, multiplied into both axes — ADR-005, `07` §10.1. */
  scale: number;
  scaleX: number;
  scaleY: number;
  /** Degrees. **Positive is clockwise** — see below. */
  rotation: number;
}

/**
 * A cell's translation, in **cells** — `TileState.translateX`/`translateY`.
 *
 * **Deliberately not a field of {@link TransformAttributes}.** That interface is
 * what the cell's *transform* carries — the matrix, the CSS `transform` list —
 * and translation is not drawn through either. It is added to the cell's
 * *placement* (see {@link translationDev}), so it stays on the pixel-snapped path
 * that `isIdentityTransform` guards. Keeping the two types apart keeps every
 * existing `TransformAttributes` literal valid, too.
 */
export interface Translation {
  translateX: number;
  translateY: number;
}

/**
 * A cell's translation in whole **device px**, on a substrate whose cell is
 * `cellDev` device px — the one place the conversion and its rounding are
 * written. Canvas adds it to `dx`/`dy`, the DOM to its px margins, and the
 * keep-out mask to the drawn bounds it tests, so the three agree to the pixel.
 *
 * **Why placement, and why rounded.** Composition is `transform(pos) + t`: the
 * tile scales and turns about its own centre, then moves in grid axes. Written
 * as a leading `translate()` in the matrix or the CSS list, every translated cell
 * would stop being an identity transform, be rasterised at sub-pixel precision,
 * and reopen at every shared edge the seam `08` §12 removed by placing cells with
 * margins instead of transforms. Added to the placement and rounded to a device
 * pixel, a cell that is only translated keeps its snapped box, and two
 * neighbours translated by the same amount keep their shared edge (**R6**).
 * Moving the box also moves its centre, so a rotated cell pivots about where it
 * landed.
 *
 * The cost is that translation moves in device-pixel steps. Invisible at rest;
 * it would show only if translation were ever animated, which is not what this
 * attribute is for. At `t = 0` this returns `0` (never `-0`), so an untranslated
 * cell's placement is byte-identical to what it was before 0.8.0.
 */
export function translationDev(attrs: Translation, cellDev: number): { tx: number; ty: number } {
  // `+ 0` folds a `-0` from `Math.round(-0.3)` into `0`, so a placement string
  // never reads `-0px`.
  return {
    tx: Math.round(attrs.translateX * cellDev) + 0,
    ty: Math.round(attrs.translateY * cellDev) + 0,
  };
}

/**
 * The two scale rows of `07` §10.1 folded into the one matrix they describe.
 *
 * `scale` shares `scaleX`/`scaleY`'s ordinal rather than taking a new one: a
 * uniform factor multiplied into `S` commutes with the axis factors, so there is
 * no order to pin between them. `07` §10.1 already reads the shared ordinal as
 * "they are one matrix", and this is a third contributor to it. **D11**'s
 * scale-before-rotation is untouched, and at `scale = 1` the product is
 * arithmetically the matrix that existed before ADR-005.
 */
function axes(attrs: TransformAttributes): { sx: number; sy: number } {
  return { sx: attrs.scaleX * attrs.scale, sy: attrs.scaleY * attrs.scale };
}

/**
 * `sincos` lives in `../angle.ts` now, because the `gradient` Source needs the
 * same exact-on-the-axes guarantee and the engine cannot import from `render/`.
 * Re-exported here so every existing import site is unchanged — and because this
 * is still where a reader looking for the matrix's trigonometry will come first.
 */
export { sincos } from "../angle.js";

/**
 * `M = T(cx, cy) . R(theta) . S(scaleX, scaleY) . T(-cx, -cy)` — `07` §6.2.
 *
 *     a = scaleX * cos t      c = -scaleY * sin t
 *     b = scaleX * sin t      d =  scaleY * cos t
 *     e = cx - (a*cx + c*cy)  f = cy - (b*cx + d*cy)
 *
 * **Positive `rotation` is clockwise.** `02` §5 puts `y` increasing downward, and
 * this matrix in a y-down space turns clockwise for positive theta. `07` §6.2
 * pins it because nothing upstream states it, and `05` §4.2's argument for why
 * `rotation` vetoes `min` — that 350deg is ten degrees *anticlockwise* of 10deg —
 * silently assumes a direction. Reversing the sign would flip every asymmetric
 * tile in every existing config with no version number moving.
 */
export function transformMatrix(attrs: TransformAttributes, box: CellBox): Matrix {
  const { cx, cy } = cellCentre(box);
  const { sin, cos } = sincos(attrs.rotation);
  const { sx, sy } = axes(attrs);

  const a = sx * cos;
  const b = sx * sin;
  const c = -sy * sin;
  const d = sy * cos;
  const e = cx - (a * cx + c * cy);
  const f = cy - (b * cx + d * cy);

  return [a, b, c, d, e, f];
}

/** Applies a matrix to a point, for tests and for anything reasoning about extent. */
export function applyMatrix(m: Matrix, x: number, y: number): { x: number; y: number } {
  const [a, b, c, d, e, f] = m;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

/**
 * The cell's transform as a CSS list, in the order **D11** requires.
 *
 * **A CSS transform list applies right to left** (`07` §6.3). So
 * `rotate(90deg) scale(2, 1)` scales first and is **correct**;
 * `scale(2, 1) rotate(90deg)` is the wrong picture. "The inversion is easy to
 * introduce and produces a picture that looks deliberate."
 *
 * **`translate` is optional, and the shipping renderer omits it.** `08` §6.3
 * illustrated placement as a leading `translate(...)` in this same list, and
 * `08` §12 records why that is no longer what `<Tileset>` emits: a transformed
 * element is rasterized at sub-pixel precision, so placing cells with a transform
 * put every seam on a fractional device pixel and reopened exactly the sub-pixel
 * gap `07` §5.6 (**R6**) forbids. Placement now rides on percentage margins,
 * which the substrate snaps on the shared edge, and this list carries the cell's
 * own attributes and nothing else.
 *
 * When `translate` *is* supplied the list is unchanged, and the ordering rule
 * still binds: the whole list must read `translate(...) rotate(...) scale(...)`,
 * because placing the translation last inverts the order.
 *
 * **0.8.0's `translateX`/`translateY` do not ride here either**, for the same
 * reason — see {@link translationDev}. They move the margin, not the transform.
 *
 * The element's `transform-origin` is its own centre (the CSS default), which is
 * the drawable box's centre, as **D11** and **R7** require. Placement by margin
 * does not move that centre — a margin shifts the border box, and the origin is
 * a percentage of the border box.
 */
export function cssTransform(
  attrs: TransformAttributes,
  translate?: { xPercent: number; yPercent: number },
): string {
  const { sx, sy } = axes(attrs);
  const placement =
    translate === undefined ? "" : `translate(${translate.xPercent}%, ${translate.yPercent}%) `;
  return placement + `rotate(${attrs.rotation}deg) ` + `scale(${sx}, ${sy})`;
}

/**
 * Whether the cell's transform is the identity — no rotation and unit scale on
 * both axes and on ADR-005's uniform factor.
 *
 * This is what lets `<Tileset>` omit the `transform` property entirely for a cell
 * that does not need one, which is the whole of the seam fix: an untransformed
 * element has its border box pixel-snapped by the substrate, and **R6**'s shared
 * edge is preserved through the snap because `round()` of one number is one
 * number. A cell that *is* transformed is deliberately free-floating — `07` §7.1
 * makes spilling the point of the attribute set — and its antialiased edge is
 * correct rather than a defect.
 *
 * **Translation is not considered**, on purpose: a translated cell is still an
 * identity *transform*, because translation is added to its placement and keeps
 * the snapped box this function exists to protect (`translationDev`). Anything
 * asking "does this cell reach past its home square?" must ask
 * {@link drawnHalfExtents} and the translation too — `maxSpill` does.
 */
export function isIdentityTransform(attrs: TransformAttributes): boolean {
  const { sx, sy } = axes(attrs);
  return attrs.rotation === 0 && sx === 1 && sy === 1;
}

/**
 * Half the axis-aligned size of a cell's drawn tile, in **cells**, at its rest
 * pose — scale and rotation only, about the cell's centre. `0.5` each way for an
 * untransformed tile.
 *
 * The transformed square's axis-aligned half-extent is `(|sx cos| + |sy sin|) / 2`
 * wide and `(|sx sin| + |sy cos|) / 2` tall. Add the cell's translation to the
 * centre and this is the tile's bounding box — what `maxSpill` widens culling by
 * and what the keep-out mask tests (`occlusion.ts`), so the arithmetic exists
 * once.
 */
export function drawnHalfExtents(attrs: TransformAttributes): { halfW: number; halfH: number } {
  if (isIdentityTransform(attrs)) return { halfW: 0.5, halfH: 0.5 };
  const { sin, cos } = sincos(attrs.rotation);
  const sx = Math.abs(attrs.scaleX * attrs.scale);
  const sy = Math.abs(attrs.scaleY * attrs.scale);
  return {
    halfW: (sx * Math.abs(cos) + sy * Math.abs(sin)) / 2,
    halfH: (sx * Math.abs(sin) + sy * Math.abs(cos)) / 2,
  };
}

/**
 * How far, in **whole cells**, the furthest-reaching drawable in `grid` paints
 * past its own cell — what culling must widen by so it never drops a neighbour
 * that spills into view.
 *
 * **R9** makes the render box the only clip and a cell *not* one, so a tile
 * scaled 1.5x or turned 45 degrees paints into its neighbours, and since 0.8.0 a
 * translated one may land cells away. A cell just outside the box can therefore
 * still reach into it, and culling at the box edge exactly would clip a picture
 * the uncropped grid shows.
 *
 * The spill is how far the drawn bounding box — {@link drawnHalfExtents}, offset
 * by the cell's translation — exceeds the cell's own half, `0.5`. Rounded **up** to
 * whole cells, because culling is by column.
 *
 * **One number for the whole grid.** A single tile translated 40 cells makes
 * culling build 40 extra hidden columns each side for every tile. It costs work,
 * never size or layout — the box does not depend on this — and checking each
 * tile individually is the optimisation if it ever shows.
 *
 * A function of the grid alone — no width, no DPR — so it is computed once per
 * generation, not per resize. Translation is taken exact here rather than
 * rounded to a device pixel; `ceil` to whole cells swallows the difference.
 */
export function maxSpill(grid: {
  cells: readonly (TransformAttributes & Partial<Translation>)[];
}): number {
  let spill = 0;
  for (const cell of grid.cells) {
    const tx = Math.abs(cell.translateX ?? 0);
    const ty = Math.abs(cell.translateY ?? 0);
    if (tx === 0 && ty === 0 && isIdentityTransform(cell)) continue;
    const { halfW, halfH } = drawnHalfExtents(cell);
    spill = Math.max(spill, halfW - 0.5 + tx, halfH - 0.5 + ty);
  }
  return Math.ceil(spill);
}
