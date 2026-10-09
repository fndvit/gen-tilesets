---
title: mapping.ts
description: Gives a Source's unitless [0, 1] number its meaning, as a numeric range or a pick from an ordered tile palette.
sidebar:
  order: 9
---

**Written from:** `packages/tileset/src/mapping.ts`, `mapping.test.ts`, and the call sites in
`generate.ts`, `apps/editor/src/draft.svelte.ts` and `apps/editor/src/controls/PaletteBar.svelte`.

## Overview

The mapping module turns a bare number between 0 and 1 into something that means something. A
random or noise source only ever produces such a number; on its own, 0.73 says nothing. Mapping
decides whether it means "73% of the way from −5° to 5°", "a quarter turn", or "the third tile in
this list".

There are two kinds. A numeric mapping stretches the number over a range, either smoothly or in a
fixed number of steps. A tile mapping walks down an ordered list of tiles with weights and picks the
one the number lands on; the order matters, because under a smooth noise source neighbouring list
entries end up next to each other on the canvas.

The mapping belongs to each operation, not to the attribute, so two operations on the same
attribute can use completely different ranges. It runs inside generate, between drawing the number
and combining it into the cell.

## In detail

### Purpose

The header states two invariants. **O5**: mapping is a property of the Operation, never of the
attribute, because `random → rotation` over `[-5, 5]` (jitter) and over `[0, 270] steps 4`
(quarter turns) must both be expressible. **O1**: every Source value passes through exactly one
mapping before reaching a Blend.

### Public surface

| Function | Signature |
| --- | --- |
| [`isTileMapping`](/api/index/functions/istilemapping/) | `(m: Mapping) → m is TileMapping`, true when `"palette" in m` |
| [`applyNumericMapping`](/api/index/functions/applynumericmapping/) | `(m: NumericMapping, t: number) → number` |
| [`applyTileMapping`](/api/index/functions/applytilemapping/) | `(m: TileMapping, t: number) → string \| null` |
| [`paletteTotal`](/api/index/functions/palettetotal/) | `(palette: PaletteEntry[]) → number`, the sum of weights |

### Inputs → outputs

**`applyNumericMapping`**, with `[min, max] = m.range`:

| Case | Result |
| --- | --- |
| continuous, `t === 1` | `max` exactly |
| continuous, otherwise | `min + t * (max - min)` |
| stepped | `index = min(steps - 1, floor(t * steps))`; top index returns `max` exactly, otherwise `min + index * (max - min) / (steps - 1)` |

`min > max` reverses the map, which is how any Source is inverted without a flag. `min === max`
gives a constant.

**`applyTileMapping`**: `target = t * total`. Walk the palette in **authored** order accumulating
weights, and return the first entry whose cumulative weight is strictly greater than `target`.
If none is (only at `t = 1`, where `target === total`), return the **last positive-weight entry's**
`tileId`. For an empty or all-zero palette, return `null`. A `null` `tileId` in an entry is a
legal answer meaning *clear this cell*.

### Invariants

- **Both numeric branches attain `max` exactly.** The Source bound (X6) used to be `[0, 1)`
  half-open; it opened to `[0, 1]` when `gradient` was changed to reach both ends of its extent.
  `gradient` is the only Source that returns `1`.
- **The step-index clamp is load-bearing.** At `t = 1`, `floor(t * steps)` is `steps`, which would
  overshoot `max` by one whole step (`[0, 1]` with `steps: 4` would emit `1.333`).
- **Palette order is authored and significant (O6).** Unlike a Tile's asset list, it is never
  sorted.
- **A zero-weight entry can never win**, neither by the strict comparison nor by being last.
- **No kind tag (C8).** The mapping's shape is discriminated by the Operation's `target`.

### Callers / callees

| Symbol | Caller |
| --- | --- |
| `isTileMapping` | `generate.ts:129`, `:136`; `apps/editor/src/draft.svelte.ts:333`, `:336` |
| `applyTileMapping` | `generate.ts:130` |
| `applyNumericMapping` | `generate.ts:138` |
| `paletteTotal` | `apps/editor/src/draft.svelte.ts:210`; `apps/editor/src/controls/PaletteBar.svelte:35`, `:107`, `:124` |

No callees beyond types.

### Tests: `mapping.test.ts`

- **Numeric:** linear and continuous without `steps`; reverses when `min > max`; constant when
  `min === max`; reproduces the archived flip and quarter-turn examples; shows why flip needs
  `steps` (continuous `[-1, 1]` scales most tiles to near zero); clamps the index at `t = 1`; never
  overshoots `max` for any `steps`; attains `max` when stepped.
- **Tile:** no kind tag needed; bands by cumulative weight; authored order is load-bearing; `null`
  is a legal entry; zero weight never wins, at `t = 1` either; `t = 1` takes the last entry rather
  than clearing; `t = 1` with a `null` last entry returns `null`; total for every `t` in `[0, 1]`.
- **A spec discrepancy, pinned.** A weight is proportion of area only where `t` is uniform. Under
  `valueNoise` the distribution is bell-shaped, so a `[water 1, sand 1, grass 3]` palette gives
  ~10% water at one octave and ~3% at two, not 20%. The test asserts the effect with a stand-in
  distribution.
- **Blends and Targets** (the file also covers `registry/blends.ts`): the three V1 Blends, which
  Target types each accepts, `multiply` vetoed on `rotation`, only `set` on `tileId`, `set` as
  every Target's default, a new numeric Blend available everywhere at once.

### Gotchas & rejected alternatives

- **`max` is returned literally, not computed.** Over `[0.3, 1]` with `steps: 7`, the arithmetic
  gives `0.9999999999999998`. For `scale`, the renderer's identity check compares `sx === 1`
  exactly, so one ulp short takes the matrix path instead of the pixel-snapped box, and seams
  appear.
- **The `t = 1` palette fallback is not a throw.** Before `gradient` reached its far corner, falling
  off the end would have returned `null`, blanking the top row of every palette gradient: a
  silently wrong picture.
- **Linear, not geometric.** A geometric curve suits multiplicative quantities better, but over
  `[0.9, 1.1]` the midpoints differ by 0.005. Linear is legible and crosses zero, which is what
  makes flip an ordinary negative range. `curve` is left as an extension point.
- **Accepted:** under a `random` Source, reordering a palette reshuffles the canvas for no visible
  reason. That is the price of one palette type serving both banded and uniform Sources.

### Review notes

- `mapping.test.ts:14` is titled *"never attains max when continuous, because t < 1 strictly"*.
  The code now returns `max` at `t === 1` and the source comments say X6 is `[0, 1]` closed. The
  test still passes because it feeds `0xffffffff / 2^32`, but its title states the old rule.
- `applyTileMapping` sums the palette with its own loop instead of calling `paletteTotal`, which is
  defined in the same file. Two statements of one sum; harmless today.
