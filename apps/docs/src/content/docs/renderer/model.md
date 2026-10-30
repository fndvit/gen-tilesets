---
title: model.ts
description: TilesetModel, everything <Tileset> derives from its inputs as a plain class of memoized stages, plus the pure DOM cell-style functions.
sidebar:
  order: 2
---

**Written from:** `packages/tileset/src/render/model.ts`, with `render/model.test.ts`, and the call
sites in `render/Tileset.svelte`.

## Overview

`TilesetModel` is the renderer's pipeline with no DOM in it. A renderer pushes four kinds of input:

- the file,
- the options,
- what `measure.ts` measured,
- the device pixel ratio.

It reads back the grid, the geometry, the keep-out mask, the canvas draw list and the DOM cell
list. Before the framework-agnostic core, this was a chain of `$derived`s inside `Tileset.svelte`,
which could not be unit-tested or used without Svelte. The Svelte component now owns only the
elements and the side effects, and reads everything else from here.

The file also holds `cellStyle` and the two placement functions it chooses between. They are pure,
and turn a cell into its inline style under `substrate: "dom"`.

## In detail

### How it recomputes

Each stage is a `Memo`. A memo works like a `$derived`:

- **It recomputes only when a dependency changed by `Object.is`**, the same equality `$derived`
  uses.
- **It is read lazily.** A stage nobody reads, such as the draw list under `"dom"`, never runs.
- **A throw leaves it empty**, so the next read retries. A host that fixes its file gets a picture,
  not the cached error.

**R12** survives the port for the same reason it held before. `resolved` recomputes on every new
`options` object, but each field (`seed`, `loadSalt`, `substrate`, `provider`, `padding`, …) is its
own stage holding a primitive or a stable reference. So an inline options object rebuilt with
equal values stops at the unpacking and never reaches `generate()`.

**The clock is what makes it cheap, and it was measured.** The model's `#tick` moves only when
`set()` changed an input. A memo already validated at the current tick returns at once, so each
stage is checked at most once per push. Without the clock, a renderer reading twenty outputs walked
the same chain twenty times. On the demo that added 20–30% to the script time of every resize.

**There are no dirty flags.** Every output keeps its identity until its inputs change. A consumer
keeps what it last applied and compares, the way a Svelte `$effect` decides whether to re-run.

Both alternatives were rejected:

- **One `recompute()` with hand-written change checks.** A missed check is a stale picture that
  nothing reports, and it cannot be tested stage by stage.
- **A signals library.** It is a dependency doing what `Memo` does in twenty lines.

### Public surface

Internal to the package. `render/index.ts` does not export it.

| Export | What |
| --- | --- |
| `Memo<D, T>` | One derived value: `new Memo(deps, fn, clock?)`, `.get()`, `.runs`. |
| `ModelInputs` | `{ file, options, width, height, rects, dpr }`. A width of `0` means "not measured yet". |
| `TilesetModel` | `new TilesetModel(uid, init)`, `.set(partial)`, `.inputs`, `.report`, and one getter per output. |
| `ShownCell`, `Placement` | Shapes of the DOM cell list and of `cellStyle`'s input. |
| `cellStyle(p, cell, x, y)` | A DOM cell's whole inline style: placement, then transform, then opacity. |
| `affineCellStyle(p, cell, x, y)` | Placement before measurement: affine CSS lengths that are correct at every width. This is the seam a future server-side `renderHtml()` would build on. |
| `measuredCellStyle(u, dpr, cell, x, y)` | Placement after measurement: px from `domGeometry`'s square cell. |

### Inputs → outputs

`set(next)` changes nothing, and moves no clock, when every field is `Object.is`-equal to the
current one. The outputs are getters:

- **Options:** `substrate`, `overflow`, `targets`, `base`, `checked`, `rules`, `hasRules`,
  `ruleKey`, `reservation`, `sizing`.
- **Generation:** `grid`, `ratio`, `fixedHeight`, `metaByKey`, `drawables`.
- **Geometry:** `uniform`, `domCell`, `presentation`, `shownCells`, `placement`.
- **Masking and painting:** `mask`, `pending`, `items`.

`runs` reports the run count of the main stages, and only tests read it.

`report(ref, cause)` calls `options.onAssetError` as the options are **now**, read at call time.
A new identity of a host's inline callback does not re-resolve every asset, and a report reaches
the callback the host holds today.

### Invariants

- **Nothing asynchronous or element-bound lives here.** That covers the settled drawables, failed
  loads, the image bank, the measurement subscription and painting. `drawables` is the exception:
  it calls the provider, but it is a memo whose only side effect is a failure report, as it was
  as a `$derived`.
- **Development checks fold.** `assertValidFile`, `optionErrors` and the responsive-rule checks run
  under inline `if (DEV)`, and throw.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte` | One `new TilesetModel(uid, …)` per instance. `model.set(...)` runs in one `$derived.by` that returns a version number, and each output the template uses is its own `$derived` on that version. `model.report` is passed as `onAssetError`. `cellStyle` places DOM cells. |

Callees include `load.ts` (`assertValidFile`), `responsive.ts`, `shape.ts` (`reshape`),
`breakpoints.ts` (`GridCache`, `reservationCss`), `geometry.ts`, `occlusion.ts`, `options.ts`,
`provider.ts` (`DrawableCache`), `transform.ts` and `uniform.ts`.

### Tests

`model.test.ts` runs in node with no DOM. It covers:

- `Memo`: its equality, its clock, and not caching a throw.
- **R12**: a width change inside a band, a seed change and a provider change; an inline options
  object rebuilt with equal values; a push that changes nothing.
- The keep-out mask: identity, `pending`, and a padding change re-running only the mask.
- Responsive rules: rule keys and the reservation stylesheet.
- Substrates: which stages each one builds, and culling.
- `cellStyle`: before and after measurement.
- The development-build throws.
- `report` reading the current callback.
