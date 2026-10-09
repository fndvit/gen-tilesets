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

`selection(config, operationId, seed, loadSalt = 0)` finds the named Operation, resolves its
Selection registration and its `EvalCtx` through the same `operationCtx` that `generate()` uses,
and returns `(x, y) => registration.impl(params, x, y, ctx)`. The header names the rule it obeys,
**E8**: the cells an overlay covers come from the engine package, and the editor contains no
implementation of any Selection's test.

### Public surface

| Function | Signature | Validates? |
| --- | --- | --- |
| [`selection`](/api/index/functions/selection/) | `(config: TilesetConfig, operationId: string, seed: string, loadSalt = 0) → (x: number, y: number) => boolean` | **no**, except the id lookup |

### Inputs → outputs

- `config` is the same `TilesetConfig` `generate()` takes, never the whole file.
- `seed` is the run's seed string. The caller applies `defaultSeed`, not this function.
- `loadSalt` should be the preview's, so the overlay agrees with the preview at that load.
- **Unknown `operationId`** → throws `No Operation with id "<id>" in this config. Present: <ids>.`
  (or `(none)`).
- **Unknown Selection type** → `selections.get` throws.
- The seed, ctx and registration are resolved **once**, outside the returned closure.
- The predicate is **total and unbounded in `(x, y)`**: it answers outside `rows × columns` and at
  negative coordinates rather than throwing or clamping. Callers bound it at the draw site.

### Invariants

- **Agreement with `generate()`, cell for cell.** It resolves the effective seed and the selection
  channel exactly as `generate()` does, through the shared `operationCtx` and `pickSeed`.
- **No validation** beyond the lookup, on the same reasoning as `generate()`.
- **Moves no output.** Adding the export was a minor engine bump, with no `schemaVersion` change.

### Callers / callees

| Caller | Use |
| --- | --- |
| `apps/editor/src/lib/SelectionOverlay.svelte:78` | `selection(config, operationId, seed, loadSalt)` per draw, to outline the selected cells. |
| `apps/editor/src/orphans.ts:91` | `orphans()` calls `selection(config, op.id, seed, loadSalt)` for each coordinate-bound Operation and counts the cells it reaches inside `rows × columns`. |
| `apps/editor/src/lib/PaintLayer.svelte:17` | Comment only: it reads the selection back through this export rather than from its own list. |

No caller in `packages/tileset/src` (other than its test) or `apps/demo/src`.

Callees: `operationCtx` (`ctx.ts`), `effectiveSeeds` (`hash.ts`), `selections.get`
(`registry/selections.ts`).

### Tests: `selection.test.ts`

The oracle is `generate()` itself: a one-entry palette painted with a `constant` Source makes a
cell non-null exactly when the Selection included it.

- **Agreement** with `generate()` for every V1 preset: `all`, `rect`, `checkerboard` (both
  parities), `everyNth` (column, and row with offset), `random`, and `cellList` with a duplicate.
- **Not vacuous:** a 3 × 4 `rect` selects exactly 12 cells and leaves some unselected.
- **`random`** draws from the selection channel, not the Source channel; moves with the
  Operation's salt and with the seed.
- **Effective seed:** a flagged Operation follows `loadSalt` and agrees with `generate()`; an
  unflagged one holds still; `loadSalt 0` is ordinary; `loadSalt` defaults to `0`.
- **Unbounded:** answers outside `rows × columns`, and at negative coordinates for `all`.
- **Purity and lookup:** repeated calls agree; the named Operation is picked from a stack, not the
  first; an unknown id throws; an unknown Selection type throws.
- The same file also tests `operationCtx`; see [ctx.ts](/engine/ctx/).

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

### Review notes

None found.
