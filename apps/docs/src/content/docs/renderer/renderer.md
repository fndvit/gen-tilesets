---
title: renderer.ts
description: TilesetRenderer, the tileset renderer as a plain class with no framework. It owns the DOM, the measurement, the image bank, the canvas paint and the DOM cells.
sidebar:
  order: 2
---

**Written from:** `packages/tileset/src/render/renderer.ts`, with `render/renderer.test.ts`, and the
call sites in `render/Tileset.svelte` and `render/decoration.ts`.

## Overview

`TilesetRenderer` is `<Tileset>` without Svelte. `TilesetModel` derives everything, and this class
owns everything that holds an element or waits on something:

- the elements it adds to the host,
- the measurement subscription and the DPR listener,
- the settling of lazy drawables, and the image bank,
- the canvas paint, or the DOM substrate's `.cell` elements,
- the responsive wrapper with its reservation stylesheet,
- the development warnings.

```ts
const r = new TilesetRenderer(el, { file, options });
r.update({ options: { ...options, seed: "b" } });
r.destroy();
```

**It draws both substrates.** Under `"canvas"` it paints one `<canvas>`; under `"dom"` it keeps one
`.cell` element per shown cell. A switch between them at runtime keeps the box. `<Tileset>` and
`<TileDecoration>` are thin Svelte wrappers around it (0.9.0), and `TileDecorationRenderer`
(`decoration.ts`) is the plain-JS decoration. Both are exported from `@fndvit/gen-tilesets/render`
since 0.9.0. The package README has an Observable Framework example and a wrapper pattern for other
frameworks.

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

1. The structure: the wrapper and the reservation. Then the substrate's elements and the box's
   attributes, so the box is styled (its ratio, or its extent) before it is measured, as the
   component's template is. A box measured bare reads a height of 0.
2. The measurement.
3. The drawables.
4. The bank.
5. The substrate's elements (`#mount`): the canvas, or the cells and the extent.
6. The attributes.
7. The paint, or the cell pass.

A trigger that fires synchronously inside it (`track()`'s first measurement, `bank.sync`'s
`onChange`) lands before the step that reads it, so it queues nothing.

**There are no dirty flags.** The model's outputs keep their identity until their inputs change, so
`#render` keeps what it last applied and compares. It re-tracks when `targets` moved, re-settles
when `drawables` moved, re-syncs the bank when `sources` moved, and repaints when the draw list, the
geometry, the presentation, the mask, `pending` or the bank's version moved. Under `"dom"` it runs
the cell pass when the shown cells, the placement, the mask, the drawables, what lazy drawables
settled to, or the failed loads moved. Each attribute is written only when its string changed.

### The DOM it owns

The host is the caller's element. It is never styled, replaced or emptied. The renderer appends:

- `.tileset[data-tileset-box]` with its `<canvas>`, or with its `.cell`s and `.extent` under
  `"dom"`, and
- while the options have responsive rules, a `.tileset-container[data-tileset-wrapper=<id>]` around
  it, with the reservation stylesheet first. The class was `container` until 0.9.0; a host's
  `.container` rule (Bootstrap's, Tailwind's) reached it.

[DOM hooks](/renderer/dom-hooks/) lists the attributes a host may select on.

**The shared rules are injected once the box is in a page** (`#styles`, `injectStyles`). A box
built detached has no computed style, so `injectStyles` could not see a linked `tileset.css` and
injected anyway. Under a strict CSP that sent the rules to the adopted-sheet fallback, which
cascades after the host's CSS, so host overrides at equal specificity lost even though linking the
file is the CSP advice. Found by the Observable Framework proof in 0.9.0. The first render after
attaching (scheduled by the first measurement) styles the box, before paint and before any cell is
mounted.

**The box never changes.** When rules appear or go, the box is moved into or out of the wrapper,
never rebuilt. So `renderer.box` keeps its identity, and the tracker keeps watching the element it
registered.

