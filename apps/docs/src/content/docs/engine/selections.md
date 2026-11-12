---
title: selections.ts
description: The seven registered Selections, each a pure predicate on (x, y) that decides whether an Operation touches a cell.
sidebar:
  order: 23
---

**Written from:** `packages/tileset/src/registry/selections.ts`, `registry/registry.test.ts`,
`selection.test.ts`, and the call sites in `generate.ts`, `selection.ts`, `ctx.ts`, `shape.ts`, `validate.ts` and the editor.

## Overview

A Selection decides which cells an operation affects. Every operation in a tileset has one: "all
cells", "a rectangle", "every third column", "a random 30%", "these cells I painted", and so on.
Given a cell's position, a Selection answers yes or no.

This file is the table of every Selection the engine knows. Each entry has a name (what a file
writes), a description of its settings, a yes/no rule, and two flags the editor and generator
need: whether the Selection is tied to specific cell coordinates (and so breaks if the grid is
resized), and, for those that cover a definite area, what that area is.

Since B-033 an operation's selection is a list of these, called layers: the operation affects
every cell that any layer selects. The list is always a list, even of one, so a layer is simply one
of the Selections in this table. Combining the layers is done outside this file, in
[selection.ts](/engine/selection/) (`selectionPredicate`) and [ctx.ts](/engine/ctx/)
(`layersExtent`). This file only answers, through `isCoordinateBound`, whether any layer of a list
is tied to coordinates.

In the pipeline, the generator asks each operation's Selection about every cell before doing
anything else with it. The validator checks a file's Selection names and settings against this
table, and the editor builds its controls from it.

## In detail

### Purpose

`selections.ts` creates the `selections` registry and registers the V1 presets. A Selection is
`(params, x, y, ctx) → boolean`. It is a pure function of `(x, y)` and its own parameters and
never reads the accumulated `TileState` (cites **O2**). Coordinates are grid-absolute, and every
cell in `rows × columns` is tested, including those the renderer will clip (cites **G2**).

### Public surface

| Symbol | Kind | Meaning |
| --- | --- | --- |
| [`selections`](/api/index/variables/selections/) | `Registry<SelectionRegistration>` | The table. Exported from `index.ts:103`. |
| [`SelectionRegistration`](/api/index/interfaces/selectionregistration/) | interface | `{ name, params, coordinateBound, extent?, impl }` |
| [`isCoordinateBound`](/api/index/functions/iscoordinatebound/) | function | `(selection: readonly Selection[]) → boolean`. True when any layer's registration is coordinate-bound (B-033). Exported from `index.ts:103`. |
| `SelectionImpl` | type | `(params, x, y, ctx: EvalCtx) → boolean`. Not re-exported by `index.ts`. |

`SelectionRegistration` fields beyond `name`/`params`/`impl`:

- **`coordinateBound: boolean`.** Whether the Selection is defined by specific coordinates, and
  so orphaned by a resize. A declaration rather than a list of names held elsewhere, because a
  Selection registered later would otherwise be silently treated as procedural. It cannot be
  derived from the schema: `everyNth`'s `offset` and `rect`'s `y` are both integers.
- **`extent?: (params) → Extent`.** The rectangle the Selection can match, or absent for "the whole
  grid". A spanning Source (`gradient`) normalizes over it. Absent rather than `null` because only
  the resolver (`operationCtx`) knows `rows` and `columns`. Must be a pure function of the
  parameters.

**`isCoordinateBound(selection)`** takes an operation's whole selection, a list of layers, and is
true when any layer's registration has `coordinateBound: true` (B-033). Since a selection is always
a list, this is the question every caller asks, not one registration's flag. It is total over
unvalidated input, because `validate()`'s resize rule and the editor call it on files not yet known
to be valid: a selection that is not an array answers `false`, and a layer that is not an object,
has no string `type`, or names an unknown type counts as not bound. Each is left to the error
`validate()` raises at its own path.

### The registered Selections

