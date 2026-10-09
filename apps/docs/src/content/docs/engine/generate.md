---
title: generate.ts
description: The engine. A pure function from (config, seed, loadSalt) to a grid of TileStates.
sidebar:
  order: 4
---

**Written from:** `packages/tileset/src/generate.ts`, `generate.test.ts`, and the call site in
`render/breakpoints.ts` (reached from `render/Tileset.svelte`).

## Overview

The generator is the engine. Given a tileset's configuration, a seed string and a per-load number,
it works out, for every cell of the grid, which tile goes there, which of that tile's assets is
drawn, and how it is scaled, rotated, faded and moved. It returns that as a plain grid of values.
It does not draw anything.

It does this by starting each cell empty and running the tileset's operations over it in order.
Each operation picks some cells, draws a number for each one, turns that number into a value, and
combines it with what is already there. Finally, each cell that ended up with a tile is given one of
that tile's assets, chosen by weight.

The same inputs always give the same output, on any machine. It sits in the middle of the pipeline:
file → load → **generate** → draw. Nothing outside the engine calls it except the renderer's grid
cache.

## In detail

### Purpose

`generate.ts` implements the evaluation model: initialize every cell to the attribute defaults,
apply each Operation in stack order (select → source → map → blend → bound), then resolve
`assetId` from `tileId` by the weight walk, and emit. Its header states two invariants: output
depends on `(config, seed, loadSalt)` and nothing else (no clock, no `Math.random()`, no ambient
state), and the engine never touches a graphical resource, since `TileState` carries identifiers
only.

### Public surface

| Function | Signature | Validates? |
| --- | --- | --- |
| [`generate`](/api/index/functions/generate/) | `(config: TilesetConfig, seed: string, loadSalt = 0) → Grid<TileState>` | **no** |

`generateCell` and the `PreparedOperation` interface are module-private.

### Inputs → outputs

**Parameters.**

- `config` is a `TilesetConfig`, never the whole file. The file's shape keeps pixels out of
  `config`, so passing it whole is safe and passing a `TilesetFile` is a type error.
- `seed` is a string, required, and a runtime parameter. The engine never falls back to
  `config.defaultSeed`; the caller decides.
- `loadSalt` is a `uint32` the caller draws once per load and holds for the whole generation. It is
  never a config field.

**Per generation (hoisted out of the cell loop).**

1. `effectiveSeeds(seed, loadSalt)` gives `{plain, onLoad}`. The asset channel's seed is
   `pickSeed(seeds, config.reseedAssetsOnLoad)`.
2. Each Operation is prepared once: its Selection, Source and Blend registrations, and its
   `operationCtx`. An unknown type name throws at the registry lookup.
3. Each Tile is prepared once with `prepareTile` (assets sorted, weights summed), keyed by id.
4. `assetSalt` defaults to `0`.

**Per cell**, row-major (`generateCell`):

| Step | What happens | Branches |
| --- | --- | --- |
| 1 | `initialTileState()`: `tileId` and `assetId` `null`, attributes at their defaults. | — |
| 2a | `selection.impl(params, x, y, ctx)`. | Not selected → next Operation. |
| 2b | `evalSource(...)` gives `t` in `[0, 1]` closed (asserted in `DEV`). | — |
| 2b′ | `target === "tileId"`: `applyTileMapping`, then `blend.impl(v, state.tileId)`. | A numeric mapping on `tileId` is skipped (`continue`). |
| 2c–d | Otherwise: `applyNumericMapping`, `blend.impl(v, state[attr])`, then `writeAttribute`, which drops a non-finite result and bounds the value. | A palette mapping on an attribute is skipped (`continue`). |
| 3 | If `tileId` is non-null and names a Tile: `hash(effectiveAssets, "asset", x, y, assetSalt)` → `walkWeights` → `assetId`. | `tileId` null → `assetId` stays null. Dangling `tileId` → `assetId` stays null. |
| 4 | Emit. | — |

Output: `{ rows, columns, cells }` with `cells.length === rows * columns`.

### Invariants

- **Purity (stated as G1 in the header).** Same triple, same result, everywhere. `loadSalt` does
  not weaken this; it is an input, not a measurement.
