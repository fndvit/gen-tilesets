---
title: One design, many shapes
description: Reuse a design at another size with reshape, and change its shape by width with responsive rules.
sidebar:
  order: 4
---

A tileset is two things, and the package keeps them apart:

- **The design**: `tiles`, `operations`, `defaultSeed` and the salts. *What* is drawn. It is shared
  and never overridden.
- **The shape**: `rows`, `columns`, `cellSize`, `bleed` and `yOffset`. *How many cells, and how big.*
  It can be overridden without a second file.

| You want | Use | New file? |
| --- | --- | --- |
| A one-off tileset | a `TilesetFile` in `<Tileset>` | — |
| The same design at another fixed size, in another place (the hero as a 3-row banner on another page) | `reshape(file, { rows: 3 })` | no |
| One placement whose shape changes with its box's width (the hero gets 14 rows on a phone) | `responsive` rules, in the file or in `options` | no |
| Small blocks in margins that keep one tile size | `<TileDecoration>`. See [Decorations](/guides/decorations/). | no |
| Different tiles or Operations on a phone | a second file, swapped by the host | **yes** |

**These are one mechanism.** `reshape` applies an override where you place the tileset. A responsive
rule is an override with a width condition, which the renderer applies itself. `<TileDecoration>`
is `reshape` with `bleed: 0, yOffset: 0`, plus a box. They combine: you can reshape a file into a
banner, then give the banner rules of its own.

## The shape fields

| Field | Means | Note |
| --- | --- | --- |
| `rows`, `columns` | the grid | Fixed by a coordinate-bound Operation (one with a `rect` or `cellList` layer). See below. |
| `cellSize` | design px per cell | CSS px under `sizing: "fixed"`. **Under `"fluid"` it changes nothing on its own.** See below. |
| `bleed` | columns that overhang the box, in cells | If absent, the base's bleed is kept, in cells. `0` fits the grid to its box exactly. |
| `yOffset` | fraction of a cell, `[0, 1)` | Shifts the grid up, clipping the top of row 0. |

An override never names `referenceWidth`, which is derived as `(columns − bleed) × cellSize`. Every
field you don't name keeps the base's value.

**Under fluid sizing, `columns` sets the density.** A fluid cell is
`box width × cellSize / referenceWidth`, and `reshape` keeps the bleed in cells, so changing
`cellSize` alone cancels out. A development build warns about a rule that does only that.

## Reuse at another size

```ts
import { loadTilesetFile, reshape } from "@vit-foundation/gen-tilesets";

const hero = loadTilesetFile(raw);
const banner = reshape(hero, { rows: 3 });              // same design, three rows
const strip = reshape(hero, { rows: 2, columns: 40 });  // wider and shorter, same bleed in cells
```

```svelte
<Tileset file={banner} options={{ provider }} />
```

`reshape` is pure, and the result shares `tiles` and `operations` with the original by reference.
It **drops the file's own `responsive` rules**, because they were written for the shape being
replaced. Pass `options.responsive` for rules of the banner's own. `reshapeErrors(file, override)`
is the matching check and returns one message per problem. The renderer runs it in a development
build.

A cell present in both grids keeps its tile: randomness is addressed by `(x, y)`, so a bigger grid
extends the picture and a smaller one trims it instead of reshuffling it. **The exception is
`gradient`**, which spans whatever grid it is in, so a ramp across 25 columns becomes a ramp across
9. `valueNoise` keeps its grain in cells, so its features scale with `cellSize`.

## Responsive rules

A rule is a width condition plus the shape fields it changes:

```json
{
  "schemaVersion": 6,
  "config": { "rows": 8, "columns": 25, "…": "…" },
  "layout": { "cellSize": 60, "referenceWidth": 1440, "yOffset": 0, "horizontalAlignment": "column" },
  "responsive": [
    { "maxWidth": 900, "columns": 15 },
    { "maxWidth": 500, "columns": 9, "rows": 14 }
  ]
}
```

- **The width is the tileset's box, in CSS px**, not the viewport's. A tileset in a sidebar
  responds to the sidebar.
