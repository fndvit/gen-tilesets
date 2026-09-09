/**
 * `sincos` — exact trigonometry on the axes, shared by the engine and the renderer.
 *
 * **Why this is its own module.** It began in `render/transform.ts`, where a
 * quarter-turned cell has to land exactly on its cell box (**R7**). The
 * `gradient` Source needs the same exactness for the same reason — a vertical
 * sweep must not pick up a `6.12e-17` column term — and the dependency direction
 * in this package runs strictly render -> engine, never the reverse. Importing
 * `render/transform.ts` from `registry/sources.ts` would invert that for one pure
 * arithmetic helper, and copying the quadrant table would leave two of them to
 * drift. So it moved down to where both layers can reach it.
 *
 * Nothing here touches the DOM, a measurement, or an asset, so it is legal engine
 * code under `02` **G5**. `render/transform.ts` re-exports it, which is why every
 * existing import of `sincos` from there still resolves.
 */

/**
 * `sin` and `cos` of an angle in **degrees**, exact on the axes.
 *
 * `Math.cos(90 * Math.PI / 180)` is `6.12e-17`, not `0`: the conversion to
 * radians is inexact, so a quarter turn comes out very slightly off-axis. That
 * costs nothing on its own — but a quarter-turned cell is meant to land exactly
 * on its cell box (**R7**), and "exactly" cannot be built on a matrix whose
 * axis-aligned case is not axis-aligned. Every downstream identity `edges.ts`
 * relies on (the mapped corner is the snapped integer corner, not a value near
 * it) needs the `0` to be a real zero.
 *
 * **The `gradient` Source depends on it just as hard.** Its domain is the
 * projection of the extent's corner cells onto the sweep direction, and with
 * `cos(90deg) = 6.12e-17` a vertical sweep's extremes come out `2.47e-17` and
 * `0.9999999999999994` rather than `0` and `1` — so a `range: [0, 1]` gradient
 * would not quite reach either end, which is the whole defect it was changed to
 * fix. A single-row extent is worse: the stray column term gives it a non-zero
 * span, so it returns a gradient across a band that has no extent to sweep.
 *
 * Multiples of 90 are read off a table; everything else goes through `Math`
 * unchanged, so no non-axis angle moves by an ulp.
 */
export function sincos(degrees: number): { sin: number; cos: number } {
  if (Number.isFinite(degrees) && degrees % 90 === 0) {
    // `%` keeps the sign of the dividend, so a negative angle lands in -3..0;
    // adding 4 before the second `%` folds it into the quadrant table.
    const quadrant = ((((degrees / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    return [
      { sin: 0, cos: 1 },
      { sin: 1, cos: 0 },
      { sin: 0, cos: -1 },
      { sin: -1, cos: 0 },
    ][quadrant]!;
  }
  const t = (degrees * Math.PI) / 180;
  return { sin: Math.sin(t), cos: Math.cos(t) };
}