**`options.avoid` resolves in the host.** A selector is matched inside the nearest ancestor of the
box that the package did not add (`measure.ts`'s `scopeOf`), and that is the host. Mount into the
section that holds the headings to avoid. A wrapper component that adds its own host element marks
it `data-tileset-wrapper`, so the scope moves past it to the page's element, as it does for
`<Tileset>`.

The tracker reads the scope once, when it registers. A renderer built on a detached element (the
Observable case) has no page around it yet, so `#render` re-tracks whenever the scope it would
resolve in has changed. The first measurement after the element is attached triggers that render.

### The DOM substrate

The box holds one `.cell[data-tileset-cell][data-x][data-y]` per shown cell, then `.extent`, the
only in-flow child, which carries the box's height after measurement (and from the start under
`"fixed"`). The box gets `overflow-visible` when `options.overflow` is `"visible"`, a ratio until it
is measured, and `visibility: hidden` while `pending`. The strings are the pre-0.9.0 component's;
a parity page checked them node for node until it was retired in 0.9.0.

**Cells are keyed by `"x,y"`**, not by the flat index, which a breakpoint that changes `columns`
renumbers. A cell in both grids is the same cell, so it keeps its element and its decoded `<img>`.
The cell pass (`#paintCells`) runs in three steps:

1. **Visit** each shown cell in row-major order. Reuse its node or create one. Write the style
   only when the cell or the placement changed and the string differs, `data-masked` only on a
   flip, and the `<img>` only when the cell's `src` changed.
2. **Remove** every node the visit did not reach.
3. **Order** with a cursor: each node should follow the previous one, and is moved only if it
   does not. Removing first is what keeps this cheap. A resize inserts the new edge columns and
   moves nothing else. A `columns` breakpoint keeps the relative order of shared cells, because
   row-major order of `(x, y)` does not depend on `columns`, so it only inserts too.

Rejected: rebuilding the list (remounts and re-decodes every image), and a minimal-move diff
(nothing needs it, since shared cells never change relative order).

**A cell that can never draw is not mounted at all.** That covers a rejected provider and a `src`
whose `<img>` failed (`loadBlocked`). An empty `.cell` would still take a host's clicks.

**Each `<img>` closes over its own `cell` and `src`.** A new `<img>` is made whenever the cell's asset
or `src` changes, even when two assets share a URL, so its handlers always name the asset it shows.

**An `<img>` taken out of a cell is retired.** That covers a reseed, a removed cell, a switch to
canvas and `destroy()`. Its handlers are cleared, and a size probe still in flight is ignored.
Removing an `<img>` does not stop its request. Without this, a late failure of a `src` no cell
shows would overwrite the key's failed `src` and remount cells known to be broken, or report
twice. The component never had this problem: it swaps `src` on one `<img>`, which aborts the old
request. `onload` runs the natural-size probe shared with the bank (`NaturalSizeChecks`),
so a `src` is probed once across both substrates. `loading` is set before `src`, because setting it
after would start the fetch eagerly.

**Switching substrate.** Going to `"dom"` detaches the canvas and releases its backing store.
Going to `"canvas"` removes the cells, the extent and `overflow-visible`, and re-attaches the
canvas, which repaints. The cells are not kept while the canvas draws.

### The instance id

`new TilesetRenderer(host, { file, options, id? })`. `id` scopes the reservation stylesheet's
selectors. It defaults to `gts-<random>-<counter>`. The random part keeps two copies of the package
on one page from both naming an instance `gts-1`. An id is not generated output, so **S7** does not
apply. A framework that renders on the server passes its own SSR-stable id. In a development build
an `id` containing `"` or `\` throws, because it is written into a quoted attribute selector.

### Lazy drawables

A provider may return a promise. `#settle` subscribes to each one. When it settles, `#settle` writes
its `src` into `sources`, for the bank. It also records the outcome in `settled`, tagged with the
promise it came from, for the DOM cells: a pending cell has no `<img>`, and a rejected one is not
mounted. An epoch counter stands in for the component's per-run `live` flag: a
handler subscribed before a later settle drops its result. Keys the config no longer references are
dropped, so a deleted Tile stops drawing.

A key that is re-resolved lazily keeps its previous `src` while the new promise is pending, so a
`meta` edit does not flash. If that promise rejects, the key is dropped: **R3**, the cell draws
nothing, not the old picture.

Nothing here reports a failure. A rejection is reported by `resolveDrawable`, and a failed decode
by the bank, through `model.report`, which reads `onAssetError` at call time.

### `destroy()`

The order matters:

1. **The flag first.** The queued render, the settle handlers and the bank's callbacks all check
   it, so nothing in flight can paint, write a map or report.
