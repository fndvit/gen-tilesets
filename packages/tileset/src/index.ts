/**
 * `@tileset/core` — the engine.
 *
 * `generate(config, seed, loadSalt) -> Grid<TileState>` is a pure function, and
 * nothing exported from this entry point touches the DOM, a pixel measurement, or
 * a graphical resource (`02` **G1**, **G5**). The renderer lives behind
 * `@tileset/core/render`.
 */

export { generate } from "./generate.js";

/**
 * `09` §6.2, **E8** — the overlay's cell set, so the editor implements no
 * Selection test. `02` §12 carries it as required; `05` §10.2 makes it a minor
 * bump, since it moves no output.
 */
export { selection } from "./selection.js";

export {
  ATTRIBUTE_NAMES,
  ATTRIBUTES,
  bound,
  initialTileState,
  writeAttribute,
  type AttributeSpec,
  type Bounding,
} from "./attributes.js";

export { canonicalAssets, prepareTile, walkWeights, type PreparedTile } from "./assets.js";

export { operationCtx, type EvalCtx } from "./ctx.js";

export {
  ASSET_CHANNEL,
  channelU32,
  effectiveSeeds,
  hash,
  hashU32,
  mixLoad,
  pickSeed,
  selectionChannel,
  stage1,
  type EffectiveSeeds,
} from "./hash.js";

export {
  applyNumericMapping,
  applyTileMapping,
  isTileMapping,
  paletteTotal,
} from "./mapping.js";

export {
  acceptedBlends,
  blends,
  isAccepted,
  TARGETS,
  type BlendRegistration,
  type BlendValue,
  type TargetSpec,
} from "./registry/blends.js";
export { Registry, type ParamSchema, type ParamSpec } from "./registry/registry.js";
export { selections, type SelectionRegistration } from "./registry/selections.js";
export { evalSource, sources, type SourceRegistration } from "./registry/sources.js";

export { tileStateAt } from "./types.js";
export type {
  AttributeName,
  BlendName,
  Grid,
  Identifier,
  Layout,
  Mapping,
  NumericMapping,
  Operation,
  PaletteEntry,
  Selection,
  Source,
  TargetName,
  TargetType,
  Tile,
  TileAsset,
  TileMapping,
  TileState,
  TilesetConfig,
  TilesetFile,
  Uint32,
} from "./types.js";
