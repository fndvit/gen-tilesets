---
title: assets.ts
description: Picks which TileAsset of a Tile a cell draws, by a weight walk over the assets in canonical id order.
sidebar:
  order: 10
---

**Written from:** `packages/tileset/src/assets.ts`, `assets.test.ts`, and the call sites in
`generate.ts` and `apps/editor/src/lib/TileLibrary.svelte`.

## Overview

The assets module decides which drawing of a tile a cell shows. A tile can have several assets (alternative drawings),
each with a weight that says how often it should appear. Once the generator knows a cell holds,
say, a leaf, this module takes a random number for that cell and walks down the leaf's assets,
adding up weights until the number is passed.

The assets are always walked in alphabetical order of their ids, never in the order they happen
to be listed. That way, dragging an asset up or down a list in the editor does not reshuffle the
canvas.

It runs at the very end of generate, after all operations, for every cell that has a tile.

## In detail

### Purpose

`assets.ts` implements the weight walk: sort a Tile's assets canonically, sum their weights once
per generation, and for each cell select the first asset whose cumulative weight strictly exceeds
`h * total`, where `h` comes from the asset hash channel.

### Public surface

| Symbol | Signature |
| --- | --- |
| [`canonicalAssets`](/api/index/functions/canonicalassets/) | `(tile: Tile) → TileAsset[]`, a sorted copy |
| [`PreparedTile`](/api/index/interfaces/preparedtile/) | `{ assets: TileAsset[]; total: number }` |
| [`prepareTile`](/api/index/functions/preparetile/) | `(tile: Tile) → PreparedTile` |
| [`walkWeights`](/api/index/functions/walkweights/) | `(prepared: PreparedTile, h: number) → TileAsset \| undefined` |

### Inputs → outputs

- `canonicalAssets` copies the array and sorts ascending by `id` with `<` / `>` (UTF-16 code
  units). The input Tile is not mutated.
- `prepareTile` returns the sorted assets and the sum of their weights.
- `walkWeights` takes `h` in `[0, 1)`. It returns the first asset with `cumulative > h * total`.
  It returns `undefined` if the walk falls off the end, which for a validated config cannot happen
  (weights sum above zero and `h < 1`). `generate.ts` maps `undefined` to `assetId: null`.

### Invariants

- **Canonical order (D3).** Accumulation needs an order, and the config's arrangement would make a
  drag in the editor reshuffle the canvas.
- **Code-unit comparison, never `localeCompare` or `Intl.Collator`.** Locale collation differs
  between machines, which would break determinism as thoroughly as using `*` instead of
  `Math.imul`. Identifiers are `[A-Za-z0-9_-]+`, so there are no surrogate pairs.
- **Strict comparison.** A zero-weight asset never advances `cumulative`, so it never wins.
- **Weights are relative.** They need not sum to 1, 100 or anything.
- **Sorting is hoisted.** Per cell it would be `O(rows × columns × a log a)` for a result that
  cannot change during a generation.

### Callers / callees

| Symbol | Caller |
| --- | --- |
| `prepareTile` | `generate.ts:85`, once per Tile per generation |
| `walkWeights` | `generate.ts:158` |
| `canonicalAssets` | `assets.ts:43` (inside `prepareTile`); `apps/editor/src/lib/TileLibrary.svelte:232`, so the editor lists assets in the engine's order rather than a local sort |

No callees beyond types.

### Tests: `assets.test.ts`

- **Canonical order:** sorts by id ascending; compares by UTF-16 code unit, not locale; makes the
  walk independent of the config's arrangement.
- **The walk:** reproduces the archived worked example; shows a cell moving although its own
  asset's weight never changed; never selects a zero-weight asset, including one sorted first; is
  total for every `h` in `[0, 1)` including the hash's largest value; falls off the end at
  `h = 1.0`; honours relative weights.
- **A spec discrepancy, pinned.** The archived illustration claims that raising asset A from 0.5 to
  0.7 flips a cell at `h = 0.6` from B to A. Under the walk the total becomes 1.2, the target 0.72,
  and the cell stays B. The test asserts `"B"` and records why.

### Gotchas & rejected alternatives

- **Known behaviour, not a defect:** thresholds derive from all weights together, so editing any
  one weight moves the boundaries under every cell of that Tile. Mitigations cost more than the
  problem is worth at this scale.
- **The `undefined` return is the undefined-behaviour edge**, not a handled case; `generate()`
  trusts its input.

### Review notes

- `walkWeights`'s docstring and its fall-off comment justify `h < 1` by citing X6. Elsewhere
  (`mapping.ts`, `generate.ts`, `registry/sources.ts`) X6 is now the Source bound `[0, 1]` closed.
  The asset channel's `h` comes from `hash()`, which is still `[0, 1)`, so the walk is still total;
  only the citation is out of date. The test title *"falls off the end at h = 1.0, which is why X6
  forbids it"* has the same staleness.
