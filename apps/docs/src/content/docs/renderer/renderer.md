---
title: renderer.ts
description: TilesetRenderer, the tileset renderer as a plain class with no framework. It owns the DOM, the measurement, the image bank and the canvas paint. Canvas only for now.
sidebar:
  order: 2
---

**Written from:** `packages/tileset/src/render/renderer.ts`, with `render/renderer.test.ts`, and the
call sites in `apps/demo/src/parity/Mount.svelte`.

## Overview

`TilesetRenderer` is `<Tileset>` without Svelte. `TilesetModel` derives everything, and this class
owns everything that holds an element or waits on something:

- the elements it adds to the host,
- the measurement subscription and the DPR listener,
- the settling of lazy drawables, and the image bank,
- the canvas paint,
- the responsive wrapper with its reservation stylesheet,
- the development warnings.

```ts
const r = new TilesetRenderer(el, { file, options });
r.update({ options: { ...options, seed: "b" } });
r.destroy();
```

**It draws the canvas substrate only.** Under `substrate: "dom"` it throws in a development build
and draws nothing in production. `<Tileset>` does not use it yet: the component becomes a wrapper
around it once it draws both substrates.

## In detail

### One microtask, for everything

Every trigger pushes its input to the model and queues **one** microtask, which brings the DOM up to
date and paints. The triggers are:

- a measurement,
- `update()`,
- a DPR change,
- a lazy drawable settling,
- a decode landing.

The constructor is the exception. It renders synchronously, so the box has its reserved size when
`new` returns.

**It is the same frame as a synchronous render.** The browser runs pending microtasks right after
each `ResizeObserver` callback, before it paints. So a resize's mask and geometry, which come from
one measurement, are painted before the frame shows. The component's paint `$effect` relied on
exactly this. A synchronous render inside `onMeasure` was rejected: it is a second path to the same
frame, and it paints twice when a decode and a measurement land together.

`#render` works in dependency order:

1. The structure: the wrapper and the reservation.
2. The measurement.
3. The drawables.
4. The bank.
5. The attributes.
6. The paint.

A trigger that fires synchronously inside it (`track()`'s first measurement, `bank.sync`'s
`onChange`) lands before the step that reads it, so it queues nothing.

**There are no dirty flags.** The model's outputs keep their identity until their inputs change, so
`#render` keeps what it last applied and compares. It re-tracks when `targets` moved, re-settles
when `drawables` moved, re-syncs the bank when `sources` moved, and repaints when the draw list, the
geometry, the presentation, the mask, `pending` or the bank's version moved. Each attribute is
written only when its string changed.

### The DOM it owns

The host is the caller's element. It is never styled, replaced or emptied. The renderer appends:

- `.tileset[data-tileset-box]` with its `<canvas>`, and
- while the options have responsive rules, a `.container[data-tileset-wrapper=<id>]` around it,
  with the reservation stylesheet first.

**The box never changes.** When rules appear or go, the box is moved into or out of the wrapper,
never rebuilt. So `renderer.box` keeps its identity, and the tracker keeps watching the element it
registered.

**`options.avoid` resolves in the host.** A selector is matched inside the nearest ancestor of the
box that the package did not add (`measure.ts`'s `scopeOf`), and that is the host. Mount into the
section that holds the headings to avoid. A wrapper component that adds its own host element marks
it `data-tileset-wrapper`, so the scope moves past it to the page's element, as it does for
`<Tileset>`.

### The instance id

`new TilesetRenderer(host, { file, options, id? })`. `id` scopes the reservation stylesheet's
selectors. It defaults to `gts-<random>-<counter>`. The random part keeps two copies of the package
on one page from both naming an instance `gts-1`. An id is not generated output, so **S7** does not
apply. A framework that renders on the server passes its own SSR-stable id. In a development build
an `id` containing `"` or `\` throws, because it is written into a quoted attribute selector.

### Lazy drawables

A provider may return a promise. `#settle` subscribes to each one and writes its `src` into
`sources` when it settles. An epoch counter stands in for the component's per-run `live` flag: a
handler subscribed before a later settle drops its result. Keys the config no longer references are
dropped, so a deleted Tile stops drawing.

Nothing here reports a failure. A rejection is reported by `resolveDrawable`, and a failed decode
by the bank, through `model.report`, which reads `onAssetError` at call time.

### `destroy()`

The order matters:

1. **The flag first.** The queued render, the settle handlers and the bank's callbacks all check
   it, so nothing in flight can paint, write a map or report.
2. **The measurement and the DPR listener**, so no new callback arrives.
3. **The reservation sheet and the renderer's tree**, leaving the host as it was found.

It is idempotent. `update()` after it throws in a development build.

### Public surface

Not yet exported from `render/index.ts`. Exporting it is part of the packaging step.

| Export | What |
| --- | --- |
| `TilesetRenderer` | `new TilesetRenderer(host, init)`, `.update(partial)`, `.box`, `.destroy()`. |
| `TilesetRendererInputs` | `{ file, options? }`. `update()` takes it partially, and a field left out keeps its value. |
| `TilesetRendererInit` | The inputs plus `id?`. |

### Invariants

- **One paint per tick**, however many triggers landed in it.
- **No paint over masked text.** `pending` holds the paint until the keep-out rects exist, and a
  re-track measures synchronously, before the mask is read.
- **The host keeps its identity and its attributes.** Only children the renderer added are ever
  removed.
- **Development checks throw to the caller.** `update()` reads the model's file and options checks
  eagerly, so an invalid input throws there and not from the microtask.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `apps/demo/src/parity/Mount.svelte` | The parity page's stand-in for `<Tileset>`: one renderer per mount, `update()` on every prop change. |

Callees: `model.ts` (`TilesetModel`), `measure.ts` (`track`, `observeDpr`, `currentDpr`),
`styles.ts` (`injectStyles`, `InstanceStyle`), `images.ts` (`ImageBank`, `NaturalSizeChecks`),
`options.ts` (`copyOptions`), `breakpoints.ts` (`FlipFlop`, `inertCellSizeRules`), `edges.ts`
(`coverRect`), `provider.ts` (`parseAssetKey`) and `warn.ts`.

### Tests

`renderer.test.ts` runs under happy-dom, with `track` and `observeDpr` faked and the 2D context
stubbed. It covers:

- The box: mounted and rendered before the constructor returns, and the same element across
  `update()`, rules appearing and rules going.
- Re-tracking when the `avoid` targets change, and nothing drawn while `pending`.
- Several triggers in one tick paint once, and an update that changes nothing does not repaint.
- `destroy()`: the observers and the DPR listener stop, the host is left empty, nothing in flight
  paints, and a second call is a no-op.
- Reporting: a provider rejection once, to the `onAssetError` held now.
- Sources: a deleted Tile's is dropped, and a lazy provider's lands when it settles.
- The development throws: the DOM substrate, and an invalid `update()`.
- Ids, and the reservation's per-instance sheet under a strict CSP.

**The picture is checked by the parity page.** `apps/demo/parity.html` draws each case twice, with
`<Tileset>` and with `TilesetRenderer`, and compares the two canvases pixel for pixel.
`apps/demo/scripts/parity.mjs` drives it across widths and DPRs, and exits non-zero on any
difference.
