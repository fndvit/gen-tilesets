---
title: selections.ts
description: The eight registered Selections, each a pure predicate on (x, y) that decides whether an Operation touches a cell.
sidebar:
  order: 23
---

**Written from:** `packages/tileset/src/registry/selections.ts`, `registry/registry.test.ts`, and
the call sites in `generate.ts`, `selection.ts`, `ctx.ts`, `shape.ts`, `validate.ts` and the editor.

## Overview

A Selection decides which cells an operation affects. Every operation in a tileset has one: "all
cells", "a rectangle", "every third column", "a random 30%", "these cells I painted", and so on.
Given a cell's position, a Selection answers yes or no.

This file is the table of every Selection the engine knows. Each entry has a name (what a file
writes), a description of its settings, a yes/no rule, and two flags the editor and generator
need: whether the Selection is tied to specific cell coordinates (and so breaks if the grid is
resized), and, for those that cover a definite area, what that area is.

One entry, `union` (B-033), is made of other Selections: its `layers` are a list of Selections,
and it matches a cell when any layer does. The editor calls these selection layers.

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
| [`isCoordinateBound`](/api/index/functions/iscoordinatebound/) | function | `(selection: Selection) → boolean`. Resolves `coordinateBound` for one Selection. Exported from `index.ts:103`. |
| `SelectionImpl` | type | `(params, x, y, ctx: EvalCtx) → boolean`. Not re-exported by `index.ts`. |

`SelectionRegistration` fields beyond `name`/`params`/`impl`:

- **`coordinateBound: boolean | ((params) → boolean)`.** Whether the Selection is defined by
  specific coordinates, and so orphaned by a resize. A declaration rather than a list of names held
  elsewhere, because a Selection registered later would otherwise be silently treated as
  procedural. It cannot be derived from the schema: `everyNth`'s `offset` and `rect`'s `y` are both
  integers. **A function where the answer depends on the parameters**: `union`'s, which is bound
  exactly when one of its layers is (B-033). The source rejects a static `true` (it would put the
  E12 confirmation in front of every procedural union, which teaches authors to dismiss it) and a
  static `false` (a `rect` layer could be orphaned without one). Read it through
  `isCoordinateBound`, never directly: a function is truthy.
- **`extent?: (params) → Extent | undefined`.** The rectangle the Selection can match, or absent
  for "the whole grid". A spanning Source (`gradient`) normalizes over it. Absent rather than
  `null` because only the resolver (`operationCtx`) knows `rows` and `columns`. Must be a pure
  function of the parameters. **May return `undefined`** (the grid) where the answer depends on
  the parameters: a `union` with a layer that declares no extent.

**`isCoordinateBound(selection)`** returns the boolean, or calls the function with the Selection.
It is total over unvalidated input, because `validate()`'s resize rule and the editor call it on
files not yet known to be valid: a non-object, an unknown type, or a `union` whose `layers` is not
an array answers `false`, and is left to the error `validate()` raises at its own path.

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
| `union` | `layers`: selectionList, required (2 or more Selections, none itself a `union`) | Any layer matches (`layers[0] \|\| layers[1] \|\| …`) | **when any layer is** (a function) | Bounding box of the layers' extents; none (grid) if any layer declares none; zero-area layers skipped |

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
- **`union`** (B-033) evaluates its layers in order and stops at the first that matches. Each
  layer gets its own `EvalCtx`, so each `random` layer draws from its own hash channel; without it
  two `random` layers at the same density would select the same cells. **By position:** layer 0
  gets the Operation's own `ctx`, so its channel is `opId:selection` exactly as when it stands
  alone, and adding a second layer never moves the first one's scatter. Layer `i ≥ 1` gets
  `operationId` rewritten to `layerOwner(opId, i)` (`opId:i`), so its channel is
  `opId:i:selection`. Deleting or moving a layer reshuffles the `random` layers after it, which
  the source accepts like a reroll. The per-layer contexts are cached per `ctx` in a `WeakMap`, so
  the per-cell cost is one lookup, not an allocation.
- `union`'s extent is the bounding box of its layers' declared extents. It is absent (the whole
  grid) if any layer declares none, because a gradient over `rect ∪ random` must sweep the grid.
  A zero-area extent (an empty Handpick layer) is skipped so it does not drag the box to the
  origin; if every layer is zero-area the result is `{0, 0, 0, 0}`.
