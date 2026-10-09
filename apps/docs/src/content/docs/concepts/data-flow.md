---
title: Data flow
description: How a tileset file becomes a picture, stage by stage, and how the editor's loop wraps the same path.
sidebar:
  order: 1
---

**Written from:** `packages/tileset/src/load.ts`, `packages/tileset/src/generate.ts`,
`packages/tileset/src/render/Tileset.svelte`, `packages/tileset/src/render/breakpoints.ts`,
`packages/tileset/src/render/occlusion.ts`, `apps/editor/src/session.svelte.ts`,
`apps/editor/src/document.ts`, `apps/editor/src/export.ts`, `apps/editor/src/import.ts`, and the
module pages linked below. Concept page: it names no module of its own.

## Overview

A tileset starts life as a JSON file. That file says how big the grid is, which tiles exist and
which drawings each tile has, and a list of operations that decide, cell by cell, what goes where.
Turning it into a picture takes a fixed sequence of steps, and each step is a separate module with
one job.

First the file is **loaded**: upgraded if it is old and checked for mistakes. Then the engine
**generates** a grid, working out what each cell holds. Then the renderer **measures** the box it
has been given on the page, **places** every cell inside it, **masks** any cell that would cover
page content, and **draws** the result. Only the first two steps know anything about tiles and
operations. Only the last four know anything about pixels.

The editor is a loop around the same path. It keeps one tileset file in memory, changes it one
edit at a time, shows it through the same drawing component a website uses, and saves it as a
file again. What you see in the editor is what a website will get.

## In detail

### The package path

```
raw JSON ─ load ─▶ TilesetFile ─ generate(config, seed, loadSalt) ─▶ Grid<TileState>
                                                                         │
            box width, DPR, keep-out rects ─ measure ─▶ place ─▶ mask ─▶ draw
```

| Stage | Module | Input → output | Knows about |
| --- | --- | --- | --- |
| Load | [load.ts](/engine/load/) → [migrate.ts](/engine/migrate/), [validate.ts](/engine/validate/) | `unknown` → `TilesetFile`, or a throw listing every error | file shape only |
| Responsive reshape | [responsive.ts](/engine/responsive/), [shape.ts](/engine/shape/), [breakpoints.ts](/renderer/breakpoints/) | file + width → file with an overridden shape | widths as numbers, never the DOM |
| Generate | [generate.ts](/engine/generate/), with [hash.ts](/engine/hash/), the [registries](/engine/registry/), [mapping.ts](/engine/mapping/), [attributes.ts](/engine/attributes/), [assets.ts](/engine/assets/) | `(config, seed, loadSalt)` → `Grid<TileState>` | identifiers only, never a pixel or an image |
| Measure | [measure.ts](/renderer/measure/), [space.ts](/renderer/space/) | the DOM → box width, DPR, keep-out rects in render space | the page |
| Place | [geometry.ts](/renderer/geometry/), then [uniform.ts](/renderer/uniform/) | layout + `Wpx` → ideal cell rects → whole-device-pixel cells | pixels, no tiles |
| Mask | [occlusion.ts](/renderer/occlusion/) | painted lattice + rects + drawn extents → one byte per cell | pixels and drawn sizes |
| Resolve | [provider.ts](/renderer/provider/), [images.ts](/renderer/images/) | `(tileId, assetId, meta)` → a `Drawable` `src` | URLs |
| Draw | [Tileset.svelte](/renderer/tileset/) (canvas or DOM branch), [transform.ts](/renderer/transform/), [edges.ts](/renderer/edges/) | everything above → pixels | everything |

`<Tileset>` is the only place these are wired together. [TileDecoration.svelte](/renderer/tile-decoration/)
reshapes a file and hands it to `<Tileset>`. It adds no stage.

### What re-runs when

From [Tileset.svelte](/renderer/tileset/) and [breakpoints.ts](/renderer/breakpoints/):

| Change | Re-runs |
| --- | --- |
| `file.config`, seed or `loadSalt` | generate, and everything after it |
| a breakpoint that changes `rows`/`columns` | generate, once per shape never seen before (`GridCache`) |
| a breakpoint that changes only `cellSize`/`bleed`/`yOffset` | place onward. The config keeps its identity, so generation is skipped |
| a resize inside one band | place, mask, draw |
| page reflow moving a keep-out element | mask, draw |
| `provider` | resolve, draw |

Measurement never reaches `generate()`. A resize can change *which* grid is drawn (through a
breakpoint), but never *what* a given grid contains. See
[Determinism](/concepts/determinism/).

### The editor loop

```
import ─▶ document ─▶ session.apply(transition) ─▶ history ─▶ <Tileset> preview ─▶ export
                ▲                                    │
                └──────────── undo ──────────────────┘
```

- [import.ts](/editor/import/) reads an exported archive back from a map of path → bytes, which
  `ImportPanel.svelte` builds from a zip or a dropped folder. The panel then calls `migrate()` and
  `validate()` itself (not `loadTilesetFile`, because the editor needs the structured errors and the migration
  steps).
- [document.ts](/editor/document/) holds every edit as a pure *transition*, `file → file`, which
  returns the same file unchanged when the edit would make it invalid.
- [session.svelte.ts](/editor/session/) holds the current file in a rune and applies transitions.
  [history.ts](/editor/history/) keeps whole previous values for undo.
- An Operation being built lives in a *draft* outside the file ([draft.svelte.ts](/editor/draft/),
  [drafting.svelte.ts](/editor/drafting/)) until it is complete, so the file never holds a
  half-built Operation.
- The preview is a plain `<Tileset>` on the session's file ([App.svelte](/editor/app/)). Overlays
  draw on top of it and never replace it.
- [export.ts](/editor/export/) serialises the in-memory file as it is, stamping only the current
  `engineVersion`, and
  [download.ts](/editor/download/) zips it with the asset bytes.
