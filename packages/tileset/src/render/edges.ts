/**
 * Device-pixel snapping, and **R8**'s crop — what survives of ADR-006.
 *
 * **The component no longer draws from this module's geometry.** `uniform.ts`
 * does, and its header says why: per-edge snapping (attempt 1 in
 * `SUBPIXEL-GEOMETRY.md`) pairs an `x` edge with a `y` edge from two independently
 * snapped sequences, so a cell comes out 133 x 132 and **R8**'s centre-crop shaves
 * a flat chord off any asset tangent to its box. The edge arrays, the draw list
 * and `blitRect`'s quarter-turn transpose went with it — a uniform square cell
 * removes that special case rather than needing it. Read the investigation record
 * before reintroducing any of them; they are a measured dead end, not an omission.
 *
 * What is left is the part that was never in question:
 *
 * - `snap`, because a coordinate still has to land on a whole device pixel. That
 *   is not a stylistic preference — an asset whose own outer edge sits on its
 *   viewBox boundary antialiases that edge into transparency when it is rasterised
 *   into a box that is not a whole number of device pixels, and no amount of
 *   correct geometry reaches it.
 * - `coverRect`, because a canvas has no `object-fit` and **R8** still has to be
 *   computed there. Against the square destination `uniform.ts` now produces it
 *   returns the whole source, which is the entire fix: the crop was never wrong,
 *   the rect it was being given was.
 *
 * Pure, and deliberately so: `.svelte` files cannot be unit-tested in this repo.
 */

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
 * **R8**'s centre-crop, computed rather than declared.
 *
 * In the DOM substrate this is `object-fit: cover` and costs nothing: nothing is
 * measured and `07` §6.4's "the renderer never learns an aspect ratio" holds. A
 * canvas has no such property, so the source rect must be derived from the
 * asset's intrinsic size — the one place ADR-006 makes the renderer read
 * something about an asset. `07` §6.4's *rule* is broken; its *purpose* (no
 * geometry depends on an asset) is not, because the destination rect is already
 * fixed by `uniformDrawList` before this is called.
 *
 * Returns the largest centred source rect with the destination's aspect ratio,
 * which is what `cover` means.
 *
 * **Against a square destination and a square source it returns the whole
 * source.** That is not a special case in the code and there is none: `want` and
 * `have` are both 1, so neither branch crops. It is the entire subpixel fix,
 * arriving here as a consequence of `uniform.ts` handing over a square rect
 * rather than a 133 x 132 one.
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
