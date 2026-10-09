---
title: Glossary
description: Every term the source uses with a fixed meaning, in one place, each linked to the page that defines it.
sidebar:
  order: 2
---

**Written from:** `packages/tileset/src/types.ts`, `packages/tileset/src/hash.ts`,
`packages/tileset/src/render/options.ts`, `packages/tileset/src/render/geometry.ts`,
`apps/editor/src/document.ts`, and the module pages linked below. Concept page: it names no module
of its own.

## Overview

The source uses a small vocabulary very precisely, and several of its words have ordinary meanings
that differ from the ones meant here. This page collects them. Each entry says what the term means
in this codebase and links to the page where it is defined.

A few names are fixed and are never "cleaned up": a cell's contents are a **TileState** (not a
cell state), a kind of tile is a **Tile** (not a tile type), and one of a tile's drawings is a
**TileAsset** (not a variant).

## In detail

### The file

| Term | Meaning | Defined in |
| --- | --- | --- |
| **TilesetFile** | The whole thing on disk: `schemaVersion`, `engineVersion`, `config`, `layout`, optional `responsive`. The only name for it in the package. | [types.ts](/engine/types/) |
| **TilesetConfig** | What the engine reads: `rows`, `columns`, `tiles`, `operations`, `defaultSeed`, `assetSalt`, `reseedAssetsOnLoad`. Passing the whole file to `generate()` is a type error. | [types.ts](/engine/types/) |
| **Layout** | What the renderer reads: `cellSize`, `referenceWidth`, `yOffset`, and `horizontalAlignment` (authoring metadata that neither reads). | [types.ts](/engine/types/) |
| **Tile** | A kind of tile, with an `id`, a `name` and one or more TileAssets. | [types.ts](/engine/types/) |
| **TileAsset** | One drawing of a Tile, with an `id`, a `weight` and free-form `meta` (`meta.src` by convention). Chosen per cell by a weighted walk in id order. | [assets.ts](/engine/assets/) |
| **Operation** | One step of the stack: a Selection, a Source, a Mapping, a Target and a Blend, plus `id`, `salt` and `reseedOnLoad`. | [types.ts](/engine/types/), [generate.ts](/engine/generate/) |
| **Selection** | Which cells an Operation acts on (`all`, `rect`, `checkerboard`, `everyNth`, `random`, `cellList`). *Coordinate-bound* Selections (`rect`, `cellList`) name cells by position and cannot follow a resize. | [selections.ts](/engine/selections/), [selection.ts](/engine/selection/) |
| **Source** | A number in `[0, 1]` per cell (`constant`, `random`, `valueNoise`, `gradient`). | [sources.ts](/engine/sources/) |
| **Mapping** | Turns a Source's number into a value: a numeric range (optionally stepped), or a weighted palette of tile ids (with `null` for empty). | [mapping.ts](/engine/mapping/) |
| **Target** | Which field of the TileState an Operation writes: `tileId` or a numeric attribute. | [blends.ts](/engine/blends/), [attributes.ts](/engine/attributes/) |
| **Blend** | How the mapped value combines with what is there: `set`, `add`, `multiply`. Only `set` accepts `tileId`. | [blends.ts](/engine/blends/) |
| **Attribute** | A numeric TileState field with a default and bounds: scale, scaleX, scaleY, rotation, opacity, translateX, translateY. | [attributes.ts](/engine/attributes/) |
| **Shape** | The five fields a reshape or responsive rule may set: `rows`, `columns`, `cellSize`, `bleed`, `yOffset`. | [shape.ts](/engine/shape/) |
| **Bleed** | Columns that hang off the sides of the box: `columns − referenceWidth / cellSize`. Stands in for `referenceWidth` in every override. | [shape.ts](/engine/shape/) |
| **Responsive rule** | A Shape override with `minWidth`/`maxWidth`. Every matching rule applies in order, and a later one wins field by field (CSS's cascade). | [responsive.ts](/engine/responsive/) |
| **Schema version** | Which shape of file this is. Old ones are migrated; newer ones are refused. | [Versioning](/concepts/versioning/) |

### Generation

| Term | Meaning | Defined in |
| --- | --- | --- |
| **TileState** | One cell's result: `tileId`, `assetId` and the attributes. Identifiers only, never an image. | [types.ts](/engine/types/) |
| **Grid** | `rows × columns` TileStates, row-major. | [types.ts](/engine/types/) |
| **Seed** | A string, a runtime parameter. The engine never applies `defaultSeed` itself; the renderer does. | [hash.ts](/engine/hash/) |
| **loadSalt** | An integer the host draws once per page load. It only affects channels flagged `reseedOnLoad`. | [hash.ts](/engine/hash/) |
| **Salt** | `Operation.salt` and `config.assetSalt`: integers in `[0, 2³²)` that reroll one channel. | [hash.ts](/engine/hash/), [reseed.ts](/editor/reseed/) |
| **Channel** | The string that separates hash streams: an `operationId`, `operationId + ":selection"`, or `"asset"`. | [hash.ts](/engine/hash/) |
| **Effective seed** | The seed a channel actually hashes against: `plain`, or `onLoad` (mixed with `loadSalt`) when the channel is flagged. | [hash.ts](/engine/hash/) |
| **ctx** | The per-Operation context handed to Selections and Sources: grid size, extent, effective seed, operation id, salt. | [ctx.ts](/engine/ctx/) |
| **Registry** | The named sets of Selections, Sources and Blends, with parameter schemas. An unknown name throws. | [registry.ts](/engine/registry/) |

### Rendering

| Term | Meaning | Defined in |
| --- | --- | --- |
| **Render box** | The element `<Tileset>` owns. No padding, no border. The only clipping boundary. | [Tileset.svelte](/renderer/tileset/) |
| **Wpx** | The render box's width in CSS px. | [geometry.ts](/renderer/geometry/) |
| **s** | The scale, `Wpx / referenceWidth` (fluid) or `1` (fixed). | [geometry.ts](/renderer/geometry/) |
| **Fluid / fixed sizing** | Whether the design scales with the box, or keeps its CSS px size and is cropped. | [geometry.ts](/renderer/geometry/) |
| **Design px / render space / device px** | Design units, CSS px from the box's top-left, and physical pixels. | [Design space and render space](/concepts/spaces/) |
| **Substrate** | How `<Tileset>` paints: `"canvas"` (default) or `"dom"`. | [The two substrates](/concepts/substrates/) |
| **Lattice** | The integer device-pixel grid a substrate actually painted on. | [uniform.ts](/renderer/uniform/) |
| **Provider** | `AssetRef → Drawable`: turns `(tileId, assetId, meta)` into an image `src`. Never substitutes. | [provider.ts](/renderer/provider/) |
| **Hole** | A cell whose asset failed: it draws nothing, never a placeholder or a sibling asset. | [Tileset.svelte](/renderer/tileset/) |
| **Avoid / keep-out** | Page elements the tileset must not draw over. Measured in render space. | [measure.ts](/renderer/measure/), [options.ts](/renderer/options/) |
| **Mask** | One byte per cell: hide or show. Hides whole tiles and never touches the grid. | [occlusion.ts](/renderer/occlusion/) |
| **Host rule** | A responsive rule written by the page (`options.responsive`), which may also set `sizing` and `align`. Replaces the file's rules. | [options.ts](/renderer/options/) |
| **Decoration** | One style placed as a small block of whole cells, sized `columns × cellSize`. | [TileDecoration.svelte](/renderer/tile-decoration/) |
| **DEV** | The flag that turns on development-only checks. It folds to `false` in a production build. | [dev.ts](/engine/dev/) |

### Editor

| Term | Meaning | Defined in |
| --- | --- | --- |
| **Document** | The editor's state *is* a TilesetFile, exactly as it will be exported. | [document.ts](/editor/document/) |
| **Transition** | A pure `file → file` edit. It returns the same file when the edit would make it invalid (a *refusal*). | [document.ts](/editor/document/) |
| **Session** | The live document in a rune, changed only through `apply()`. | [session.svelte.ts](/editor/session/) |
| **History** | Whole previous values for undo. A refusal pushes nothing. | [history.ts](/editor/history/) |
| **Draft** | An Operation being built, held outside the file until it is complete. | [draft.svelte.ts](/editor/draft/), [drafting.svelte.ts](/editor/drafting/) |
| **Orphan** | A coordinate-bound Operation that no longer reaches what it was authored to after a resize. It is reported as an advisory and never repaired. | [orphans.ts](/editor/orphans/) |
| **Reference image** | A picture of the destination page, drawn under the preview at the box's width. | [reference.ts](/editor/reference/) |
| **E2** | One pinned package both previews and stamps `engineVersion`. | [Versioning](/concepts/versioning/) |
