---
title: selection.ts
description: The engine's answer to "which cells does this Operation act on?", returned as a predicate, so the editor implements no Selection test.
sidebar:
  order: 7
---

**Written from:** `packages/tileset/src/selection.ts`, `selection.test.ts`, and the call sites in
`apps/editor/src/orphans.ts` and `apps/editor/src/lib/SelectionOverlay.svelte`.

## Overview

The selection module answers one question for the editor: which cells does a given operation pick?
The editor draws an outline over those cells so the author can see what they are about to change.
Rather than the editor working this out on its own, it asks the engine, using exactly the same
inputs the generator receives.

It returns a yes/no test that can be asked about any cell. Because it uses the engine's own code,
the outline always matches the picture: a random selection highlights the same cells the generator
will actually paint, including under a per-load reroll.

It sits beside generate rather than inside the pipeline. The renderer never calls it; the editor's
overlay and its "will this resize break something" check do.

## In detail

### Purpose

`selection(config, operationId, seed, loadSalt = 0)` finds the named Operation, builds its
`EvalCtx` through the same `operationCtx` that `generate()` uses, and returns
`selectionPredicate(op, ctx)`: a predicate that is true where any of the Operation's selection
layers matches (B-033). The header names the rule it obeys,
**E8**: the cells an overlay covers come from the engine package, and the editor contains no
implementation of any Selection's test.

### Public surface

| Function | Signature | Validates? |
| --- | --- | --- |
| [`selection`](/api/index/functions/selection/) | `(config: TilesetConfig, operationId: string, seed: string, loadSalt = 0) → (x: number, y: number) => boolean` | **no**, except the id lookup |
| `selectionPredicate` | `(op: Operation, ctx: EvalCtx) → (x: number, y: number) => boolean` | **no**. Exported from `selection.ts` for `generate.ts`; not re-exported by `index.ts`. |

**`selectionPredicate(op, ctx)`** (B-033) is the one place an Operation's layers are combined. It
resolves every layer's registration and context once per Operation, never per cell, and returns a
predicate that tries the layers in order and stops at the first match. Layer 0 gets `ctx` itself;
layer `i ≥ 1` gets a copy of `ctx` whose `operationId` is `layerOwner(op.id, i)` (`opId:i`). With
one layer it returns the layer's own test without the loop. `generate()` calls it too
(`PreparedOperation.selected`), so the overlay and the picture cannot combine layers differently
(**E8**).

### Inputs → outputs

- `config` is the same `TilesetConfig` `generate()` takes, never the whole file.
- `seed` is the run's seed string. The caller applies `defaultSeed`, not this function.
- `loadSalt` should be the preview's, so the overlay agrees with the preview at that load.
- **Unknown `operationId`** → throws `No Operation with id "<id>" in this config. Present: <ids>.`
  (or `(none)`).
- **Unknown Selection type** in any layer → `selections.get` throws.
- The seed, ctx and every layer's registration are resolved **once**, outside the returned
  closure.
- The predicate is **total and unbounded in `(x, y)`**: it answers outside `rows × columns` and at
  negative coordinates rather than throwing or clamping. Callers bound it at the draw site.

### Invariants

- **Agreement with `generate()`, cell for cell.** It resolves the effective seed and the selection
  channel exactly as `generate()` does, through the shared `operationCtx` and `pickSeed`, and it
  combines the layers through the same `selectionPredicate` (B-033).
- **A `random` layer's channel is by position** (Pol, B-033 Block 1). Layer 0 hashes on the
  Operation's own `opId:selection`, exactly as a lone Selection did, so a v5 file migrated to a
  one-item list draws byte-identically and adding a second layer never moves the first one's
  scatter. Layer `i ≥ 1` hashes on `opId:i:selection`; without that, two `random` layers at the
  same density would select the same cells. Deleting or moving a layer reshuffles the `random`
  layers after it, which the source accepts like a reroll.
- **No validation** beyond the lookup, on the same reasoning as `generate()`.
- **Moves no output.** Adding the export was a minor engine bump, with no `schemaVersion` change.

### Callers / callees

| Caller | Use |
| --- | --- |
| `apps/editor/src/lib/SelectionOverlay.svelte:78` | `selection(config, operationId, seed, loadSalt)` per draw, to outline the selected cells. |
| `apps/editor/src/orphans.ts:100` | `orphans()` calls `selection(config, op.id, seed, loadSalt)` for each coordinate-bound Operation and counts the cells it reaches inside `rows × columns`. |
| `apps/editor/src/lib/PaintLayer.svelte:17` | Comment only: it reads the selection back through this export rather than from its own list. |

No caller in `packages/tileset/src` (other than its test) or `apps/demo/src`.

`selectionPredicate` is also called by `generate.ts:79`, once per Operation.

Callees: `operationCtx` (`ctx.ts`), `effectiveSeeds` and `layerOwner` (`hash.ts`), `selections.get`
(`registry/selections.ts`).

### Tests: `selection.test.ts`

The oracle is `generate()` itself: a one-entry palette painted with a `constant` Source makes a
cell non-null exactly when the Selection included it.

- **Agreement** with `generate()` for every V1 preset: `all`, `rect`, `checkerboard` (both
  parities), `rowColumn` (column, and row with offset), `everyNth` (row-major, with offset),
  `random`, and `cellList` with a duplicate. Also three layers, a `rect` and two `random` (B-033),
  which proves each layer's channel is resolved as `generate()` resolves it, not only the
  Operation's own.
- **Not vacuous:** a 3 × 4 `rect` selects exactly 12 cells and leaves some unselected.
- **`random`** draws from the selection channel, not the Source channel; moves with the
  Operation's salt and with the seed.
- **Effective seed:** a flagged Operation follows `loadSalt` and agrees with `generate()`; an
  unflagged one holds still; `loadSalt 0` is ordinary; `loadSalt` defaults to `0`.
- **Unbounded:** answers outside `rows × columns`, and at negative coordinates for `all`.
- **Purity and lookup:** repeated calls agree; the named Operation is picked from a stack, not the
  first; an unknown id throws; an unknown Selection type throws.
- The same file also tests `operationCtx` and the extent over several layers; see
  [ctx.ts](/engine/ctx/).
- **Selection layers (B-033):** two layers select every cell either selects; a `random` layer 0
  next to an empty `rect` selects exactly what the same `random` alone does; a later `random`
  layer selects different cells, and two together select more than one; layer 1 matches the
  hand-written rule `hash(stage1(seed), "op1:1:selection", x, y, 0) < density`, cell for cell.

### Gotchas & rejected alternatives

- **Rejected: diffing two grids.** Generating with and without the Operation and highlighting the
  difference shows *effect*, not *selection*. An Operation can select a cell and write the value
  already there (`multiply` by one, the same tile, a `set` of the default), and those cells would
  vanish from the overlay. It would also cost two generations per frame.
- **Rejected: a predicate that answers `false` for an unknown id.** That is an empty overlay,
  indistinguishable from a Selection that legitimately matches nothing, on the screen where the
  author is judging exactly that. A plausible wrong answer is worse than a stack trace.
- **Unbounded on purpose.** A `rect` may extend past the grid, and an author dragging one needs to
  see where it reached.
- **Rejected: a stable per-layer id saved in the file** to name a layer's channel. It would be an
  extra key on every layer for a property nobody asked for.
- **Why rewrite `operationId` rather than add a field.** `EvalCtx` is closed by **O4**, and a field
  read only by a layered `random` would be one every Source and renderer must carry. Only a
  Selection ever sees a layer's ctx; the Source still gets the Operation's, and a Selection reads
  `operationId` only to name its channel.

### Review notes

None found.