- `union`'s `coordinateBound` is `Array.isArray(p.layers) && p.layers.some(isCoordinateBound)`.
- The editor never offers `union` in its type picker. It builds one from the layer list and
  writes a single layer as the plain Selection, which is why `validate()` requires two layers.

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
- **Only a Selection ever sees a layer ctx.** The source rejects adding a field to `EvalCtx`
  (closed by **O4**) for the layer index: every Source and renderer would carry a field read only
  by `random`-inside-`union`. A Selection reads `operationId` only to name its channel, and the
  Source still gets the Operation's own `ctx`.
- **Rejected: a stable per-layer id saved in the file.** It would cost every layer an extra key and
  break "one layer saves exactly as today" (Pol, B-033 Block 1).

### Callers / callees

| Caller | Uses |
| --- | --- |
| `generate.ts:76` | `selections.get(type)` once per Operation; `impl` per cell at `generate.ts:120` |
| `selection.ts:93` | `selections.get` for the editor's overlay predicate |
| `ctx.ts:98–99` | `selections.get(...).extent?.(params)`, defaulting to the grid |
| `shape.ts:187` | `isCoordinateBound` in `coordinateBoundOperations`; `shape.ts:198` names a union's bound layers; `shape.ts:210` lists the names whose `coordinateBound === false` for a message |
| `validate.ts:391–399` | `has` / `get(...).params` for `UNKNOWN_TYPE_NAME` and parameter checks |
| `validate.ts:324–325` | `has` / `get(...).params` to refuse a layer that itself holds a `selectionList` |
| `apps/editor/src/orphans.ts:46` | `atRisk`: `isCoordinateBound` on each Operation's Selection |
| `apps/editor/src/App.svelte:197` | `get(...).params`, to find the `cellList` parameter to paint |
| `apps/editor/src/lib/operations/OperationBody.svelte:174, 179, 235, 327` | `all()` for the glyph grid (minus layer-holding Selections), `coordinateBound === true` to disable a cell, `get(...).params` for controls and defaults |
| `index.ts:103` | re-export of `selections` and `isCoordinateBound` |

Callees: `Registry` (`registry.ts`), `hash`, `selectionChannel` and `layerOwner` (`hash.ts`),
types `EvalCtx`, `Extent` and `Selection`.

### Tests

`registry/registry.test.ts`, block "Selection presets — 04 §4.2":

- Exactly eight names are registered (the block is still titled "the six V1 presets").
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

`registry/registry.test.ts`, block "union — selection layers (B-033)":

- A union of `rect` and `checkerboard` selects exactly the OR of the two.
- **Layer 0 `random` draws exactly as the same `random` alone**, cell for cell, so old files and a
  first layer never move.
- Each `random` layer has its own channel: the same `random` at layer 0 and at layer 1 selects
  different cells, and two together select more than either alone.
- Extent: the bounding box of a `rect` and a `cellList`; `undefined` when a layer is
  `checkerboard` or `random`; an empty Handpick layer is skipped, and all-empty is zero-area.
- `isCoordinateBound`: false for checkerboard + random, true when a layer is `rect` or a
  `cellList` (even empty); static ones answer as declared; total over an unknown type, a
  non-array `layers`, junk entries and `null`.

### Gotchas & rejected alternatives

- **Declarations over name lists**, for both `coordinateBound` and `extent`: a list kept elsewhere
  would silently misclassify a Selection registered later.
- **A layer cannot itself be a union.** The source says nesting adds nothing a flat list does not
  already say; `validate()` refuses it.
- **`rect` is never clipped** to the grid, either as a predicate or as an extent: an author
  dragging a rectangle past the edge should not have it silently resized.

### Review notes

- `rect`'s `width` and `height` have no `min`, so a zero or negative size validates and matches
  nothing. The comments do not say whether that is intended.
- The `random` Selection test at `registry.test.ts:157` says *"h < 1 strictly by X6"*. X6 is now
  the closed interval `[0, 1]` (per `sources.ts`); the strict bound comes from `hash` being
  half-open. Stale wording.
