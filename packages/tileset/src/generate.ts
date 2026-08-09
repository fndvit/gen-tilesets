/**
 * The engine — `02-generation-contract.md` §4, §5, §9.
 *
 *     generate(config, seed, loadSalt = 0) -> Grid<TileState>
 *
 * A **pure function**. Given the same `(config, seed, loadSalt)` triple it
 * returns a structurally identical result, on any machine, in any runtime, at any
 * time.
 *
 * **Invariant G1** — generation output depends on `(config, seed, loadSalt)` and
 * nothing else. Nothing in this file reads wall-clock time, calls
 * `Math.random()`, or touches any ambient state. `loadSalt` does not weaken this:
 * it is a caller-supplied integer, not a measurement of the world.
 *
 * **Invariant G5** — the engine never touches a graphical resource. `TileState`
 * carries identifiers only; resolution to a drawable happens in the renderer.
 */

import { initialTileState, writeAttribute } from "./attributes.js";
import { prepareTile, walkWeights, type PreparedTile } from "./assets.js";
import type { EvalCtx } from "./ctx.js";
import { ASSET_CHANNEL, hash, mixLoad, stage1 } from "./hash.js";
import { applyNumericMapping, applyTileMapping, isTileMapping } from "./mapping.js";
import { blends, type BlendRegistration } from "./registry/blends.js";
import { selections, type SelectionRegistration } from "./registry/selections.js";
import { evalSource, sources, type SourceRegistration } from "./registry/sources.js";
import type { AttributeName, Grid, Operation, TileState, TilesetConfig } from "./types.js";

/** Registry lookups and the effective seed, hoisted out of the cell loop. */
interface PreparedOperation {
  op: Operation;
  selection: SelectionRegistration;
  source: SourceRegistration;
  blend: BlendRegistration;
  ctx: EvalCtx;
}

/**
 * `02` §4.
 *
 * @param config the engine's input. Never the whole `TilesetFile` — `06` **C1**
 *   makes the boundary a property of the file's shape, so passing `config` whole
 *   is safe and passing `file` is a type error.
 * @param seed a **string**, required, and a runtime parameter rather than a design
 *   constant. The engine never applies `config.defaultSeed`: it receives a seed,
 *   it does not go looking for one (`02` §4.1).
 * @param loadSalt a `uint32` drawn **once per load** by the caller and held for
 *   the whole generation (`02` §6.7, `07` **R12**). Never a config field.
 *
 * **This function validates nothing.** `06` **C5**: validation is a separate
 * function, `generate()` trusts its input, and its behaviour on an unvalidated
 * config is undefined. Validity is a property of the config and the config does
 * not change between generations, so folding validation in would mean paying
 * `O(config)` per generation for a property that could not have changed — on
 * every resize, every reroll, every frame of an editor preview.
 */
export function generate(
  config: TilesetConfig,
  seed: string,
  loadSalt = 0,
): Grid<TileState> {
  const { rows, columns } = config;

  // Stage 1 runs once per generation (02 §6.6, §6.7).
  const seedU32 = stage1(seed);

  // Each channel resolves an effective seed BEFORE Stage 2 mixes position into
  // it. Resolving it here rather than inside a Source is deliberate: a Source
  // handed the raw seed would silently ignore its own Operation's flag (ADR-002).
  const loadMixed = mixLoad(seedU32, loadSalt);
  const effectiveOp = (op: Operation): number => (op.reseedOnLoad ? loadMixed : seedU32);
  const effectiveAssets = config.reseedAssetsOnLoad ? loadMixed : seedU32;

  const prepared: PreparedOperation[] = config.operations.map((op) => ({
    op,
    selection: selections.get(op.selection.type),
    source: sources.get(op.source.type),
    blend: blends.get(op.blend),
    ctx: {
      rows,
      columns,
      effectiveSeed: effectiveOp(op),
      operationId: op.id,
      salt: op.salt ?? 0,
    },
  }));

  // Sorting a Tile's assets is O(a log a) and cannot change during a generation,
  // so it is hoisted out of the per-cell walk (03 §4.2).
  const tiles = new Map<string, PreparedTile>();
  for (const tile of config.tiles) tiles.set(tile.id, prepareTile(tile));

  const assetSalt = config.assetSalt ?? 0;
  const cells: TileState[] = new Array(rows * columns);

  // Row-major, matching 07 R10's paint order. Any order would do -- every step is
  // a pure function of (x, y), so cells may be evaluated in any order or in
  // parallel (02 §9) -- but only the renderer's paint order is observable.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      cells[y * columns + x] = generateCell(x, y, prepared, tiles, effectiveAssets, assetSalt);
    }
  }

  return { rows, columns, cells };
}

/** `02` §9's evaluation model, with the mapping step `04` §3.1 inserts. */
function generateCell(
  x: number,
  y: number,
  prepared: PreparedOperation[],
  tiles: Map<string, PreparedTile>,
  effectiveAssets: number,
  assetSalt: number,
): TileState {
  // Step 1 -- initialize to defaults. tileId is null and a fresh grid is empty;
  // Operations paint into it (02 §8.1). Defaults belong to the attribute, never
  // to the Tile (03 D8), which is what keeps this step well-defined before any
  // tileId exists.
  const state = initialTileState();

  // Step 2 -- each Operation in stack order, blending onto the accumulated state.
  for (const { op, selection, source, blend, ctx } of prepared) {
    // (a) Is this cell in the Operation's Selection?
    if (!selection.impl(op.selection as Record<string, unknown>, x, y, ctx)) continue;

    // (b) The Source's number, in [0, 1). Asserted against X6 in dev builds.
    const t = evalSource(source, op.source as Record<string, unknown>, x, y, ctx);

    // (b') Mapping. O1: a Blend never sees a raw [0, 1) value, and a Target never
    // receives an unmapped one. The shape is discriminated by `target` (C8).
    if (op.target === "tileId") {
      if (!isTileMapping(op.mapping)) continue; // undefined behaviour under C5
      const v = applyTileMapping(op.mapping, t);
      // (c) Only `set` accepts the tile type (04 §7.2), so this is an assignment.
      // (d) does not apply: D5 and D6 govern attribute values, and tileId is
      // structural rather than numeric.
      state.tileId = blend.impl(v, state.tileId) as string | null;
    } else {
      if (isTileMapping(op.mapping)) continue; // undefined behaviour under C5
      const attr = op.target as AttributeName;
      const v = applyNumericMapping(op.mapping, t);
      // (c) Blend the mapped value onto the Target's current value.
      const blended = blend.impl(v, state[attr]) as number;
      // (d) Reject non-finite (D6), then bound (D5) -- immediately, per write,
      // never at emit.
      writeAttribute(state, attr, blended);
    }
  }

  // Step 3 -- resolve assetId from tileId via the weight walk (02 §10).
  //
  // A cell with tileId null resolves no asset and assetId stays null (03 §6.4,
  // G4). This is distinct from opacity 0, where a real asset IS resolved and the
  // drawable is merely transparent -- keeping them apart matters because opacity
  // is a normal attribute a later Operation can raise, whereas tileId null has
  // nothing to raise.
  if (state.tileId !== null) {
    const tile = tiles.get(state.tileId);
    if (tile !== undefined) {
      const h = hash(effectiveAssets, ASSET_CHANNEL, x, y, assetSalt);
      state.assetId = walkWeights(tile, h)?.id ?? null;
    }
    // A tileId resolving to no Tile is a dangling reference -- DANGLING_TILE_REF
    // at validation (06 §10.3). generate() trusts (C5), so assetId stays null.
  }

  // Step 4 -- emit.
  return state;
}
