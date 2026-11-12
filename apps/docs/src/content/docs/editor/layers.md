---
title: layers.ts
description: Selection layers as the editor reads them. A selection is a list of layers, and questions about painted cells or the Selection's type are asked of every layer.
sidebar:
  order: 9
---

**Written from:** `apps/editor/src/layers.ts`, `layers.test.ts`, and the call sites in
`orphans.ts`, `document.ts` and `App.svelte`.

## Overview

Since B-033 an operation's selection is a list of layers, always, even of one. The operation
affects every cell any layer selects. Code that asks about "the painted cells" or "the Selection's
type" has to ask every layer. Otherwise a hand-painted layer beside another one would be
invisible: the orphan notice would not count its cells, and "Remove N cells outside the grid" would
not trim them.

This module holds the two such questions that are asked in more than one place: a layer's painted
cells, and the names of a selection's layer types. In the editor's pipeline,
import → document → draft/history → preview → export, it is a small helper used by the document
transitions, the orphan checks and the resize dialog.

## In detail

### Purpose

`layers.ts` answers two questions:

1. What are a layer's painted cells? (its `cells` list, if it has one)
2. How should a selection be named in a notice or dialog? (its layer types, joined)

Everything else about layers is an ordinary `map`, `some` or `flatMap` over `op.selection` at the
call site, because the selection is already a list.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `cellsOf(layer)` | `(Selection) → [number, number][] \| undefined` | The layer's `cells` array, or `undefined` where it has none. |
| `selectionTypes(selection)` | `(readonly Selection[]) → string` | The layer types in order, joined with `" + "`: `"rect"`, or `"rect + random"`. |

Engine: [`Selection`](/api/index/interfaces/selection/) (a type import only).

### Inputs → outputs

**`cellsOf`** does not look at the type. It reads `layer.cells` and returns it if it is an array,
otherwise `undefined`.

**`selectionTypes`** uses the raw registry names, not `labelFor`'s display names. The source says
these are the places that showed raw type names before layers existed, and a one-layer selection
reads exactly as it did then.

### Invariants

- **Never mutates.** Both functions only read.
- **`cellsOf` is total over a malformed layer.** A `cells` that is not an array answers
  `undefined`, so the editor can call it on files not yet known to be valid.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `orphans.ts:115` | `cellsOf` in `orphans`: `authored` counts the lists of every layer |
| `orphans.ts:124` | `selectionTypes` for `Orphan.selectionType` |
| `orphans.ts:153` | `cellsOf` in `outsideCells`: every layer's outside cells, in layer order |
| `orphans.ts:183`, `:186` | `selectionTypes` and `cellsOf` in `cameWithFile`: the selection's types must match the opened file's, and whether any layer is a painted list |
| `document.ts:848` | `cellsOf` in `trimToGrid`: trim every Handpick layer, leave the others alone |
| `App.svelte:657` | `selectionTypes` in the resize dialog's list of Operations at risk |

Callees: none.

### Tests: `layers.test.ts`

- `cellsOf` reads a painted list, gives `undefined` for a `rect`, and gives `undefined` for a
  `cells` that is not an array.
- `selectionTypes` names one layer as `"rect"` and two as `"rect + random"`, in order.

The callers' behaviour is pinned in `orphans.test.ts` and `document.test.ts`.

### Gotchas & rejected alternatives

- **No helper for "the layers of a selection".** `Operation.selection` is a list in every case
  (Pol, B-033), so the call sites iterate it directly. The module header says it holds only the
  questions asked in more than one place.
- **`cellsOf` ignores the type.** Any layer with a `cells` array is read as painted. Only
  `cellList` has one today.

### Review notes

None found.
