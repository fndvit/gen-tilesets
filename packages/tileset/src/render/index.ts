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

export {
  blitRect,
  coverRect,
  drawList,
  snap,
  snappedGrid,
  xEdges,
  yEdges,
  type DrawItem,
  type SnappedGrid,
} from "./edges.js";

export {
  assetKey,
  defaultProvider,
  prefixedProvider,
  type AssetProvider,
  type AssetRef,
  type Drawable,
} from "./provider.js";
