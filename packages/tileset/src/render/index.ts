/**
 * `@fndvit/gen-tilesets/render` — the renderer's public surface.
 *
 * **Invariant S10** — `cellBox` and `cellAt` are exported pure functions,
 * independent of the component. The component computes placement from them, and
 * `09` draws every overlay from them. Neither reimplements the arithmetic
 * (`07` **R1**).
 */

export {
  alignFraction,
  cellAt,
  cellBox,
  cellCentre,
  cellPlacementAffine,
  cellPlacementPercent,
  cssLength,
  gridWidth,
  latticeRange,
  naturalHeight,
  naturalRatio,
  originX,
  originY,
  scaleFactor,
  visibleColumns,
  type Affine,
  type AlignX,
  type AlignY,
  type CellBox,
  type CellPlacement,
  type CellPlacementAffine,
  type CellRange,
  type GridGeometry,
  type Lattice,
  type Sizing,
} from "./geometry.js";

/**
 * `<Tileset>`'s one settings object. `TilesetOptions` documents every field and
 * its default; `resolveOptions` is the only place a default is written, and
 * `optionErrors` is the separate check the component runs in a development build.
 */
export {
  DEFAULT_OPTIONS,
  LEGACY_PROPS,
  legacyPropErrors,
  normalizeTargets,
  optionErrors,
  resolveOptions,
  sameTargets,
  type AvoidTargets,
  type NormalizedTargets,
  type ResolvedOptions,
  type Substrate,
  type TilesetOptions,
} from "./options.js";

/**
 * Client coordinates to render space — `07` §8.2's caller work, done once. The
 * editor's brush and the keep-out tracker both convert through this (**R1**).
 */
export {
  metricsOf,
  rectToRenderSpace,
  toRenderSpace,
  type BoxMetrics,
  type RenderRect,
} from "./space.js";

/**
 * The keep-out mask, as pure functions — what `options.avoid` computes, exported
 * so a host drawing its own overlay can show exactly which cells are hidden.
 */
export { occlusionMask, sameMask, stableMask, type OcclusionMask } from "./occlusion.js";

/**
 * `refresh()` re-measures every tileset on the page on the next frame: the host's
 * handle for a keep-out element moved by a CSS animation, which the tracker
 * cannot see. `track` is the tracker itself, for a host that wants a keep-out
 * measurement without a `<Tileset>`.
 */
export { refresh, track, type Measurement } from "./measure.js";

export {
  applyMatrix,
  cssTransform,
  isIdentityTransform,
  maxSpill,
  sincos,
  transformMatrix,
  type Matrix,
  type TransformAttributes,
} from "./transform.js";

export { coverRect, snap } from "./edges.js";

/**
 * The uniform square cell — `SUBPIXEL-GEOMETRY.md`, *The recommendation*.
 *
 * This is the geometry the `"canvas"` substrate draws from, and it is
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
  canvasPresentation,
  domGeometry,
  domLattice,
  uniformDrawList,
  uniformGeometry,
  type CanvasPresentation,
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