| Name | Params | Matches when | `coordinateBound` | `extent` |
| --- | --- | --- | --- | --- |
| `all` | none | Always. | no | none (grid) |
| `rect` | `x`, `y`, `width`, `height`: integer, all required | `x ≤ cx < x+width` and `y ≤ cy < y+height` (half-open). May extend past the grid. | **yes** | `{x, y, width, height}` verbatim, unclamped |
| `checkerboard` | `parity`: enum `0 \| 1`, required | `(cx + cy) % 2 === parity` | no | none |
| `rowColumn` | `axis`: enum `"column" \| "row"`, required; `n`: integer `≥ 1`, required; `offset`: integer, default `0` | `(coord − offset) % n === 0`, where `coord` is `cx` or `cy` | no | none |
| `everyNth` | `n`: integer `≥ 1`, required; `offset`: integer, default `0` | `(cy · columns + cx − offset) % n === 0`: every nth cell, counted row after row | no | none |
| `random` | `density`: number in `[0, 1]`, required | `hash(effectiveSeed, operationId + ":selection", cx, cy, salt) < density` | no | none |
| `cellList` | `cells`: cellList (absent means `[]`) | `[cx, cy]` is in the list | **yes** | Bounding box of the cells; `{0, 0, 0, 0}` for an empty list |

### Inputs → outputs

- `rect` and the `rect` extent use the same four numbers, so the extent cannot disagree with the
  selection. An overhanging rect keeps its full declared extent, so a gradient over it does not
  reach the ends of its range in the visible part. The source calls that correct.
- `rowColumn` and `everyNth` read `offset` as `(p.offset as number) ?? 0`, so an absent offset
  behaves as `0`.
- **`rowColumn` was `everyNth` until schema v5** (B-009), with the same params and impl.
  `migrate()`'s 4 → 5 row renames it in every older file, so a migrated file draws exactly as it
  did.
- `everyNth` counts over `ctx.columns`, the grid as drawn, so the count carries across a row
  boundary and **the picture changes with the column count**: n = 3 is diagonals at 10 columns and
  vertical stripes at 9. It still holds at any size, because it names no cell. The source rejects
  counting against the design width: the engine never sees `Layout`, and the rows would visibly
  stop continuing into each other whenever the grid is reshaped.
- `random` draws from its **own hash channel** (`selectionChannel(operationId)`), never the
  Source's. Both channels use the Operation's `salt`, so one reroll moves both.
- `cellList`'s extent is a bounding box, not the cell set, because a spanning Source needs a
  projection domain and a sparse set has none beyond its hull. An empty list gives a zero-area
  extent, which `gradient` guards to `0`; returning the grid instead would make a gradient over an
  empty brush sweep the whole canvas.
- **A `random` layer's channel depends on its position in the list** (B-033). Layer 0 hashes on
  the Operation's own `opId:selection`, as a lone Selection always did; layer `i ≥ 1` hashes on
  `opId:i:selection`. The registration does not know about layers: `selectionPredicate` in
  [selection.ts](/engine/selection/) hands each layer a `ctx` whose `operationId` is rewritten,
  and `random` names its channel from that.

### Invariants

- **O2:** pure in `(x, y)` and parameters; no access to `TileState`.
- **O3** (on `random`): a separate selection channel. Sharing the Source channel would make
  `random` Selection at density 0.5 pick exactly the cells whose `random` Source value is below
  0.5, biasing every selected cell to the bottom half of the range.
- **The `%` hazards.** `checkerboard` compares against a *non-zero* residue, where JS remainder
  and true modulo differ. It is safe only because `cx` and `cy` are non-negative. `rowColumn` and
  `everyNth` compare against **zero**, where remainder and modulo always agree (`-0 === 0`), so `offset`
  needs no lower bound. The source states: any future Selection testing a non-zero residue over a
  possibly negative operand must use a true modulo.
- **Accepted, not a defect:** "paint only where nothing is yet" is not expressible; reorder the
  stack instead.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `selection.ts:126` | `selections.get(layer.type).impl` once per layer, in `selectionPredicate` (which `generate.ts:79` and `selection()` both call) |
