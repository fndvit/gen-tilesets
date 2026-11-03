---
title: Decorations
description: One decoration style, placed as many small tile blocks as a page needs.
sidebar:
  order: 5
---

A page often wants more than one tileset: a couple of tailor-made ones, **plus** small tile blocks
scattered around them, such as a 2×2 in a corner, a stepped 3×4 beside a heading, or an L of three
cells under a photo. These blocks share one visual language and differ only in how many cells they
occupy.

They don't need a file each. Author one *decoration style* and place it as many times as you like:

```svelte
<script lang="ts">
  import { loadTilesetFile } from "@vit-foundation/gen-tilesets";
  import TileDecoration from "@vit-foundation/gen-tilesets/TileDecoration.svelte";
  import { prefixedProvider } from "@vit-foundation/gen-tilesets/render";

  const provider = prefixedProvider(import.meta.env.BASE_URL);
  const style = loadTilesetFile(raw);
</script>

<TileDecoration {style} rows={3} columns={2} cellSize={44} options={{ provider, seed: "board-tl" }} />
<TileDecoration {style} rows={2} columns={4} cellSize={44} options={{ provider, seed: "board-br" }} />
```

Without Svelte, use `TileDecorationRenderer` the same way:
`new TileDecorationRenderer(element, { style, rows, columns, cellSize, options })`.

Each placement declares `rows`, `columns` and `cellSize`, and shares the style's `tiles`,
`operations` and assets by reference. The `rows`, `columns` and `layout` in the style file itself
are placeholders that every placement overrides.

**`options.seed` is what makes two decorations of the same size differ.** Give each spot its own
seed string. Two spots with the same size and the same seed show the same picture.

## A style must be reusable at any size

- **No `rect` and no `cellList` Selection.** Both hold literal cell coordinates, which mean nothing
  in a 3×2 spot. `reshapeErrors(style, { rows, columns })` returns one message per offending
  Operation, and `<TileDecoration>` throws on any of them **in a development build**. Use `all`,
  `checkerboard`, `everyNth` and `random` instead.
- **Put a `{ tileId: null }` entry in a palette.** It clears the cell, and that gives each spot its
  own silhouette, generated from the seed instead of painted by hand. A style without one draws a
  solid block, which is also a legitimate decoration.
- **`gradient` renormalises per decoration.** It takes its range from the Selection's extent, which
  under `selection: { type: "all" }` is the whole grid. A ramp authored across 40 columns becomes a
  3-step ramp in a 3-column spot. That is sometimes what you want, but know it happens. `valueNoise`
  does *not* renormalise: its feature size in cells stays the same, so a decoration keeps the grain
  of the tileset it was designed next to.

## Exact by construction

A decoration has no bleed and no vertical offset: its width is exactly `columns × cellSize`. At an
integer device pixel ratio, cells land on whole pixels at scale 1, with nothing to resample.

The box sizes itself to `columns × cellSize` px with `max-width: 100%`, so a decoration wider than a
phone shrinks instead of opening a horizontal scrollbar. The tiles just come out smaller. To keep the
tile size and crop instead, give it a rule that switches to fixed sizing just below its own width:

```svelte
<TileDecoration {style} rows={3} columns={6} cellSize={44}
  options={{ provider, responsive: [{ maxWidth: 6 * 44 - 0.01, sizing: "fixed", align: { x: "left" } }] }} />
```

The style's own `responsive` rules, if it has any, are dropped, because they were written for its
shape, not for this placement.

## Owning the box yourself

`reshape(style, { rows, columns, cellSize, bleed: 0, yOffset: 0 })` gives you the derived
`TilesetFile` to pass to a plain `<Tileset>`. `<TileDecoration>` is exactly that plus a box. What it
saves you is keeping `referenceWidth` and the box width in agreement: if they disagree, a bleed
appears without any error.
