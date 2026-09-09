/**
 * `@fndvit/gen-tilesets` — the engine.
 *
 * `generate(config, seed, loadSalt) -> Grid<TileState>` is a pure function, and
 * nothing exported from this entry point touches the DOM, a pixel measurement, or
 * a graphical resource (`02` **G1**, **G5**). The renderer lives behind
 * `@fndvit/gen-tilesets/render`.
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

/**
 * Exact-on-the-axes trigonometry, shared by `gradient` and the renderer's
 * matrix. Exported here as well as from `/render` because it is engine code now
 * — see `./angle.ts` for why it moved.
 */
export { sincos } from "./angle.js";

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

/**
 * `06` §4.3, §4.4 — the migration table and the walk over it. Runs **before**
 * `validate()`, because §9.2 forbids validation from coercing anything.
 */
export {
  migrate,
  MIGRATIONS,
  type Migration,
  type MigrationOutcome,
} from "./migrate.js";

/**
 * `06` §5–§10, **C5** — a separate function, off the critical path.
 * `generate()` trusts its input; this is what makes that trust earned.
 */
export {
  SCHEMA_VERSION,
  validate,
  type ErrorCode,
  type ValidationError,
} from "./validate.js";

/**
 * The two-in-one door for a plain consumer: `migrate()` then `validate()`, in
 * that order, throwing on either. It is the sequence that is the value — see
 * `./load.ts`. A host that needs the migration steps or the structured errors
 * (the editor does) keeps using the two functions above directly.
 *
 * `assertValidFile` is exported because `<Tileset>` asserts with it under `DEV`.
 */
export { assertValidFile, loadTilesetFile } from "./load.js";

export { tileStateAt } from "./types.js";
export type {
  AttributeName,
  BlendName,
  Grid,
  Identifier,
  Extent,
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