| `ctx.ts:128` | `selections.get(layer.type).extent?.(layer)` per layer, in `layersExtent` |
| `shape.ts:186` | `isCoordinateBound` in `coordinateBoundOperations`; `shape.ts:195` asks it of each layer alone to name the bound layer types; `shape.ts:208` lists the names whose `coordinateBound` is false for the message |
| `validate.ts:360–368` | `has` / `get(...).params` for `UNKNOWN_TYPE_NAME` and parameter checks, once per layer |
| `apps/editor/src/orphans.ts:46` | `atRisk`: `isCoordinateBound` on each Operation's selection |
| `apps/editor/src/App.svelte:393`, `:414` | `get(...).params` of the active layer, to find the `cellList` parameter to paint or the `rect` parameters to drag |
| `apps/editor/src/lib/operations/OperationBody.svelte:171, 174, 234, 325` | `all()` for the glyph grid, `coordinateBound` to disable a cell, `get(...).params` for controls and defaults |
| `index.ts:103` | re-export of `selections` and `isCoordinateBound` |

Callees: `Registry` (`registry.ts`), `hash` and `selectionChannel` (`hash.ts`), types `EvalCtx`,
`Extent` and `Selection`.

### Tests

`registry/registry.test.ts`, block "Selection presets — 04 §4.2":

- Exactly seven names are registered (the test is still titled "the six V1 presets").
- `all` is always true. `rect` is half-open on both axes, may extend past the grid, and a rect
  wholly outside never matches.
- `checkerboard` for both parities; a loop asserting `(x + y) % 2 ≥ 0` for non-negative coordinates.
- `rowColumn` on both axes, with a positive offset making the operand negative, and with offset
  absent.
- `everyNth` with 4 columns and n = 3 picks (0,0), (3,0), (2,1), (1,2) and not (1,0): the count
  carries across the row boundary. Also an offset larger than the cell index, offset absent, and
  n = 1 selecting every cell.
- `random`: agreement with the `random` Source at 0.5 is between 40% and 60% (no correlation);
  hit rate tracks density; density 0 selects nothing and 1 selects everything.
- `cellList` membership.
- Every `impl` has at most four parameters (the O2 purity check).
- `rect` extent is verbatim and unclamped; `cellList` extent is the bounding box (L-shape, single
  cell, negative coordinates) and zero-area when empty; the five procedural Selections declare no
  extent, `rect` and `cellList` do.

Elsewhere: `apps/editor/src/orphans.test.ts` checks the `coordinateBound` table and that every
registered Selection declares it. `validate.test.ts` checks `random`'s density bound,
`checkerboard`'s enum, `rowColumn`'s integer and default, `everyNth` refusing an `axis`
(`UNKNOWN_KEY`), and `cellList` pairs.

`registry/registry.test.ts`, block "isCoordinateBound — over a selection's layers (B-033)":

- False for `checkerboard` + `random` and for `checkerboard` alone; true when one layer is `rect`
  or a `cellList` (even empty).
- Total over unvalidated input: an unknown type and `null` answer `false`, a bare object rather
  than a list answers `false`, and junk entries beside a `rect` still answer `true`.

How layers combine is tested in `selection.test.ts`; see [selection.ts](/engine/selection/) and
[ctx.ts](/engine/ctx/).

### Gotchas & rejected alternatives

- **Declarations over name lists**, for both `coordinateBound` and `extent`: a list kept elsewhere
  would silently misclassify a Selection registered later.
- **`rect` is never clipped** to the grid, either as a predicate or as an extent: an author
  dragging a rectangle past the edge should not have it silently resized.

### Review notes

- `rect`'s `width` and `height` have no `min`, so a zero or negative size validates and matches
  nothing. The comments do not say whether that is intended.
- The `random` Selection test at `registry.test.ts:157` says *"h < 1 strictly by X6"*. X6 is now
  the closed interval `[0, 1]` (per `sources.ts`); the strict bound comes from `hash` being
  half-open. Stale wording.
