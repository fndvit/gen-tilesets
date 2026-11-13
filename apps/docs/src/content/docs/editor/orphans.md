---
title: orphans.ts
description: The destructive edit's two halves. Name the Operations a width change puts at risk, then report the ones it orphaned.
sidebar:
  order: 9
---

**Written from:** `apps/editor/src/orphans.ts`, `orphans.test.ts`, and the call sites in
`App.svelte`.

## Overview

The orphans module protects work that a grid change could quietly break. Some operations are
tied to exact grid positions: a rectangle at columns 0 to 7, or a hand-painted list of cells.
Changing the design width, the cell size or the alignment changes the number of columns. Those
positions can then point at the wrong place, or at nothing at all.

The module does two things. **Before** such a change, it lists the operations at risk, so the
editor can ask the author to confirm and name what will be affected. **After** the change, it
reports any operation that no longer reaches the cells it was drawn for, until the author deals
with it.

It never fixes anything itself. There is no right way to guess what the author meant, so undo is
the repair.

In the editor's pipeline, import → document → draft/history → preview → export, this sits beside
the document and history. It reads the current file and feeds the confirmation dialogue and the
advisories shown next to the preview.

## In detail

### Purpose

`orphans.ts` implements invariant **E12**, quoted in its header: changing `referenceWidth`,
`cellSize` or `horizontalAlignment` re-derives `columns` and *requires explicit confirmation
whenever the config holds a coordinate-bound Selection. The confirmation names the Operations
that will be affected.* The response has three parts, and this file supplies the first two:

1. Before the change, `atRisk` names the affected Operations.
2. After it, `orphans` reports each affected Operation as an advisory.
3. `session.undo()` restores the file whole, and is the only repair.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `atRisk(config)` | `(TilesetConfig) → Operation[]` | Operations with any coordinate-bound selection layer, per the engine's `isCoordinateBound`. |
| `needsConfirmation(config)` | `(TilesetConfig) → boolean` | `atRisk(config).length > 0` |
| `Orphan` | interface | `{ operationId, selectionType, reachable, authored?, outside?, empty }`. `selectionType` is the layer types joined with `" + "` (`selectionTypes` from [layers.ts](/editor/layers/)), so a one-layer selection reads `"rect"` as before. `outside` is set only for a selection of more than one layer (B-033). |
| `orphans(config, seed, loadSalt = 0)` | `(TilesetConfig, string, number) → Orphan[]` | Coordinate-bound Operations that no longer reach what they were authored to. |
| `outsideCells(op, config)` | `(Operation, {rows, columns}) → [x, y][]` | The painted list's entries outside the grid (`0 ≤ x < columns`, `0 ≤ y < rows`), as the list's own arrays; empty for a selection with no list. Every Handpick layer's outside entries, in layer order (B-033). Batch 01, T-05. |
| `cameWithFile(op, config, opened)` | `(Operation, TilesetConfig, TilesetFile \| null) → boolean` | Whether the loss was already there in the file as opened, so Undo cannot repair it. Batch 01, T-05. |

**`outsideCells` is the grid's extent, not a Selection test.** **E8** keeps "which cells does this
Selection match" in the engine; "where does the grid end" is two fields of the file. It is stated
once here, for the notice's Remove action (`trimToGrid` in [document.ts](/editor/document/)) and
for `cameWithFile`.

**`cameWithFile`** (B-014: after an import, the notice said "Undo puts the grid back", and Undo
went back to the previous document instead). For a painted list: true when every cell now outside
the grid was in the opened file's list for that operation id *and* outside that file's grid, so a
cell a later resize pushed out keeps the Undo wording. A selection with any Handpick layer takes
this branch, over the outside cells of all its layers (B-033). For a `rect` (or any other bound
Selection): true while neither it nor the grid has changed since the open. `false` when nothing
was opened, when the opened file has no Operation with this id, or when the two selections' layer
types (`selectionTypes`) differ.

Engine: [`selection`](/api/index/functions/selection/),
[`isCoordinateBound`](/api/index/functions/iscoordinatebound/),
[`TilesetConfig`](/api/index/interfaces/tilesetconfig/),
[`Operation`](/api/index/interfaces/operation/).

### Inputs → outputs

**`atRisk`** filters `config.operations` by `isCoordinateBound(op.selection)`, which is true when
any layer's registration is coordinate-bound (B-033) and treats an unknown type as not bound
rather than throwing.

