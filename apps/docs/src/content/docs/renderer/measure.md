---
title: measure.ts
description: The one page-wide scheduler that measures every tileset's box, and its keep-out elements, in one layout per frame. Also the DPR observer.
sidebar:
  order: 6
---

**Written from:** `packages/tileset/src/render/measure.ts`, `measure.test.ts`, and the call sites
in `render/Tileset.svelte` and `render/TileDecoration.svelte`.

## Overview

The measurement module is how a tileset learns the size of its box, and, when asked to keep clear
of page content, where that content is. A tileset needs its box width to know how big the cells
are. It needs the screen's pixel density to round cells to whole device pixels. With the avoid
setting it also needs the position of every heading or paragraph it should not draw over, and it
needs to keep that up to date as the page reflows, fonts load, or elements come and go.

Every tileset on a page shares one scheduler. The scheduler owns one of each browser observer, reads
every tileset's measurements together (so ten tilesets cost one layout, not ten), and reports the
box size and the keep-out rectangles in the same callback so that the geometry and the mask are
always computed from one consistent measurement. The results never reach the generator; they feed
placement and the keep-out mask only. In the pipeline: file → load → generate → **measure** → place
→ draw.

## In detail

### Purpose

The header frames this as a concession. The renderer was meant never to measure (cited as **R5**,
§5.3); ADR-006 gave up the letter of that to measure the box's width and the DPR, but kept the
substance: the ratio is still declared, space is still reserved before anything is drawn, and
`cellBox` is still pure. From 0.6.0, and only with `options.avoid` set, it also measures *other*
elements, "because that is the only way to know where text is after it has wrapped".

### Public surface

`track`, `refresh` and `Measurement` are re-exported from `render/index.ts:93`. The rest is
exported from the module for the package's own use and for tests.

| Export | Signature | Meaning |
| --- | --- | --- |
| [`Measurement`](/api/render/interfaces/measurement/) | `{ width, height, rects: RenderRect[] \| null }` | The box's un-rounded layout size and the keep-out rects in render space. |
| [`track`](/api/render/functions/track/) | `(box, targets: NormalizedTargets \| null, onMeasure) → () => void` | Register with the page's shared scheduler. Returns the teardown. |
| [`refresh`](/api/render/functions/refresh/) | `() → void` | Re-measure every tileset on the next frame. |
| `Scheduler` | class: `track`, `refresh`, `flush` | The scheduler itself, constructed with a `MeasureEnv`. |
| `MeasureEnv` | interface | The browser APIs, typed structurally so a test can pass fakes. |
| `browserEnv` | `() → MeasureEnv` | The real browser, or `{}` on a server. |
| `WRAPPER_ATTRIBUTE` | `"data-tileset-wrapper"` | Marks an element the package put around a box. |
| `scopeOf` | `(box) → Element \| null` | The nearest ancestor **not** so marked. |
| `currentDpr` | `() → number` | `devicePixelRatio`, or `1` without a window. |
| `observeDpr` | `(onDpr) → () => void` | Reports every DPR change. |

### Inputs → outputs

**`Scheduler.track(box, targets, onMeasure)`** creates a tracker with the box's
`getBoundingClientRect()` size, observes the box with the shared `ResizeObserver`, and, if
`targets` is not `null`, also observes the scope, rebuilds the `MutationObserver`, observes the box
with the `IntersectionObserver` and binds `document.fonts`' `loadingdone`. It then calls
`flush()`, so `onMeasure` runs **synchronously once** before `track` returns.

**`flush()`** has two phases:

- **Read.** For each dirty tracker: without targets, `rects` is `null`. With targets and on screen,
  re-resolve if needed, then convert each element's client rect to render space with
  `rectToRenderSpace`, using the ResizeObserver's un-rounded width as `layoutWidth`. Off screen, keep
  the last rects and **stay dirty**.
- **Write.** Call back every tracker whose measurement differs from its last one (width, height
  and every rect edge compared).

**Signals:**

| Signal | Effect |
| --- | --- |
| ResizeObserver entry | Marks every tracker watching that element dirty; for a box, stores `borderBoxSize` (else `contentRect`) as width and height; **flushes synchronously**. |
| Mutation in a scope | Ignored if inside any tileset's box. Otherwise marks matching trackers dirty (a `childList` change also re-queries a selector) and schedules a frame. |
| `fonts` `loadingdone` | Marks every tracker with targets dirty; schedules a frame. |
| IntersectionObserver | Sets `onscreen`; coming on screen while dirty schedules a frame. `rootMargin: "100%"`. |
| `refresh()` | Marks every tracker dirty; schedules a frame. |