- **No validation (cited as C5).** Behaviour on an invalid config is undefined. Validity is a
  property of the config, which does not change between generations, so checking it here would
  cost `O(config)` on every resize, reroll and editor frame for nothing.
- **Mapping always sits between Source and Blend (cited as O1).** A Blend never sees a raw
  `[0, 1]` value.
- **Bounding happens per write, never at emit.** `writeAttribute` is called inside the stack loop.
- **`tileId: null` and `opacity: 0` stay distinct.** A null cell resolves no asset. A transparent
  cell resolves a real asset, because a later Operation can raise opacity, while null has nothing
  to raise.
- **Effective seeds are resolved before any Source runs**, so a Source cannot ignore its own
  Operation's `reseedOnLoad` flag by hashing against the raw seed.

### Callers / callees

| Caller | How |
| --- | --- |
| `render/breakpoints.ts:60` | `GridCache.get` calls `generate(config, seed, loadSalt)` once per `rows × columns` seen, and clears its cache when the base config, seed or `loadSalt` changes. |
| `render/Tileset.svelte:349–351` | Creates the `GridCache` and derives `grid` from `gridCache.get(checked.config, config, effectiveSeed, loadSalt)`. |
| `apps/editor`, `apps/demo` | **Not callers.** Grep finds no direct call; both draw through `<Tileset>`. |

Callees: `initialTileState`, `writeAttribute` (`attributes.ts`); `prepareTile`, `walkWeights`
(`assets.ts`); `operationCtx` (`ctx.ts`); `effectiveSeeds`, `pickSeed`, `hash`, `ASSET_CHANNEL`
(`hash.ts`); `applyNumericMapping`, `applyTileMapping`, `isTileMapping` (`mapping.ts`);
`selections`, `sources`/`evalSource`, `blends` (`registry/`).

### Tests: `generate.test.ts`

- **Shape and defaults.** `rows × columns` cells exist; an empty config yields all-null cells;
  every cell starts at the defaults.
- **Determinism.** A repeated triple is `toEqual`; a new seed moves every cell of a random rotation.
- **D6.** A `multiply` chain that overflows to `Infinity` still emits finite values that survive
  `JSON` round-trip.
- **Stack composition.** An Operation keeps its own randomness when moved in the stack; later wins
  under `set`; a `null` palette entry clears; a salt change rerolls one Operation only.
- **Selections.** Unselected cells keep defaults; cells the renderer will clip are still evaluated.
- **Asset resolution.** Every painted cell gets an `assetId`; null `tileId` gives null `assetId`;
  `opacity: 0` still resolves an asset; `assetSalt` rerolls assets without touching Operations;
  distribution follows weights; `scale` scales both axes from one number.
- **`loadSalt`.** A worked example where only the flagged Operation differs between loads; no flag
  means identical loads; `loadSalt 0` is ordinary, not identity; flagged channels move together but
  stay uncorrelated; the asset channel rerolls only under `reseedAssetsOnLoad`.
- **End to end.** A noise field banded through a palette; a 40 × 40 grid generates in under 500 ms.
- **Gradients reach both ends** of their range: over the grid, over a `rect`, diagonally, through
  a palette (last entry, not null), over a `cellList`'s bounding box, and over a `rect` past the grid
  edge without its midpoint moving.
- **`translateX` / `translateY`.** Adding them moves no other attribute; jitter stays within the
  mapped window; the domain is open (`-40` is kept).

### Gotchas & rejected alternatives

- **Evaluation order is free; storage order is not.** Every step is a pure function of `(x, y)`, so
  cells could be computed in any order or in parallel. Row-major is chosen because only the
  renderer's paint order is observable.
- **Mismatched mapping shapes are skipped silently.** The two `continue`s are commented as
  "undefined behaviour under C5". Validation is what prevents them.
- **A dangling `tileId` is not an error here.** It is `DANGLING_TILE_REF` at validation; the engine
  leaves `assetId` null.
- **`tileId` is never bounded.** Only `set` accepts the tile type, so the blend is an assignment,
  and bounding governs numeric attributes only.

### Review notes

None found.
