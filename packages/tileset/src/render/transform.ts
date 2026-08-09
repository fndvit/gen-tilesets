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
  scaleX: number;
  scaleY: number;
  /** Degrees. **Positive is clockwise** — see below. */
  rotation: number;
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

  const a = attrs.scaleX * cos;
  const b = attrs.scaleX * sin;
  const c = -attrs.scaleY * sin;
  const d = attrs.scaleY * cos;
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
 * `08` §6.3 adds the other half: the placement translation composes with this,
 * and the whole list must read `translate(...) rotate(...) scale(...)`. Placing
 * the translation last inverts the order.
 *
 * `translate` is expressed in percentages of the cell's own size, which resolve
 * against the cell rather than the render box — that is what carries the vertical
 * offset a percentage `top` could not (`08` §6.3).
 *
 * The element's `transform-origin` is its own centre (the CSS default), which is
 * the drawable box's centre, as **D11** and **R7** require.
 */
export function cssTransform(
  attrs: TransformAttributes,
  translate: { xPercent: number; yPercent: number },
): string {
  return (
    `translate(${translate.xPercent}%, ${translate.yPercent}%) ` +
    `rotate(${attrs.rotation}deg) ` +
    `scale(${attrs.scaleX}, ${attrs.scaleY})`
  );
}
