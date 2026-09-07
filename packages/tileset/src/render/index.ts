/**
 * `@fndvit/gen-tilesets/render` — the renderer's public surface.
 *
 * **Invariant S10** — `cellBox` and `cellAt` are exported pure functions,
 * independent of the component. The component computes placement from them, and
 * `09` draws every overlay from them. Neither reimplements the arithmetic
 * (`07` **R1**).
 */

export {
  cellAt,
  cellBox,
  cellCentre,
  cellPlacementPercent,
  gridWidth,
  naturalHeight,
  naturalRatio,
  originX,
  originY,
  scaleFactor,
  type CellBox,
  type CellPlacement,
  type GridGeometry,
} from "./geometry.js";

export {
  applyMatrix,
  cssTransform,
  isIdentityTransform,
  sincos,
  transformMatrix,
  type Matrix,
  type TransformAttributes,
} from "./transform.js";

export { coverRect, snap } from "./edges.js";

/**
 * The uniform square cell — `SUBPIXEL-GEOMETRY.md`, *The recommendation*.
 *
 * This is the geometry the `"canvas"` and `"svg"` substrates draw from, and it is
 * exported for the same reason `cellBox` is (**S10**, **R1**): a host that needs
 * to know what was actually rasterised — a tool sizing an export, a diagnostic
 * reporting the residual — must read the one implementation rather than restate it.
 *
 * **`domGeometry` is the same ideal cell quantised the other way**, and it is what
 * the `"dom"` substrate places cells with. It rounds the cell *up*, because that
 * substrate has already given the residual to the box and so can only feel the
 * residual's sign: `round` gutters at about half of all widths, and `ceil` cannot.
 * Its comment carries the measurements and the cost.
 *
 * **An overlay wants `cellPlacementPercent`, not either of these.** Under the
 * canvas substrate the presentation scale exactly cancels the quantisation, so a
 * cell lands at `originX + k * s * cellSize` — the ideal fractional geometry. See
 * `uniform.ts` and the two editor overlays.
 */
export {
  domGeometry,
  uniformDrawList,
  uniformGeometry,
  type DomGeometry,
  type UniformGeometry,
  type UniformItem,
} from "./uniform.js";

/**
 * The two asset rules, as checks. `<Tileset>` runs these in a development build;
 * a host that wants to surface them in its own UI (the editor freezes intrinsic
 * dimensions at attach, **E13**, so it has what it needs) can call them directly.
 */
export { assetTooSmall, cellTooSmall, SOFT_CELL_DEV, WarnOnce } from "./warn.js";

export {
  assetKey,
  defaultProvider,
  parseAssetKey,
  prefixedProvider,
  type AssetProvider,
  type AssetRef,
  type Drawable,
} from "./provider.js";
