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
  const t = (attrs.rotation * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
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
 */
export function isIdentityTransform(attrs: TransformAttributes): boolean {
  const { sx, sy } = axes(attrs);
  return attrs.rotation === 0 && sx === 1 && sy === 1;
}
