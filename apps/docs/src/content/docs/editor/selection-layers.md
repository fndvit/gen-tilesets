---
title: operations/SelectionLayers.svelte
description: The Selection step's layers. One layer looks as the step always did; several are an accordion of rows, one open at a time, with add and remove.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/operations/SelectionLayers.svelte`, and its call site in
`lib/operations/OperationBody.svelte`. The state changes are in [draft.svelte.ts](/editor/draft/),
the row text in [labels.ts](/editor/operation-labels/). The glyph table,
`apps/editor/src/lib/operations/selection-glyphs.ts`, is described on
[OperationBody](/editor/operation-body/#selection).

## Overview

An Operation's `selection` is a list of layers (B-033). The operation affects every cell that
any layer selects. This component is the Selection step under its question:

- **One layer** looks as the step always did: the glyph grid, the chosen option's fields in their
  well, then **+ Add selection layer**. A single-layer author sees one new row and nothing else.
- **Two or more** are an accordion. Each layer is a row: a small glyph (a dashed square while
  untyped), "Layer N", its label ("Not set" while untyped), a muted summary at the right
  ("3×2 at 0,0", "30%"), and a × beside the row. Only the **open** layer unfolds to the glyph grid
  and its fields. The open layer is also the one the preview's brush and drag edit.

Pol chose the accordion over a chip strip on 2026-11-12.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `draft` | `Draft` | The open draft. Mutated in place, through `draft.svelte.ts`'s functions. |
| `items` | `{ value, label, disabled?, src? }[]` | The glyph grid's cells, from `OperationBody`'s `selectionItems`, with coordinate-bound types already disabled where a breakpoint resizes. |
| `options` | `Snippet<[string, Snippet]>` | `OperationBody`'s caption-over-well, so a layer's fields sit in the same well every step uses. |

### Inputs → outputs

- **Rows.** An `<ol aria-label="Selection layers">`, keyed by layer object. Each header is a
  `<button>` with `aria-expanded` (open or not) and `aria-controls` naming the open body. Clicking
  it calls `openLayer(draft, i)`. The header is at least 32px tall, washes `--color-hover` on
  hover, and takes `--color-accent-wash` with an accent label while open, as the step rows do.
- **The ×** is an [IconButton](/editor/ui-icon-button/) (`close`, 28px) beside the header, as a
  sibling, never inside it. Its name is "Remove layer N (Type)", or "(no type yet)". It is wrapped
  in a [Hint](/editor/ui-hint/) that reads "Random layers after this one get a new scatter." only
  when `shiftsScatter(draft, i)` (Pol, Block 3). Random layers are channelled by position, so
  removing an earlier one renumbers them.
- **Choosing a type** sets the layer's `type` and replaces its `params` with
  `defaultParams(schema)`, so the fields show what the file will contain. A type with parameters
  gets [ParamFields](/editor/param-fields/) with `selectionParamHints(type)` in `options(type, …)`.
- **Add** ([AddBar](/editor/ui-add-bar/), `bar`) calls `addLayer(draft)`: an untyped layer, last,
  open. The picture and the overlay keep the typed layers. Save stays off until it has a type, and its hint
  names the layer.
- **Remove** calls `removeLayer(draft, i)`, waits a `tick`, and moves focus to the header of the
  row now open, or to the Add row once a single layer is left and the rows are gone. The pressed ×
  is gone with its row, so focus would otherwise drop to `<body>`.

### Invariants

- **Never zero layers.** The × is not drawn at one layer, and `removeLayer` refuses anyway.
- **One open layer**, always a valid index (`openLayer` clamps; `removeLayer` keeps it in range).
- **O2:** a Selection is a pure function of `(x, y)` and its own parameters.
- **A type registered later** gets a label-only grid cell, a blank glyph in its row, and a
  summary from its parameters (**E9**).

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/operations/OperationBody.svelte:418` | the Selection step: `<SelectionLayers {draft} items={selectionItems} {options} />` |

Callees: `addLayer`, `defaultParams`, `openLayer`, `removeLayer`, `shiftsScatter`
(`draft.svelte.ts`); `labelFor`, `layerSummary` (`labels.ts`); `SELECTION_GLYPHS`;
`selectionParamHints` (`controls/param-hints.ts`); [`selections`](/api/index/variables/selections/);
AddBar, GlyphGrid, Hint, IconButton, ParamFields.

### Tests

No test file for the component (CLAUDE.md, Testing). Its logic is pinned in `draft.test.ts`
(adding, removing, opening, `shiftsScatter`) and `labels.test.ts` (`layerSummary`).

### Gotchas & rejected alternatives

- **No reordering.** Order only moves the scatter of Random layers, so a reorder control would
  offer a change the author cannot see the point of. It can come with B-034, where order means
  something.
- **An added layer is untyped**, not a copy of the open one: no Selection type has a default, and
  a copy would select the same cells.
- **A single layer shows no row header.** It would label the only layer "Layer 1" for no reason.

### Review notes

None found.
