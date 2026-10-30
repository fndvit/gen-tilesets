---
title: DOM hooks
description: The data- attributes and classes the renderer writes, which of them a host may select on, and which are internal.
sidebar:
  order: 4
---

**Written from:** `packages/tileset/src/render/renderer.ts`, `packages/tileset/src/render/tileset.css`,
and the call sites in `render/decoration.ts`, `render/Tileset.svelte`, `render/TileDecoration.svelte` and
`render/Placeholder.svelte`.

## Overview

Since 0.9.0 the renderer's markup is the same whichever way it is mounted: `<Tileset>`,
`TilesetRenderer`, or a wrapper for another framework. These are the attributes a host may select
on. They are public from 0.9.0: renaming or removing one is a changelog line and a version bump.

**Select on the attribute, not the class.** The classes (`.tileset`, `.cell`, `.extent`,
`.presented`, `.tileset-container`, `.decoration`) are still written, and `tileset.css` selects on
class *and* attribute to keep the specificity the scoped Svelte styles had (see
[styles.ts](/renderer/styles/)). They stay through `0.x` for compatibility. But a bare `.cell` is a
name any page might use, and the attribute is the one that says "this is the package's".

## The hooks

| Attribute | On | Meaning |
| --- | --- | --- |
| `data-tileset-box` | the render box | The element whose width is `Wpx`. `aria-hidden="true"`. This is `renderer.box` and `<Tileset bind:box>`. |
| `data-measured` | the render box | Present once the box has been measured. Before that it shows its declared ratio (or its fixed height). |
| `data-tileset-canvas` | the `<canvas>` | Under `substrate: "canvas"`. Wider than the box by the bleed; do not constrain its width (see below). |
| `data-tileset-cell` | each cell | Under `substrate: "dom"`. One per shown cell. |
| `data-x`, `data-y` | each cell | The cell's grid coordinates. What a click handler reads. |
| `data-masked` | a cell | Present while `options.avoid` hides it. The cell has `visibility: hidden` and takes no hits. |
| `data-tileset-extent` | a zero-width child of the box | Under `"dom"`: carries the box's height. |
| `data-tileset-wrapper` | the responsive wrapper, a decoration's box, and a wrapper component's host | Marks an element as the package's, so `options.avoid` resolves outside it. With responsive rules the box sits in a `.tileset-container` whose value is the instance id; the others carry an empty value. To select only the responsive wrapper, use `.tileset-container[data-tileset-wrapper]`. |
| `data-tileset-decoration` | a decoration's outer box | `TileDecorationRenderer` / `<TileDecoration>`. Its width is `columns * cellSize`, capped at `100%`. |
| `data-tileset-host` | `<Tileset>`'s and `<TileDecoration>`'s root `div` | `display: contents`. Svelte only. |
| `data-tileset-placeholder` | the render box in server HTML | Present only between the server render and hydration. |

Internal, not for selecting: `data-gen-tilesets` on the injected `<style>` (its value is a hash of
the rules), the `--gen-tilesets` custom property on the box (a sentinel), and the
`overflow-visible` class.

## In detail

### Clicking a cell

Under `"dom"` the cell is the hit target, and its `data-x`/`data-y` say which:

```js
renderer.box.addEventListener("click", (e) => {
  const cell = e.target.closest("[data-tileset-cell]");
  if (cell) console.log(cell.dataset.x, cell.dataset.y);
});
```

**Animate the `<img>` inside a cell, never the cell.** The cell's box is the hit area. Moving it
moves the hit area under the pointer.

### Styling around the tileset

Style an element you own, not the box. The box's width, padding and border are what make `Wpx`
mean anything (**S9**), so `tileset.css` sets them. A host's `max-width` on a wrapper of its own is
the way to size it.

A common reset, `img, canvas { max-width: 100%; height: auto }`, is already handled: the canvas's
own rule, `.presented[data-tileset-canvas] { max-width: none }`, is more specific than the reset's
element selector, so the reset cannot clamp it.

### Why the wrapper is not `.container`

Until 0.9.0 the responsive wrapper's class was `container`. Bootstrap and Tailwind both style
`.container` (centred, capped, padded), which could narrow every responsive tileset on such a page. The
attribute kept the package's rule off a host's `.container`, but nothing kept the host's rule off
the package's element.
