---
title: sources.ts
description: The four registered Sources, each a pure function giving every cell a number in [0, 1], and evalSource, which asserts that range in development.
sidebar:
  order: 24
---

**Written from:** `packages/tileset/src/registry/sources.ts`, `registry/registry.test.ts`, and the
call sites in `generate.ts`, `validate.ts`, `apps/editor/src/reseed.ts` and
`apps/editor/src/lib/OperationDraft.svelte`.

## Overview

A Source supplies a number for each cell. It answers "for this cell, what value?" with a number
between 0 and 1. The operation's mapping then turns that number into something concrete: a tile,
an angle, an opacity. Sources are where variety comes from: a constant, independent random values,
smooth noise that forms patches and waves, or a straight gradient across the grid.

This file is the table of every Source the engine knows, plus the one function the generator
uses to call a Source. In development builds it checks that the number really is between
0 and 1, so a broken Source fails at the cell rather than as an odd picture later.

In the pipeline it sits inside generation: for each selected cell the generator asks the Source
for a value, maps it, and blends it into the cell.

## In detail

### Purpose

`sources.ts` creates the `sources` registry and registers the V1 presets. A Source is
`(params, x, y, ctx) → number`, pure, stateless and total, and all Sources share one signature with
no RNG handle passed in (cites `02` §6). Randomness comes from `hash(...)` on the context's
effective seed, Operation id, position and salt.

### Public surface

| Symbol | Kind | Meaning |
| --- | --- | --- |
| [`sources`](/api/index/variables/sources/) | `Registry<SourceRegistration>` | The table. Exported from `index.ts:104`. |
| [`SourceRegistration`](/api/index/interfaces/sourceregistration/) | interface | `{ name, params, stochastic, impl }` |
| [`evalSource`](/api/index/functions/evalsource/) | `(registration, params, x, y, ctx) → number` | Calls `impl`; in `DEV` throws unless `0 ≤ t ≤ 1`. |
| `SourceImpl` | type | `(params, x, y, ctx: EvalCtx) → number`. Not re-exported by `index.ts`. |

`stochastic` is **declared**, not derived: true when the output depends on the hash. Deriving it
would mean inspecting whether `impl` calls `hash()`, "a static-analysis question with a wrong
answer available in both directions" (cites **X5**). The editor uses it to offer `reseedOnLoad`
only where it means something.

### The registered Sources

| Name | Params | Computes | Stochastic | Output range |
| --- | --- | --- | --- | --- |
| `constant` | none | `0`, always. A fixed value is written as a mapping with `min === max`. | no | `{0}` |
| `random` | none | `hash(effectiveSeed, operationId, x, y, salt)`. Each cell independent. | yes | `[0, 1)` |
| `valueNoise` | `cellsPerFeature`: number `> 0`, required; `octaves`: integer `1–3`, required | Smoothstep-interpolated lattice noise, summed over octaves (see below). | yes | `[0, 1)` |
| `gradient` | `angle`: number (degrees, any value), required | Linear sweep across the Operation's extent, normalized so the first and last cell reach exactly `0` and `1`. | no | `[0, 1]` |

`vignette` is **deliberately absent**. The header says the specification names it but gives no
formula, and coining one in code would make output that no test table can pin. A config naming it
fails as an unknown type.

#### `valueNoise`

For each octave `o` in `0 … octaves-1`: frequency `2^o` (lacunarity fixed at 2), amplitude `0.5^o`
(persistence fixed at 0.5), and a per-octave salt `ctx.salt ^ imul(o + 1, 0x9e3779b1)`. The
sample point is `u = (x + 0.5) · frequency / cellsPerFeature` (likewise `v` for `y`). The four
lattice corners around `(u, v)` are hashed, blended bilinearly with `s(a) = a²(3 − 2a)`, and the
octaves are averaged by amplitude. The source says this is transcribed from the specification's
pseudocode "without variation", and that lacunarity and persistence are fixed because they have
little visible effect at this resolution and every exposed parameter is one more thing a
conforming implementation must reproduce.

#### `gradient`

Direction `(cos, sin)` of `angle` comes from `sincos` (exact at quarter turns). The domain is the
projection of the four **corner cells** of `ctx.extent` (first and last index on each axis); the
sample is the cell's own index projected the same way; `t = (p0 − pmin) / (pmax − pmin)`.
`angle: 0` sweeps left to right, `90` top to bottom (y increases downward). Returns `0` for an empty
extent (`width` or `height ≤ 0`) and when `pmax === pmin` (one row swept vertically, one cell).

`ctx.extent` is the Selection's declared extent, or the whole grid. It includes cells the renderer
clips, and a `rect` extent is not clamped, so an overhanging rect's visible part does not reach the
ends of the range.

### Inputs → outputs

