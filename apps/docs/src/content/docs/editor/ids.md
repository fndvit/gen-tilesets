---
title: ids.ts
description: Generated identifiers for Tiles, TileAssets and Operations. Opaque prefix-plus-counter ids, found by scanning what the file already holds.
sidebar:
  order: 6
---

**Written from:** `apps/editor/src/ids.ts`, `library.test.ts` (the *generated ids* block), and
the call sites in `App.svelte` and `lib/TileLibrary.svelte`.

## Overview

The ids module names things the author creates. Every tile, every picture inside a tile, and
every operation needs an internal identifier. The author never types one. This module hands out
short ids such as `t3`, `a2` or `op7` by looking at the ids already in use and picking the next
number up.

Getting this right matters for more than tidiness. The engine draws each operation's randomness
from its id, so two operations sharing an id would produce matching patterns with no error
anywhere. The ids are counters rather than the author's names because the author can rename
things freely, and an id must never change.

In the editor's pipeline, import → document → draft/history → preview → export, this is used when
something new enters the document: dropped pictures and new operations.

## In detail

### Purpose

`ids.ts` generates `Tile.id`, `TileAsset.id` and `Operation.id`. They match `[A-Za-z0-9_-]+`,
exclude the colon, and are unique within the scope the schema fixes:

| Id | Unique within |
| --- | --- |
| `Tile.id` | the library |
| `TileAsset.id` | its Tile |
| `Operation.id` | the stack |

### Public surface

| Export | Signature | Prefix |
| --- | --- | --- |
| `nextTileId(taken)` | `(readonly string[]) → string` | `t` |
| `nextAssetId(taken)` | `(readonly string[]) → string` | `a` |
| `nextOperationId(taken)` | `(readonly string[]) → string` | `op` |
| `nextIds(count, taken, next)` | `(number, readonly string[], (taken) → string) → string[]` | n/a |
| `IDENTIFIER` | `/^[A-Za-z0-9_-]+$/` | Used by tests to assert the output. |

Each allocator takes **the ids in scope**, not the objects carrying them. That keeps one shape
across all three and lets `nextIds` thread a growing list.

### Inputs → outputs

The private `nextId(prefix, taken)` builds `^<prefix>(\d+)$`. It takes the highest matching number
in `taken` (0 if none) and returns `prefix + (highest + 1)`. Ids that do not match the pattern,
such as `"grass"` or `"water-2"`, are ignored rather than rejected: an imported file may carry any
legal identifier, and this only has to avoid colliding with them.

`nextIds` copies `taken`, then `count` times calls `next(running)` and pushes the result. So one
batch never repeats an id.

### Invariants

- **`Operation.id` uniqueness is correctness.** Both of an Operation's hash channels are
  namespaced by its id. Two Operations sharing one return identical Source values everywhere and
  agreeing `random` Selections: *"a picture that looks oddly aligned with itself, with no error
  anywhere."*
- **No colon.** The selection channel is built as `operationId + ":selection"`, so an Operation
  named `op7:selection` would occupy `op7`'s channel.
- **Never reassigned**, including through duplication. A duplicate gets a new id, which is why
  it looks different. *"A duplicate that looked identical would be one that shared a hash
  channel."*
- **Opaque counters, not slugs.** A name-derived id would disagree with its own Tile after a
  rename, and the editor must never block a rename.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `App.svelte:637` | `nextOperationId(config.operations.map((o) => o.id))` when a create-draft opens |
| `lib/TileLibrary.svelte:87-91` | `nextIds(files.length, tiles.map(t => t.id), nextTileId)` for a drop on the library |
| `lib/TileLibrary.svelte:98` | `nextAssetId([])`: a new Tile's first asset is always `a1` |
| `lib/TileLibrary.svelte:110-114` | `nextIds(files.length, tile.assets.map(a => a.id), nextAssetId)` for a drop onto a Tile |

Callees: none. The package's `validate.ts:99` has its own private copy of the same `IDENTIFIER`
regex.

### Tests

There is no `ids.test.ts`. `library.test.ts` (block *generated ids*, lines 44–74) pins:

- all three match `IDENTIFIER` and contain no colon;
- no collision with taken ids (`["t1", "t2"]` → `t3`, `["a1", "a4"]` → `a5`, `["op7"]` → `op8`);
- non-matching ids are ignored (`["grass", "water-2", "t3"]` → `t4`; `["grass", "water"]` → `t1`);
- a batch of four from `["t1"]` is `t2…t5`, all distinct;
- after deleting `t2` from `t1, t2, t3`, the next id is `t4`.

### Gotchas & rejected alternatives

- **Rejected: a counter held beside the document.** It would be editor state with nowhere legal to
  live. `meta` is forbidden and every other option is postponed. *"The file already carries the
  answer."*
- **Ids collide across documents by construction.** Every session allocates `t1`, `t2`, … from
  scratch. That is why [assets.ts](/editor/assets/)' `replaceAll` swaps the store wholesale rather
  than clearing and re-attaching.

### Review notes

- The header promises an id is *never reassigned*, and the test *"never reuses an id after a
  deletion"* only deletes a middle id. Scanning for the highest current number reuses the
  **highest** id once it is deleted. Remove `op3` from `[op1, op2, op3]` and the next Operation
  is `op3` again; likewise for `t…` and `a…`. Nothing dangles, because a referenced Tile cannot
  be deleted. But a new Operation then draws with the deleted one's hash channels. The source
  does not say whether that matters. (possible bug)
- `IDENTIFIER` duplicates `packages/tileset/src/validate.ts:99`, which is not exported, so the two
  can drift. (inconsistency)
