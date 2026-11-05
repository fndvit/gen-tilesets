---
title: preview/width.ts and view.svelte.ts
description: The preview's own state (width, backdrop, grid toggle) and the tested arithmetic behind it. Shared by the top bar, the breakpoint bar and the frame; writes no field.
sidebar:
  order: 53
---

**Written from:** `apps/editor/src/lib/preview/width.ts`, `apps/editor/src/lib/preview/view.svelte.ts`,
`width.test.ts`, and the call sites in the preview components.

## Overview

The preview column has three parts that all need the same few numbers: the
[top bar](/editor/preview-bars/) sets the width and the backdrop, the
[breakpoint bar](/editor/preview-bars/) sets the width, and the
[frame](/editor/preview-frame/) measures the column, drags the edges and draws at the result. They
are siblings in `App.svelte`, because the bars stay put while the picture scrolls, so the state
lives in one module, `view.svelte.ts`, rather than inside any one of them.

None of it reaches the document. It is session state that a reload forgets.

## In detail

### `view.svelte.ts`: the `preview` object

| Member | Kind | Meaning |
| --- | --- | --- |
| `available` | get / set | The preview column's width, set by `PreviewFrame`'s `bind:clientWidth`. |
| `requested` | get / set | `null` for Fill (the starting state), or a width in px. |
| `background` | get / set | The colour behind the picture, across the whole picture area. Starts `#ffffff`. |
| `showGrid` | get / set | Whether the grid is drawn. Starts `true`. |
| `room` | get | `roomFor(available)`. |
| `width` | get | `widthFor(requested, room)`: `Wpx`. |
| `zoom` | get | `zoomFor(width, room, available)`. |

It holds runes only. The arithmetic is in `width.ts` so it can be tested: the tests run without
the Svelte plugin (see `vitest.config.ts`), so a module holding `$state` cannot be imported by one.

### `width.ts`

| Export | Value or rule |
| --- | --- |
| `MIN_WIDTH` | `160`: the handles cannot cross. No width is illegal (`07` §5.3). |
| `PRESETS` | `360, 768, 1024, 1440` (Figma's size bar). Not "breakpoints": that word is the file's. |
| `HANDLE` | `16`, the gutter each handle needs beside the frame: half of `--handle-w`, since the hit area is centred on the edge. |
| `WHITE` | `#ffffff`, the default backdrop. |
| `roomFor(available)` | `max(floor(available) − 2 × HANDLE, MIN_WIDTH)`. Floored so a preset draws the same picture run to run. |
| `widthFor(requested, room)` | `room` for Fill, else `max(requested, MIN_WIDTH)`. **Not clamped to the column**: the zoom fits it instead. |
| `zoomFor(width, room, available)` | `min(1, room / width)`; `1` before measurement. Only shrinks, and is not `s`. |
| `boundsOf(rules)` | Every distinct `minWidth` / `maxWidth`, ascending. |
| `activeBound(bounds, width)` | The smallest bound ≥ the width, or `null` above the largest (Pol, Stage 2: 860 → 1024). |
| `holdingLabel(rules, width)` | `"base"` or `"rule i + j"`, from [`activeRules`](/api/index/functions/activerules/). |

### Invariants

- **Writes no field** (**E11**, **E4**): width, backdrop and grid toggle sit beside the file.
- **One `Wpx`.** The frame draws at `preview.width`, and the bars show the same number.

### Tests

`width.test.ts`: the room floors and keeps the gutter, never under the minimum; Fill fills, a wide
request is kept, a tiny one is raised; the zoom shrinks, never magnifies, and is 1 unmeasured;
bounds are distinct and sorted; the active bound is the next one up, the bound itself when the
width lands on it, and none above the largest; the holding label names rules or says base.