**`orphans`**, for each at-risk Operation:

1. `includes = selection(config, op.id, seed, loadSalt)`, the engine's own predicate.
2. `reachable` is the count of `(x, y)` in `[0, columns) × [0, rows)` where `includes(x, y)`.
3. `authored` is the total length of every layer's `cells` list, read with `cellsOf` from
   [layers.ts](/editor/layers/). With no list in any layer it is absent.
4. For a selection of more than one layer that has a list, `outside` is
   `outsideCells(op, config).length`. Otherwise it is absent, and a one-layer selection reads
   exactly as before layers existed.
5. The Operation is reported if `reachable === 0`, or if it lost some: `outside > 0` when
   `outside` is defined, otherwise `authored` defined and `reachable < authored`. `empty` is
   `reachable === 0`.

**Why `outside` for layers** (B-033): for several layers, `authored − reachable` is not the
loss. A `rect`
layer reaches cells nobody painted, and two Handpick layers may paint the same cell. For a single
list the subtraction is the loss, as before.

A `rect` that only partly overhangs the grid is **not** reported. Only one that reaches nothing
is. `authored` and `outside` are spread in or omitted rather than set to `undefined`, because under
`exactOptionalPropertyTypes` an absent key is what means *no countable extent*.

### Invariants

- **Read from the registry's `coordinateBound` declaration** (through `isCoordinateBound`, which
  asks it of every selection layer), never a list of names. A Selection registered later would
  otherwise be silently exempted from the confirmation.
- **Confirmation only where something is at risk.** *"A dialogue that appears every time teaches
  the author to dismiss it before reading."* An empty `atRisk` means the edit applies directly.
- **E8: cell counts come from `selection()`.** Comparing a `rect`'s `x`/`width` to `columns`
  would be a second implementation of `rect`'s half-open bounds. Asking the predicate works for
  every coordinate-bound Selection, including later ones.
- **E16: never modifies the file.** An advisory never blocks, never modifies, and is never an
  error.
- **Nothing is migrated.** A `rect` at 0–7 in a grid that grows to 10 columns is 0–9
  proportionally and 0–7 absolutely, and *"both are defensible readings"*. Choosing one silently
  rewrites an authored value.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `App.svelte:45` | imports `atRisk`, `cameWithFile`, `needsConfirmation`, `orphans` |
| `App.svelte:287` | `needsConfirmation(config)` in `destructive()`: hold the transition as `pending`, or apply it |
| `App.svelte:305` | `risked = atRisk(config)`, the names in the confirmation |
| `App.svelte:312` | `orphaned = orphans(config, config.defaultSeed, loadSalt)` |

Callees: [`selection`](/api/index/functions/selection/) and
[`isCoordinateBound`](/api/index/functions/iscoordinatebound/) from the engine; `cellsOf` and
`selectionTypes` from [layers.ts](/editor/layers/).

### Tests: `orphans.test.ts`

- The registrations whose flag is `true` are `["cellList", "rect"]`, and every registered
  Selection declares the flag as a boolean.
- **E12.** Nothing is asked when every Selection is procedural. Only the at-risk Operations are
  named. Nothing is asked on an empty document.
- **Orphans.** Silent while everything fits. A `rect` wholly outside the grid is reported; one that
  merely overhangs is not. It counts unreachable painted cells, reports a `cellList` whose every
  entry is outside, never modifies the config, and ignores procedural Selections however few
  cells they match.
- **Selection layers (B-033).** An Operation is at risk exactly when one of its layers is
  coordinate-bound. A Handpick layer's lost cells are counted (`outside: 2`) even when a `rect`
  layer still reaches cells. An Operation whose layers' painted cells all fit is not reported. `outsideCells`
  lists the outside cells of every Handpick layer, in layer order.

### Gotchas & rejected alternatives

- **The advisory wording differs by type, the repair does not.** A `rect` is offered a jump to
  its control. A `cellList` is told how many entries are unreachable. In both cases the only
  repair is undo.
- **`orphans` counts against the base `rows`/`columns`.** It does not walk responsive rules. The
  source does not discuss this. The package's `COORDINATE_BOUND_RESIZE` check (described in
  [document.ts](/editor/document/)) keeps a rule from resizing a grid that holds a
  coordinate-bound Operation, which suggests the base grid is the only one that matters.

### Review notes

None found.
