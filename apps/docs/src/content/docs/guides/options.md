---
title: Options
description: Every rendering setting, the canvas and DOM substrates, fixed sizing, and sizing with CSS.
sidebar:
  order: 2
---

Every setting is a field of one object, `options: TilesetOptions`, exported from
`@vit-foundation/gen-tilesets/render` with a doc comment on every field. `file` is the data. Every
other setting is a field of `options`. The same object goes to `<Tileset options={…}>` and to
`new TilesetRenderer(el, { file, options })`.

| Field | Type | Default | When it matters |
| --- | --- | --- | --- |
| `seed` | `string` | `file.config.defaultSeed` | A different picture for a second placement of one file. |
| `loadSalt` | `number` | `0` | A new picture on each load. Draw it once per session, in a `load` function. |
| `substrate` | `"canvas" \| "dom"` | `"canvas"` | `"dom"` for SSR-complete HTML or per-cell hit-testing. |
| `overflow` | `"hidden" \| "visible"` | `"hidden"` | `substrate: "dom"` only. `"visible"` stops the box clipping, so a tile moved or scaled past the edge shows whole. Put `overflow: hidden` on an ancestor to clip where you want. An error with `"canvas"`. |
| `sizing` | `"fluid" \| "fixed"` | `"fluid"` | `"fixed"` keeps cells at `layout.cellSize` CSS px and crops instead of scaling. |
| `align.x` | `"left" \| "center" \| "right"` | `"center"` | Under `"fixed"`: which side is cropped. No effect under `"fluid"`. |
| `align.y` | `"top" \| "center" \| "bottom"` | `"top"` | When the host gives the tileset its own height: which rows are cropped. |
| `avoid.targets` | selector, element, or elements | off | Hide every tile that overlaps these. See [Hosting over content](/guides/hosting-over-content/). |
| `avoid.padding` | `number` (CSS px) | `0` | Clearance around each target. |
| `responsive` | `HostRule[]` | the file's own rules | Shape overrides by box width, **replacing** the file's rules. `[]` turns them off. See [One design, many shapes](/guides/responsive/). |
| `provider` | `AssetProvider` | `defaultProvider` | Anywhere but the site root: `prefixedProvider(base)`. Create it once, not inline. |
| `onAssetError` | `(ref, cause) => void` | none | The only report of a missing image. |

```svelte
<Tileset {file} />                                                   <!-- every default -->
<Tileset {file} options={{ provider, substrate: "dom" }} />
<Tileset {file} options={{ sizing: "fixed", align: { x: "left", y: "bottom" } }} />
```

`undefined` means the same as absent in every field, so a wrapper can pass its own optional values
through without spreading. In a development build, the options object is checked, and an unknown
field or value throws with a message naming the valid ones. The check is compiled out of production
builds.

## Canvas or DOM

Both substrates compute the same square cell, quantised to whole device pixels. A cell is square by
construction, and neighbours share an edge, so a gap between them can't occur. The substrates differ
only in where the leftover fraction of a pixel goes.

| `substrate` | Leftover goes to | Choose it for |
| --- | --- | --- |
| `"canvas"` (default) | one even resample of one bitmap | **Appearance.** Exact quarter turns, no gaps at any cell size, and no seam that page CSS can reopen. |
| `"dom"` | the box: the grid overhangs a little and the outer columns are clipped | **Interactivity and SSR.** The tiles are in the server HTML, and each cell can be hit-tested. |

**Choose `"canvas"`** unless you need something it can't do. It is one element with no per-cell
nodes. Its cost: during SSR it emits an empty box of the right ratio and fills it after mount.

**Choose `"dom"`** for tiles in the server-rendered HTML, or to hit-test cells. Each `.cell` carries
`data-x`/`data-y`, and the browser hits it where it is *drawn* (moved, scaled and turned), not on its
home square. Animate the `<img>` inside a cell, never `.cell` itself, or the hit area moves under the
pointer. Sideways, the grid always slightly overhangs its box and the outer columns are cut.
Vertically, the box takes its height from the grid, so the bottom row is never cut. As a result the
box can be up to `rows` device pixels taller than its natural height.

## Fixed cells, cropped

`sizing: "fixed"` keeps every cell at `layout.cellSize` CSS px and lets the box crop the grid, where
`"fluid"` scales the whole picture with the box. `align.x` chooses the crop: `"left"` keeps the
design's left edge and cuts from the right, `"right"` does the reverse, and `"center"` cuts both
sides. Columns are never added, so **author the grid for the widest box it will be shown in**. In a
wider box, the page background shows beside it. The box's height is constant, and it is reserved
exactly in the server HTML.

Cells outside the box are skipped: they are not mounted under `"dom"` and not drawn under
`"canvas"`. A 76-column grid on a phone costs only as much as its few visible columns.

## Sizing with CSS

Under fluid sizing, **CSS on the tileset's container controls its size completely**. The box is
`width: 100%` of its parent and is measured with a `ResizeObserver`. Nothing reads the viewport.
`width`, `min-width`, `max-width`, `clamp()`, a flex basis and `flex-shrink: 0` on the parent all
work. For example, "fluid down to 800px, then stop shrinking and crop both sides":

```css
.hero      { overflow: hidden; display: flex; justify-content: center; }
.hero-slot { flex: none; width: max(100%, 800px); } /* the tileset's parent */
```

Style a wrapper you own, not the tileset's box, which the package styles itself. CSS controls the
**box**, and a fluid cell is always the same fraction of it. CSS can't change the number of rows or
columns, or switch to fixed-pixel cells. Those are shape overrides and `sizing`.

## Overriding the styles

To override a rule from `tileset.css`, match or beat its selector, for example
`.cell[data-tileset-cell] img`. A rule of equal specificity wins if it comes later. The attributes
you can select on are listed on the [DOM hooks](/renderer/dom-hooks/) page.