**`#resolve`** runs a selector inside the scope and drops any match that is the box or inside it;
an element list is used as given. Elements no longer needed are unwatched.

**`observeDpr`** arms a `matchMedia("(resolution: Ndppx)")` query at the current ratio, re-arms on
`change`, and calls `onDpr` each time, including once immediately. Without `matchMedia` it returns
a no-op teardown.

### Invariants

- **One scheduler per page**, created on first use (`shared ??= new Scheduler(browserEnv())`), with
  one observer of each kind.
- **Reads before writes, across every tileset.** "Ten tilesets cost one layout."
- **Flushed inside the ResizeObserver callback**, which runs after layout and before paint, so the
  geometry and mask are painted in the same frame as the resize. Deferring to
  `requestAnimationFrame` "would show one frame of tiles over the text on every resize step".
- **Width and rects in one callback**, so the geometry and mask come from one measurement.
- **A selector never matches inside the box.** Otherwise `"div"` would select every DOM cell, "which
  would then hide itself".
- **A tileset's own mutations are ignored.** Culled cells mounting and `data-masked` toggling are
  mutations inside the scope; reacting to them would re-measure every frame of every resize.
- **Reference-counted observation.** An element is unobserved only when no tracker still watches it.
- **Callbacks, not runes.** No Svelte dependency outside the components; testable with fakes.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:563-572` | An `$effect` calls `track(box, targets, m => { measuredWidth, measuredHeight, keepout = … })`, re-made when the box or the targets (by content) change. |
| `render/Tileset.svelte:246, 557` | `currentDpr()` initialises `dpr`; `observeDpr` updates it. |
| `render/Tileset.svelte:1253` | Puts `WRAPPER_ATTRIBUTE` (value: the instance id) on the responsive container. |
| `render/TileDecoration.svelte:34, 123` | Puts `WRAPPER_ATTRIBUTE` (value `""`) on its sized wrapper. |

`refresh` has no caller in `apps/editor/src` or `apps/demo/src`. Callees: `rectToRenderSpace`
(`space.ts`) and the `NormalizedTargets` type (`options.ts`).

### Tests: `measure.test.ts`

Run against fake elements and observers; "nothing here is a browser".

- Measures synchronously on `track`, in render space.
- Without targets, measures only the box: no mutation or intersection observers.
- One ResizeObserver is shared across every tileset.
- Every tracker is read before any is called back.
- The box width comes from the ResizeObserver, un-rounded.
- No callback when nothing measured changed.
- A selector is re-resolved when the section's children change.
- The selector resolves in the host's section, past the package's own wrappers; the box's parent is
  the scope when the host wrote it.
- A selector never matches the tileset's own cells, and its own mutations are ignored.
- Off screen, keep-out reads are skipped and caught up when the tileset comes back.
- Many signals in one frame are one flush.
- Teardown unobserves everything, and only what no other tracker still needs.

`observeDpr`, `currentDpr` and `browserEnv` are not tested.

### Gotchas & rejected alternatives

- **Not tracked:** a keep-out element moved by a CSS animation or transition, which changes no size
  and mutates nothing. `refresh()` is the host's handle, called on `transitionend` / `animationend`.
- **The scope is the host's section** (`scopeOf`). Until 0.7.0 it was `box.parentElement`, which
  inside `<TileDecoration>` is the decoration's own wrapper, so `avoid: { targets: "h2" }` found
  nothing and watched a subtree that could never change, "silent, with a plausible picture".
  **Rejected:** an explicit `scope` passed down by each wrapper, which every later wrapper would
  have to remember to set.
- **Off-screen margin is a whole viewport**, because the IntersectionObserver notification lands
  after paint and the refresh must finish before the tileset is visible.
- **The MutationObserver has no per-target `unobserve`**, so a change in the set of scopes takes
  pending records, disconnects, and re-observes the survivors.
- Mutations watch `childList`, `characterData`, and only the `class`, `style` and `hidden`
  attributes.

### Review notes

- The first measurement in `track` takes `width`/`height` from `getBoundingClientRect()`, which is
  the **on-screen** size and includes any ancestor's CSS scale. Every later measurement uses the
  ResizeObserver's layout size, which does not. Under a scaled ancestor (the editor's preview frame,
  per `space.ts`) the synchronous first callback therefore reports a zoomed `Wpx` until the
  ResizeObserver's first entry corrects it. This is possibly a one-frame wrong geometry; the
  `Measurement.width` doc says "un-rounded layout width", which the first value is not.
- `observeDpr` and `currentDpr` have no test.