- **Bounds are inclusive**, as in CSS `(max-width: 500px)`.
- **Every matching rule applies, in order, and a later rule wins field by field**, as in the CSS
  cascade. At 400px above, both rules match: 9 × 14. At 700px only the first does: 15 columns, and
  the base's 8 rows. Above 900px, the base applies.
- **A rule changes the shape, never the design.** If a phone needs different tiles or Operations,
  use a second file.

Designers put rules **in the file**: the editor has a Breakpoints section, and dragging its preview
handle shows each rule taking over. A host can pass its own rules **in code**:

```svelte
<!-- Replaces the file's rules. A host rule may also set sizing and align. -->
<Tileset {file} options={{ responsive: [{ maxWidth: 600, sizing: "fixed", cellSize: 44, align: { x: "left" } }] }} />

<!-- The file's rules plus one more. -->
<Tileset {file} options={{ responsive: [...(file.responsive ?? []), { maxWidth: 360, rows: 16 }] }} />

<!-- No rules at all. -->
<Tileset {file} options={{ responsive: [] }} />
```

Precedence, in one line: **`options.responsive` if given, else the file's rules, else none**. A
reshaped file has no rules of its own.

### What a breakpoint costs

Inside a band, nothing: the picture just scales. Crossing into a band that changes only `cellSize`,
`bleed`, `yOffset`, `sizing` or `align` recomputes the geometry and nothing else. Crossing into one
that changes `rows` or `columns` generates that grid once. Each shape is cached, so dragging a
window back and forth regenerates nothing after the first pass. Under `"dom"`, cells present on both
sides keep their elements.

### Before measurement

In the server HTML and the first client frame, the box already reserves the height of the rule that
will apply, using a container query, so a page loaded on a phone doesn't jump. The tiles appear once
the box is measured. This needs a wrapper with `container-type: inline-size`, which the renderer
adds **only when there are rules**. It has one requirement: **the tileset's parent needs a definite
width** (a block, or a flex or grid item with a set basis). In a shrink-to-fit context, such as an
inline-block or a flex item with an auto basis, inline-size containment collapses it to nothing.

If a breakpoint that changes `rows` keeps flipping back and forth on its own, the extra rows are
adding a page scrollbar, which narrows the box back across the bound. A development build reports
it. `scrollbar-gutter: stable` on the page root fixes it.

## Which Operations survive a shape change

**An Operation that picks cells by hand fixes the grid's `rows` and `columns`.** `rect` and
`cellList` hold literal cell coordinates, which mean something only in the grid they were drawn in.
The rest of the shape can still change: `cellSize`, `bleed` and `yOffset` move no cell, so a file
with a `rect` can still take them. `all`, `checkerboard`, `everyNth`, `rowColumn` and `random` are
rules, and they hold at any size. An Operation's `selection` is a list of layers, and the
Operation is coordinate-bound if **any** of its layers is: a `random` layer beside a `rect` layer
still fixes the grid. `everyNth` holds but *looks* different at another column count:
it counts cells row after row, so with N = 3, 10 columns give diagonals and 9 give vertical stripes.

This is checked everywhere it can go wrong:

- `validate()` rejects a file with a rule that sets `rows` or `columns` while the stack has a
  coordinate-bound Operation (`COORDINATE_BOUND_RESIZE`, reported at the rule's field, naming the
  Operation).
- `reshapeErrors` and `rulesReshapeErrors` do the same for `reshape` and host rules. The renderer
  throws on them in a development build.
- The editor disables changes that would break it, and says why.

## Common mistakes

- **A rule with `rows` or `columns` in a file with a `rect`.** It is refused. Use `cellSize` or
  `bleed`, or rebuild the gap from procedural Selections.
- **A fluid rule that changes only `cellSize`.** Nothing happens. Change `columns`, or make the rule
  `sizing: "fixed"` (host rules only).
- **Expecting a rule to change tiles or Operations.** Rules change the shape only. That needs a
  second file.
- **A responsive tileset in a shrink-to-fit parent.** It collapses. Give the parent a width.
- **Writing `referenceWidth` in an override.** It isn't a field. Use `bleed`.
