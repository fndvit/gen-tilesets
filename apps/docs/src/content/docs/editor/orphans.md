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
| `atRisk(config)` | `(TilesetConfig) → Operation[]` | Operations whose Selection type declares `coordinateBound`. |
| `needsConfirmation(config)` | `(TilesetConfig) → boolean` | `atRisk(config).length > 0` |
| `Orphan` | interface | `{ operationId, selectionType, reachable, authored?, empty }` |
| `orphans(config, seed, loadSalt = 0)` | `(TilesetConfig, string, number) → Orphan[]` | Coordinate-bound Operations that no longer reach what they were authored to. |

Engine: [`selection`](/api/index/functions/selection/),
[`selections`](/api/index/variables/selections/),
[`TilesetConfig`](/api/index/interfaces/tilesetconfig/),
[`Operation`](/api/index/interfaces/operation/).

### Inputs → outputs

**`atRisk`** filters `config.operations` by
`selections.get(op.selection.type).coordinateBound`.

**`orphans`**, for each at-risk Operation:

1. `includes = selection(config, op.id, seed, loadSalt)`, the engine's own predicate.
2. `reachable` is the count of `(x, y)` in `[0, columns) × [0, rows)` where `includes(x, y)`.
3. `authored` is `op.selection.cells.length` if `cells` is an array (a `cellList`), otherwise
   absent.
4. The Operation is reported if `reachable === 0`, or if `authored` is defined and
   `reachable < authored`. `empty` is `reachable === 0`.

A `rect` that only partly overhangs the grid is **not** reported. Only one that reaches nothing
is. `authored` is spread in or omitted rather than set to `undefined`, because under
`exactOptionalPropertyTypes` an absent key is what means *no countable extent*.

### Invariants

- **Read from the registry's `coordinateBound` declaration**, never a list of names. A Selection
  registered later would otherwise be silently exempted from the confirmation.
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
| `App.svelte:57` | imports `atRisk`, `needsConfirmation`, `orphans` |
| `App.svelte:208` | `needsConfirmation(config)` in `destructive()`: hold the transition as `pending`, or apply it |
| `App.svelte:219` | `risked = atRisk(config)`, the names in the confirmation |
| `App.svelte:226` | `orphaned = orphans(config, config.defaultSeed, loadSalt)` |

Callees: [`selection`](/api/index/functions/selection/) and
[`selections`](/api/index/variables/selections/) from the engine.

### Tests: `orphans.test.ts`

- The coordinate-bound set across the registry is exactly `["cellList", "rect"]`, and every
  registered Selection declares the flag as a boolean.
- **E12.** Nothing is asked when every Selection is procedural. Only the at-risk Operations are
  named. Nothing is asked on an empty document.
- **Orphans.** Silent while everything fits. A `rect` wholly outside the grid is reported; one that
  merely overhangs is not. It counts unreachable painted cells, reports a `cellList` whose every
  entry is outside, never modifies the config, and ignores procedural Selections however few
  cells they match.

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
