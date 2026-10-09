---
title: types.ts
description: The nouns of the package. Every shape the engine reads or returns, plus the one grid lookup.
sidebar:
  order: 2
---

**Written from:** `packages/tileset/src/types.ts`, the tests that import from it
(`generate.test.ts`, `selection.test.ts`, `shape.test.ts`, `responsive.test.ts`), and the import
sites in `packages/tileset/src`, `apps/editor/src` and `apps/demo/src`.

## Overview

The types module is the vocabulary of the whole package. It describes what a tileset file looks
like on disk, what the engine takes as its input, and what it hands back: a grid of cells, each
holding which tile sits there and how it is scaled, rotated, faded and moved.

It contains almost no behaviour. Its job is to fix names and shapes so that the loader, the engine,
the renderer and the editor all mean the same thing by "a tile" or "a cell". Every other page in
this section reads types from here.

It sits underneath the whole pipeline (file → load → generate → draw): the loader produces a
checked tileset file, the engine reads its configuration and returns a grid, and the renderer reads that
grid together with the file's layout.

## In detail

### Purpose

`types.ts` declares the data model: identifiers, the closed attribute and target sets, `TileState`
and `Grid`, `Tile` and `TileAsset`, the parts of an `Operation`, the engine input `TilesetConfig`,
the renderer-only `Layout`, the overridable `Shape` and its conditional form `ResponsiveRule`, and
the on-disk `TilesetFile`. Its one runtime export is `tileStateAt`. The header fixes terminology:
`TileState` not `CellState`, `Tile` not `TileType`, `TileAsset` not `Variant`.

### Public surface

Everything below is re-exported from `index.ts:138–163`.

| Symbol | Kind | What it is |
| --- | --- | --- |
| [`Uint32`](/api/index/type-aliases/uint32/) | type | `number`, documented as an integer in `[0, 2^32)`. |
| [`Identifier`](/api/index/type-aliases/identifier/) | type | `string`, documented as `[A-Za-z0-9_-]+`, unique in its scope. |
| [`AttributeName`](/api/index/type-aliases/attributename/) | type | `"scale" \| "scaleX" \| "scaleY" \| "rotation" \| "opacity" \| "translateX" \| "translateY"`. |
| [`TargetName`](/api/index/type-aliases/targetname/) | type | `"tileId" \| AttributeName`. |
| [`TargetType`](/api/index/type-aliases/targettype/) | type | `"numeric" \| "tile"`, and only those two. |
| [`TileState`](/api/index/interfaces/tilestate/) | interface | One cell's resolved state: `tileId`, `assetId` (both `string \| null`) and the seven attributes. |
| [`Grid<T>`](/api/index/interfaces/grid/) | interface | `{ rows, columns, cells: T[] }`, flat, row-major, index `y * columns + x`. |
| [`tileStateAt`](/api/index/functions/tilestateat/) | function | `(grid, x, y) → T \| undefined`. |
| [`TileAsset`](/api/index/interfaces/tileasset/) | interface | `{ id, weight, meta? }`. |
| [`Tile`](/api/index/interfaces/tile/) | interface | `{ id, name, assets }`. |
| [`Selection`](/api/index/interfaces/selection/), [`Source`](/api/index/interfaces/source/) | interface | `{ type: string, [param]: unknown }`, parameters spread beside `type`. |
| [`Extent`](/api/index/interfaces/extent/) | interface | A half-open rectangle in cell units, `{ x, y, width, height }`. |
| [`BlendName`](/api/index/type-aliases/blendname/) | type | A bare string. |
| [`NumericMapping`](/api/index/interfaces/numericmapping/) | interface | `{ range: [min, max], steps? }`. |
| [`PaletteEntry`](/api/index/interfaces/paletteentry/), [`TileMapping`](/api/index/interfaces/tilemapping/) | interface | `{ tileId \| null, weight }` and `{ palette }`. |
| [`Mapping`](/api/index/type-aliases/mapping/) | type | `NumericMapping \| TileMapping`, with no kind tag. |
| [`Operation`](/api/index/interfaces/operation/) | interface | `{ id, salt?, reseedOnLoad?, selection, source, target, mapping, blend }`. |
| [`TilesetConfig`](/api/index/interfaces/tilesetconfig/) | interface | The engine's input: `rows`, `columns`, `defaultSeed`, `assetSalt?`, `reseedAssetsOnLoad?`, `tiles`, `operations`. |
| [`Layout`](/api/index/interfaces/layout/) | interface | Renderer-only: `cellSize`, `referenceWidth`, `yOffset`, `horizontalAlignment`. |
| [`Shape`](/api/index/interfaces/shape/) | interface | `rows`, `columns`, `cellSize`, `bleed`, `yOffset`. |
| [`ResponsiveRule`](/api/index/interfaces/responsiverule/) | interface | `Partial<Shape>` plus `minWidth?`, `maxWidth?`. |
| [`TilesetFile`](/api/index/interfaces/tilesetfile/) | interface | `{ schemaVersion: 4, engineVersion, config, layout, responsive? }`. |

### Inputs → outputs

