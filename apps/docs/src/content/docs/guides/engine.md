---
title: The engine
description: generate(), the attributes each cell carries, and the geometry functions for building tools on top.
sidebar:
  order: 7
---

Most hosts never call the engine: the renderer calls `generate()` itself. This page is for building
tools on top, such as an overlay, a brush or a validator.

## `generate()`

`generate(config, seed, loadSalt) → Grid<TileState>` is a **pure function**. Given the same three
inputs, it returns the same result on any machine, in any runtime, at any time.

It never receives a viewport, a device pixel ratio, a cell size, an asset URL or the clock.
Randomness comes from **positional hashing**, not a sequential random number generator. That keeps
a resized grid stable and lets each Operation be rerolled on its own.

`generate()` **trusts its input.** Validation is a separate function and not part of generating.
Load files with `loadTilesetFile`, or with `migrate()` followed by `validate()`. See
[Getting started](/guides/getting-started/#3-load-it).

## Cell attributes

Operations write these per cell. A fresh cell holds the default.

| Attribute | Default | Range | What it does |
| --- | --- | --- | --- |
| `scale` | `1` | any number | Uniform scale, applied to both axes. |
| `scaleX`, `scaleY` | `1` | any number | Per-axis scale. A negative value flips. |
| `rotation` | `0` | degrees, wraps at 360 | Clockwise, about the tile's centre, after scale. |
| `opacity` | `1` | `[0, 1]`, clamped | |
| `translateX`, `translateY` | `0` | any number | Moves the drawn tile off its cell, in **cells** (`0.5` is half a cell), with `y` pointing down. Applied after scale and rotation, so the tile turns about where it lands. |

A translated tile is still its home cell in every other sense: Selections, hashing and paint order
go by where it lives, not where it is drawn. Translation never changes the tileset's size, so a tile
moved past the edge is cut off or not visible. The movement is rounded to a whole device pixel, so
neighbours moved by the same amount still meet with no seam. For jitter, use `random` →
`[-0.2, 0.2]` → `add`.

## Geometry for tools

`@vit-foundation/gen-tilesets/render` exports the coordinate mapping as pure functions, so every
overlay uses the same one:

- `cellBox(...)`: where a cell is, in render space.
- `cellAt(...)`: which cell is under a point. The editor's brush uses it.

`TilesetRenderer.box` (or `bind:box` on `<Tileset>`) is the render box to convert pointer positions
against. You need these to build an editor, not to draw a picture.

The root entry, `@vit-foundation/gen-tilesets`, holds only the engine: `generate`, `selection`,
`reshape`, `loadTilesetFile`, and the `validate` and `migrate` functions. Nothing in it touches the
DOM.
