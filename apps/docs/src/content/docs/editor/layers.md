---
title: layers.ts
description: Selection layers as the editor reads them. A Selection is one layer, or a union of several, and questions about painted cells are asked of every layer.
sidebar:
  order: 9
---

**Written from:** `apps/editor/src/layers.ts`, `layers.test.ts`, and the call sites in
`orphans.ts`, `document.ts` and `lib/operations/OperationBody.svelte`.

## Overview

The layers module lets the editor treat every Selection as a list of layers. Since B-033 an
operation's Selection is either one Selection, or a `union` of several held in its `layers`
parameter. A plain Selection is read as a list of one.

Without this, code that asks about "the painted cells" would only look at the top-level Selection.
A hand-painted layer inside a union would then be invisible: the orphan notice would not count its
cells, and "Remove N cells outside the grid" would not trim them.

In the editor's pipeline, import → document → draft/history → preview → export, this is a small
helper used by the document transitions, the orphan checks and the Selection picker.

## In detail

### Purpose

`layers.ts` answers three questions without naming `union`:

1. Does this registered Selection hold layers? (keep it out of the type picker)
2. What are this Selection's layers? (`[selection]`, or its list)
3. What are a layer's painted cells? (its `cells` list, if any)

**Found by declaration, not by name.** A Selection holds layers when its registration declares a
`selectionList` parameter, the same way a painted Selection is found by its `cellList` parameter.
A list-holding Selection registered later is then read correctly with nothing written here.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `layersParam(registration)` | `(Pick<SelectionRegistration, "params">) → string \| null` | The name of the first `selectionList` parameter, or `null` if it holds no layers. |
| `holdsLayers(registration)` | `(Pick<SelectionRegistration, "params">) → boolean` | `layersParam(registration) !== null`. |
| `layersOf(selection)` | `(Selection) → Selection[]` | The `selectionList` value when there is one and it is an array; otherwise `[selection]`. |
| `withLayer(selection, layer, next)` | `(Selection, number, Selection) → Selection` | A copy with layer `layer` (an index into `layersOf`) replaced by `next`. A single-layer Selection is replaced whole, so the result is `next`. |
| `cellsOf(selection)` | `(Selection) → [number, number][] \| undefined` | The Selection's `cells` array, or `undefined` where it has none. |

Engine: [`selections`](/api/index/variables/selections/),
[`Selection`](/api/index/interfaces/selection/),
[`SelectionRegistration`](/api/index/interfaces/selectionregistration/).

### Inputs → outputs

**`layersOf`** returns `[selection]` for an unknown type, for a type with no `selectionList`
parameter, and for a union whose list is not an array. Otherwise it returns the list itself, not
a copy. Malformed input is `validate()`'s to report; this only reads.

**`withLayer`** finds the list the same way. If there is none, or it is not an array, it returns
`next`. Otherwise it returns `{ ...selection, [name]: layers.map(...) }` with only index `layer`
swapped. The input is never mutated.

**`cellsOf`** does not look at the type. It reads `selection.cells` and returns it if it is an
array.

### Invariants

- **One layer is the Selection itself.** `layersOf(rect)[0]` is `rect` by identity. `orphans.ts`
  relies on this to tell a layered Selection apart (`layers[0] !== op.selection`).
- **Never mutates.** `withLayer` builds a new list; the old layer objects are kept by reference.
- **Total over unvalidated input.** Every function answers for an unknown type or a malformed
  list, because the editor calls them on files not yet known to be valid.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `orphans.ts:114-115` | `layersOf` and `cellsOf` in `orphans`: `authored` counts the lists of every layer |
| `orphans.ts:152-153` | `layersOf` and `cellsOf` in `outsideCells`: every layer's outside cells, in layer order |
| `orphans.ts:186` | `layersOf` and `cellsOf` in `cameWithFile`: whether any layer is a painted list |
| `document.ts:848-853` | `layersOf`, `cellsOf` and `withLayer` in `trimToGrid`: trim every Handpick layer in place |
| `lib/operations/OperationBody.svelte:174` | `holdsLayers` filters layer-holding Selections out of the type picker |

Callees: [`selections`](/api/index/variables/selections/) from the engine (`has`, `get`).

### Tests: `layers.test.ts`

- The layer-holding Selections across the registry are exactly `["union"]`; `union`'s list is
  `layers`; `cellList` has none.
- A plain Selection is its own only layer (by identity), and a union's layers are its list (by
  identity).
- Malformed input (a `layers` that is a string, an unknown type) is one layer.
- `withLayer` replaces one layer without mutating the union, and replaces a plain Selection whole.
- `cellsOf` reads a painted list, and `undefined` from a `rect`.

The callers' behaviour is pinned in `orphans.test.ts` and `document.test.ts` (the *selection
layers (B-033)* cases).

### Gotchas & rejected alternatives

- **Rejected: checking `selection.type === "union"`.** The module header gives the reason: a
  later list-holding Selection would be missed. The engine's `validate()` uses the same
  declaration check to refuse a nested union.
- **`cellsOf` ignores the type.** Any Selection with a `cells` array is read as painted. Only
  `cellList` has one today.

### Review notes

None found.
