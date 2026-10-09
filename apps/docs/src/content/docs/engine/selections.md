---
title: selections.ts
description: The six registered Selections, each a pure predicate on (x, y) that decides whether an Operation touches a cell.
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
| `SelectionImpl` | type | `(params, x, y, ctx: EvalCtx) → boolean`. Not re-exported by `index.ts`. |

`SelectionRegistration` fields beyond `name`/`params`/`impl`:

- **`coordinateBound: boolean`.** Whether the Selection is defined by specific coordinates, and so
  orphaned by a resize. A declaration rather than a list of names held elsewhere, because a
  Selection registered later would otherwise be silently treated as procedural. It cannot be
  derived from the schema: `everyNth`'s `offset` and `rect`'s `y` are both integers.
- **`extent?: (params) → Extent`.** The rectangle the Selection can match, or absent for "the
  whole grid". A spanning Source (`gradient`) normalizes over it. Absent rather than `null`
  because only the resolver (`operationCtx`) knows `rows` and `columns`. Must be a pure function
  of the parameters.

### The registered Selections

| Name | Params | Matches when | `coordinateBound` | `extent` |
| --- | --- | --- | --- | --- |
| `all` | none | Always. | no | none (grid) |
| `rect` | `x`, `y`, `width`, `height`: integer, all required | `x ≤ cx < x+width` and `y ≤ cy < y+height` (half-open). May extend past the grid. | **yes** | `{x, y, width, height}` verbatim, unclamped |
| `checkerboard` | `parity`: enum `0 \| 1`, required | `(cx + cy) % 2 === parity` | no | none |
| `everyNth` | `axis`: enum `"column" \| "row"`, required; `n`: integer `≥ 1`, required; `offset`: integer, default `0` | `(coord − offset) % n === 0`, where `coord` is `cx` or `cy` | no | none |
| `random` | `density`: number in `[0, 1]`, required | `hash(effectiveSeed, operationId + ":selection", cx, cy, salt) < density` | no | none |
| `cellList` | `cells`: cellList (absent means `[]`) | `[cx, cy]` is in the list | **yes** | Bounding box of the cells; `{0, 0, 0, 0}` for an empty list |

### Inputs → outputs

- `rect` and the `rect` extent use the same four numbers, so the extent cannot disagree with the
  selection. An overhanging rect keeps its full declared extent, so a gradient over it does not
  reach the ends of its range in the visible part. The source calls that correct.
- `everyNth` reads `offset` as `(p.offset as number) ?? 0`, so an absent offset behaves as `0`.
- `random` draws from its **own hash channel** (`selectionChannel(operationId)`), never the
  Source's. Both channels use the Operation's `salt`, so one reroll moves both.
- `cellList`'s extent is a bounding box, not the cell set, because a spanning Source needs a
  projection domain and a sparse set has none beyond its hull. An empty list gives a zero-area
  extent, which `gradient` guards to `0`; returning the grid instead would make a gradient over an
  empty brush sweep the whole canvas.

### Invariants

- **O2:** pure in `(x, y)` and parameters; no access to `TileState`.
- **O3** (on `random`): a separate selection channel. Sharing the Source channel would make
  `random` Selection at density 0.5 pick exactly the cells whose `random` Source value is below
  0.5, biasing every selected cell to the bottom half of the range.
- **The `%` hazards.** `checkerboard` compares against a *non-zero* residue, where JS remainder
  and true modulo differ. It is safe only because `cx` and `cy` are non-negative. `everyNth`
  compares against **zero**, where remainder and modulo always agree (`-0 === 0`), so `offset`
  needs no lower bound. The source states: any future Selection testing a non-zero residue over a
  possibly negative operand must use a true modulo.
- **Accepted, not a defect:** "paint only where nothing is yet" is not expressible; reorder the
  stack instead.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `generate.ts:76` | `selections.get(type)` once per Operation; `impl` per cell at `generate.ts:120` |
| `selection.ts:93` | `selections.get` for the editor's overlay predicate |
| `ctx.ts:98–99` | `selections.get(...).extent?.(params)`, defaulting to the grid |
| `shape.ts:183` | `has` + `get(...).coordinateBound` in `coordinateBoundOperations`; `shape.ts:195` lists the procedural names for a message |
| `validate.ts:358–368` | `has` / `get(...).params` for `UNKNOWN_TYPE_NAME` and parameter checks |
| `apps/editor/src/orphans.ts:44` | `atRisk`: Operations whose Selection is `coordinateBound` |
| `apps/editor/src/App.svelte:238` | `get(...).params`, to find the `cellList` parameter to paint |
| `apps/editor/src/lib/OperationDraft.svelte:67, 78, 91, 227` | `all()` for the picker, `get(...).params` for controls and defaults, `coordinateBound` to disable an option |
| `index.ts:103` | re-export |

Callees: `Registry` (`registry.ts`), `hash` and `selectionChannel` (`hash.ts`), types `EvalCtx`
and `Extent`.

### Tests

`registry/registry.test.ts`, block "Selection presets — 04 §4.2":

- Exactly six names are registered.
- `all` is always true. `rect` is half-open on both axes, may extend past the grid, and a rect
  wholly outside never matches.
- `checkerboard` for both parities; a loop asserting `(x + y) % 2 ≥ 0` for non-negative coordinates.
- `everyNth` on both axes, with a positive offset making the operand negative, and with offset
  absent.
- `random`: agreement with the `random` Source at 0.5 is between 40% and 60% (no correlation);
  hit rate tracks density; density 0 selects nothing and 1 selects everything.
- `cellList` membership.
- Every `impl` has at most four parameters (the O2 purity check).
- `rect` extent is verbatim and unclamped; `cellList` extent is the bounding box (L-shape, single
  cell, negative coordinates) and zero-area when empty; the four procedural Selections declare no
  extent, `rect` and `cellList` do.

Elsewhere: `apps/editor/src/orphans.test.ts` checks the `coordinateBound` table and that every
registered Selection declares it. `validate.test.ts` checks `random`'s density bound,
`checkerboard`'s enum, `everyNth`'s integer and default, and `cellList` pairs.

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