2. **The measurement and the DPR listener**, so no new callback arrives.
3. **The reservation sheet and the renderer's tree**, leaving the host as it was found.

An `<img>` still loading in a removed cell checks the flag too, so a late failure reports nothing.

It is idempotent. `update()` after it throws in a development build. A constructor whose first
render throws calls it before rethrowing, since no instance reaches the caller to do so.

### Public surface

Exported from `@fndvit/gen-tilesets/render` since 0.9.0.

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
- **Development checks throw to the caller.** `update()` reads the model's file, options and
  responsive-rule checks eagerly, so an invalid input throws there and not from the microtask.
- **An update that changes nothing repaints nothing**, responsive rules included: the model
  compares them by content (`sameRules` in `options.ts`), because the options are copied on every
  `update()`.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte` | One renderer per component, built inside `untrack` in an effect, and `update()` on every prop change. |
| `render/decoration.ts` | `TileDecorationRenderer` draws its reshaped file with one. |
| A host with no Svelte | `new TilesetRenderer(el, { file, options })`, e.g. into ``display(html`<div>`)`` in Observable. |

Callees: `model.ts` (`TilesetModel`), `measure.ts` (`track`, `observeDpr`, `currentDpr`),
`styles.ts` (`injectStyles`, `InstanceStyle`), `images.ts` (`ImageBank`, `NaturalSizeChecks`),
`model.ts` (`cellStyle`, `domBoxStyle`, `extentStyle`, shared with the component so the two boxes
cannot drift),
`options.ts` (`copyOptions`), `breakpoints.ts` (`FlipFlop`, `inertCellSizeRules`), `edges.ts`
(`coverRect`), `provider.ts` (`assetKey`, `parseAssetKey`, `loadBlocked`, `recordLoadFailure`,
`settledFor`) and
`warn.ts`.

### Tests

`renderer.test.ts` runs under happy-dom, with `track` and `observeDpr` faked and the 2D context
stubbed. It covers:

- The box: mounted and rendered before the constructor returns, and the same element across
  `update()`, rules appearing and rules going.
- Re-tracking when the `avoid` targets change, and nothing drawn while `pending`.
- Several triggers in one tick paint once, and an update that changes nothing does not repaint,
  with or without responsive rules.
- Re-tracking when a renderer built detached is attached, and styling it then: injected on attach
  with no stylesheet on the page, and nothing injected when the page already has the rules.
- `destroy()`: the observers and the DPR listener stop, the host is left empty, nothing in flight
  paints, and a second call is a no-op.
- Reporting: a provider rejection once, to the `onAssetError` held now.
- Sources: a deleted Tile's is dropped, a lazy provider's lands when it settles, and one whose new
  lazy drawable rejects is dropped.
- The development throws: an invalid `update()`, and a responsive rule the file cannot take. A first render that throws leaves the host empty.
- Each test imports fresh modules, because `styles.ts` remembers blocked documents and happy-dom
  has only one.
- Ids, and the reservation's per-instance sheet under a strict CSP.
- The DOM substrate:
  - row-major order with the extent last;
  - styled, extent included, before the first measurement;
  - the ratio until measured;
  - `visibility: hidden` while `pending`;
  - a mask change touching only flipped cells, and an equal update writing nothing (both
    counted with a `MutationObserver`);
  - a resize and a `columns` breakpoint keeping shared nodes and their order;
  - an `<img>` failure unmounting its asset's cells and reporting once;
  - a failure of an `<img>` a reseed replaced reporting nothing;
  - a late failure of a superseded `src` not unblocking the `src` that failed now;
  - a cell whose asset changes to one with the same URL reporting against the new asset;
  - a switch to canvas silencing the `<img>`s it removed;
  - a lazy drawable mounting on settle and unmounting on rejection;
  - a substrate switch keeping the box and leaving nothing behind;
  - no report after `destroy()`.

**The picture is checked by the demo's screenshot harness** (`apps/demo/scripts/capture.mjs` and
`diff.mjs`): 32 captures, both substrates, fluid and fixed sizing, `avoid` on and off, fractional
cell sizes, DPR 1 and 2, static and resized in place, compared to a pinned baseline at 0 px. Until
0.9.0 a parity page also drew every case with the pre-0.9.0 component beside the renderer and
compared them node for node; it went once the component became the wrapper.