`tileStateAt(grid, x, y)` returns `grid.cells[y * columns + x]`. Any coordinate outside
`[0, columns) × [0, rows)`, including a negative one, returns `undefined`. It never wraps.

Field meanings the comments pin down:

- **`TileState.translateX` / `translateY`** are in **cells**, not pixels. `1` is one cell side.
  They use grid axes with `y` increasing downward, and apply *after* scale and rotation, so the tile
  turns about its own centre and then moves. Per-cell scale does not multiply them. The cell keeps
  its Selection membership, hashes, index and paint order; only the drawing moves.
- **`TileState.scale`** is uniform and is multiplied into both axes at render time.
- **`TileAsset.weight`** is `>= 0` and finite. Zero means listed but never chosen. `meta` is opaque
  to the engine.
- **`Tile.name`** is authoring only and never affects output. A Tile has at least one asset.
- **`NumericMapping`**: `min > max` is legal and reverses the map. An absent `steps` means
  continuous.
- **`PaletteEntry.tileId: null`** is legal and means clear this cell. Palette order is significant.
- **`TilesetConfig.defaultSeed`** is carried but never read by the engine. It is required so that a
  config renders standalone. `operations` order is the stack order and is never canonicalized.
  `tiles` may be empty.
- **`Layout.referenceWidth`** is not `columns * cellSize`; the difference is the intentional bleed.
  `yOffset` is a fraction of a cell in `[0, 1)` and shifts the grid *up*.
- **`Shape.bleed`** is `columns - referenceWidth / cellSize`. `0` fits the box exactly; negative is
  a narrower grid, centred. Under `sizing: "fluid"` only `cellSize`'s ratio to the box is visible,
  so the density control there is `columns`.
- **`ResponsiveRule`** widths are the render box's, in CSS px, never the viewport's. Both bounds are
  inclusive. Every matching rule applies in array order and a later rule wins field by field.
- **`TilesetFile.responsive`** absent means one shape at every width. Rules change shape only,
  never `tiles` or `operations`.

### Invariants

- **The attribute set is closed.** Adding one is a schema change, not a registration. `scale`
  arrived that way and took `schemaVersion` to 2; `translateX` / `translateY` arrived in 0.8.0 and
  took it to 4.
- **`TileState` is plain serializable data**: no DOM nodes, no asset references, no functions.
- **`assetId` is written only by asset resolution.** No Operation can target it.
- **`TilesetConfig` contains no pixel measurement at any depth.** The engine boundary is a property
  of this shape, not of the caller's discipline; that is why `generate()` takes `config` and a
  whole `TilesetFile` is a type error there.
- **`Grid` is row-major** because that matches the renderer's paint order. Storage order does not
  constrain evaluation order.
- **`Extent` may lie outside the grid**, because a `rect` may, and clamping it would resize the
  author's rectangle and shift a gradient's midpoint.
- **`schemaVersion` is the literal `4`.** Absent or unknown is a load failure. `migrate()` lifts 2
  and 3 forward with nothing to rewrite (as the field comment states).

### Callers / callees

`types.ts` imports nothing. Inside the package, `grep` finds type imports from it in `assets.ts`,
`attributes.ts`, `ctx.ts`, `generate.ts`, `index.ts`, `load.ts`, `mapping.ts`,
`registry/blends.ts`, `registry/selections.ts`, `responsive.ts`, `selection.ts`, `shape.ts`,
`validate.ts`, and in `render/`: `Tileset.svelte`, `TileDecoration.svelte`, `breakpoints.ts`,
`geometry.ts`, `occlusion.ts`, `options.ts`, `uniform.ts`. The apps reach these types through the
package entry: 30 non-test files in `apps/editor/src` and `apps/demo/src` import from
`@fndvit/gen-tilesets`.

`tileStateAt` has no non-test caller in the three source trees. It is used by
`generate.test.ts`, `selection.test.ts` and `shape.test.ts`.

### Tests

No test file of its own. The shapes are exercised through every engine test; `tileStateAt` is used
as a reader in `generate.test.ts`, `selection.test.ts` and `shape.test.ts`, but its out-of-range
branch is not asserted anywhere that was found.

### Gotchas & rejected alternatives

- **Translate is in cells, not design px.** A pixel value would make the renderer read `cellSize`
  to interpret an attribute, and its meaning would change whenever a responsive rule changed
  `cellSize`. The engine never sees a pixel.
- **Opposite signs on purpose.** A positive `Layout.yOffset` shifts the whole grid *up*; a positive
  `translateY` moves one tile *down*. The names differ so they are not confused.
- **`Grid` is plain data, not a class**, because the engine's output must be serializable. Read it
  with `tileStateAt`.
- **`Selection` and `Source` parameters are spread siblings of `type`.** The registry knows the
  keys, so `type` is reserved in the parameter namespace.
- **`Mapping` has no tag.** Its shape is discriminated by the Operation's `target`.
- **`Shape` spans `config` and `layout`** because the engine reads `rows`/`columns` and the renderer
  reads the rest; an override never needs to know which.

### Review notes

- The out-of-range branch of `tileStateAt` (returns `undefined`, never wraps) has no direct test.
