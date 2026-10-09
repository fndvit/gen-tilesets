---
title: ctx.ts
description: The closed context a Source receives, and the one function that builds it for both generate() and selection().
sidebar:
  order: 5
---

**Written from:** `packages/tileset/src/ctx.ts`, the `operationCtx` block of `selection.test.ts`,
and the call sites in `generate.ts` and `selection.ts`.

## Overview

The context module defines the small bundle of facts that every operation's number-producing step
is allowed to see: how big the grid is, which rectangle the operation covers, which seed to hash
against, the operation's name, and its reroll number. Nothing else gets in.

Keeping that list short is deliberate. Anything added to it becomes something every future
number source may depend on and every future renderer must supply. It is also the one doorway
through which a screen measurement could leak into the engine, so it stays narrow.

The module also builds the bundle, once per operation. Both the generator and the editor's
selection overlay build it through the same function, so the overlay cannot disagree with the
picture beside it. It sits inside generate, between preparing an operation and running it over the
cells.

## In detail

### Purpose

`ctx.ts` declares `EvalCtx`, the closed set of fields a Source (and a Selection) receives, and
`operationCtx`, which builds one from the config's dimensions, an `Operation` and the run's
`EffectiveSeeds`. The header calls the closure **O4**: `ctx` is closed at
`{rows, columns, extent, effectiveSeed, operationId, salt}`.

### Public surface

| Symbol | Kind | Signature / fields |
| --- | --- | --- |
| [`EvalCtx`](/api/index/interfaces/evalctx/) | interface | `rows`, `columns`, `extent: Extent`, `effectiveSeed: number`, `operationId: string`, `salt: number` |
| [`operationCtx`](/api/index/functions/operationctx/) | function | `(config: Pick<TilesetConfig, "rows" \| "columns">, op: Operation, seeds: EffectiveSeeds) → EvalCtx` |

### Inputs → outputs

| Field | Value |
| --- | --- |
| `rows`, `columns` | Copied from `config`. |
| `extent` | `selections.get(op.selection.type).extent?.(params)`. If the Selection declares no extent, the whole grid: `{x: 0, y: 0, width: columns, height: rows}`. |
| `effectiveSeed` | `pickSeed(seeds, op.reseedOnLoad)`: the load-mixed seed when the flag is `true`, otherwise the plain one. |
| `operationId` | `op.id`. |
| `salt` | `op.salt ?? 0`. |

An unknown Selection type throws at `selections.get`. The comment says this is not a new failure
mode, because both callers already resolve the same registration for `impl`.

### Invariants

- **The closure is the point.** No field enters `ctx` unless it passes the test the closure exists
  to enforce: it must not be a measurement.
- **`extent` is the one widening, and it passes that test.** It is a pure function of the
  Operation's own Selection parameters, in design space, and carries no more information than the
  Selection already names. The header notes that the archived spec listed five fields and the code
  has moved past that; "the code is the authority, and this is the disagreement."
- **`effectiveSeed`, not the seed string.** `valueNoise` calls `hash()` itself. Handed the raw
  seed, it would silently ignore its own Operation's `reseedOnLoad` flag. Resolving the seed
  outside the Source makes the flag work whether or not the Source's author thought about it.
- **One construction for two callers.** `generate()` and `selection()` must build this object
  identically or the editor's overlay can disagree with the preview.
- **`salt` is read as a `uint32`**, though one archived block types it `number`; every consumer
  truncates anyway.

### Callers / callees

| Caller | Line |
| --- | --- |
| `generate.ts` | `:79`, once per Operation while preparing the stack. |
| `selection.ts` | `:94`, once per `selection()` call, outside the returned predicate. |
| `selection.test.ts` | `:241`, `:277` onward. |

Grep finds no caller in `apps/editor/src` or `apps/demo/src`.

Callees: `pickSeed` (`hash.ts`), `selections.get` and the registration's optional `extent`
(`registry/selections.ts`).

### Tests

No `ctx.test.ts`. `operationCtx` is tested in `selection.test.ts` under
*"operationCtx — the Selection extent, O4"*:

- With no declared extent (`all`, `checkerboard`, `random`), `extent` is the whole grid.
- A `rect` gives its own bounds, **unclamped**, including a rect past the grid on both axes in both
  directions.
- A `cellList` gives its bounding box (`[[2,3],[4,7]]` → `{x: 2, y: 3, width: 3, height: 5}`), and
  `selection()`'s predicate still matches only the listed cells, not the whole box.

The effective-seed and salt fields are covered through `selection()` and `generate()` agreement
tests in the same file.

### Gotchas & rejected alternatives

- **`extent` versus `rows`/`columns`.** A spanning Source must normalize over `extent`. Before it
  existed, a `gradient` confined to a seven-row `rect` in a ten-row grid got `t` in
  `[0.05, 0.65]`, so `range: [0.3, 1]` topped out at 0.767 and `steps: 7` collapsed to five bands.
  Both fields are kept because `EvalCtx` is public and a future Source may want the grid itself.
  Picking the wrong one is silent.
- **Resolved per Operation, not per cell.** Otherwise `gradient` would walk a `cellList`'s
  bounding box once per cell.
- **The grid default lives here** because a Selection is handed no dimensions and cannot name the
  grid itself.

### Review notes

- `operationCtx` has no test file of its own; its only direct tests sit in `selection.test.ts`.
  That is a placement choice, not a gap, but a reader looking for `ctx.test.ts` will not find one.