`evalSource(registration, params, x, y, ctx)` returns `registration.impl(params, x, y, ctx)`. When
`DEV` is true and `!(t >= 0 && t <= 1)` (which also catches `NaN`), it throws
`` `Source "<name>" returned <t> at (x, y); 05 X6 requires a finite number in [0, 1].` `` In
production it returns the value unchecked.

### Invariants

- **X6: a Source returns a finite number in `[0, 1]`, closed.** It used to be `[0, 1)`. It was
  widened because `gradient` now reaches `1` at the far corner. The source lists what depended on
  the strict bound, both in `mapping.ts`: the stepped index `floor(t · steps)` (now clamped), and
  the palette walk, which would have returned `null` (clear the cell) at `t = 1` (now falls back to
  the last positive-weight entry).
- **No production clamp.** The source quotes the rejected alternative: clamping "hides the bug at
  the point it would otherwise be visible". In production, a Source violating X6 is undefined
  behaviour, accepted.
- **The assertion also guards the extent contract.** A Selection whose declared extent is narrower
  than the cells it matches makes `gradient` return values outside `[0, 1]`, and this is where that
  surfaces.
- **X3 pattern for multiple draws:** a Source needing several values per cell mixes the salt
  through `imul`, as `valueNoise` does, rather than building a new channel string.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `generate.ts:77` | `sources.get(type)` once per Operation |
| `generate.ts:124` | `evalSource(source, params, x, y, ctx)` per selected cell |
| `validate.ts:358–368` | `has` / `get(...).params` for `UNKNOWN_TYPE_NAME` and parameter checks |
| `apps/editor/src/reseed.ts:53` | `isStochastic`: `sources.get(type).stochastic` |
| `apps/editor/src/lib/OperationDraft.svelte:75, 81, 96, 274` | `all()` for the picker, `get(...).params` for controls and defaults, `stochastic` badge |
| `index.ts:104` | re-export |

(`render/Tileset.svelte:623` calls `sources.get(key)` on a local `Map` of the same name, not this
registry.)

Callees: `Registry`, `sincos` (`angle.ts`), `DEV` (`dev.ts`), `hash` (`hash.ts`), type `EvalCtx`.

### Tests

`registry/registry.test.ts`, block "Source presets — 04 §5.2":

- Exactly four names; `vignette` absent. `stochastic` is true for `random` and `valueNoise`, false
  for `constant` and `gradient`.
- `constant` is always 0.
- `gradient`: angle 0 increases left to right; 90 increases downward; at fifteen angles (including
  `0.5`, `89.999`, `-450`, `1e6`) the minimum is exactly `0` and the maximum exactly `1`;
  normalizes over a Selection extent, not the grid, and runs past `1` below it; an extent past the
  grid edge gives `5/19` and `14/19` at the visible ends; every zero-span case returns `0`.
- `valueNoise`: neighbours are closer than distant cells; at `cellsPerFeature: 1` it does **not**
  degenerate to `random` (pinned as a discrepancy with the specification's prose); it approaches
  random as `cellsPerFeature → 0`; octaves differ; `salt` changes the value.
- Totality: every Source over three grid shapes and the extremes of its parameter space returns a
  finite value in `[0, 1]`, and below `1` for every Source except `gradient`.
- `evalSource` throws `/X6/` in `DEV` for `1.0000000000000002`, `-1e-9`, `NaN`, `Infinity` (and
  returns them unchanged otherwise), and admits exactly `1`.

`apps/editor/src/controls/affordance.test.ts` walks every Source's `ParamSchema`.

### Gotchas & rejected alternatives

- **No `value` parameter on `constant`.** Two controls meaning the same thing, with no rule for
  when they disagree.
- **No reversal parameter on `gradient`.** Use a mapping range with `min > max`.
- **Cell indexes, not cell centres, in `gradient`.** The old version projected the grid's outer
  edges but sampled centres, so over ten rows `t` ran `0.05 … 0.95` and never reached either end.
  The half-cell offset cancels in a linear projection, so carrying it adds arithmetic and error and
  nothing else.
- **`sincos`, not `Math.cos`.** `cos(90°)` is `6.12e-17`, which leaks a column term into a vertical
  sweep and gives a single row a spurious span.
- **Open question, stated in the source:** transcendental functions are implementation-defined in
  ECMAScript, so `cos(37°)` may differ in its last bits between runtimes. Only values landing exactly
  on a `steps` or palette boundary are affected.

### Review notes

- `registry.test.ts:371–373` justifies `valueNoise`'s `+ 0.5` offset by saying *"`gradient`
  projects `(x + 0.5, y + 0.5)` in the same section"*. `gradient` no longer does: `sources.ts`
  explains it now projects cell indexes and that the old centre-based sampling was the defect. The
  test comment is stale (the test itself still holds).
- `valueNoise`'s `cellsPerFeature` and `octaves`, and `gradient`'s `angle`, have no `default`, so
  they are required in a file. The editor fills them via `defaultFor` when drafting
  (`OperationDraft.svelte:96`), but this is not stated in `sources.ts`.
