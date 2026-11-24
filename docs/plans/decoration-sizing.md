# Decoration sizing (B-041, B-042)

Design record for how a decoration takes its size and how it behaves when the room it has changes.

- 2026-11-18: first design, agreed with Pol in discussion.
- 2026-11-23: open questions resolved and the editor designed.
- 2026-11-23: **simplified after a blank-slate review.** The review asked: if decorations did not
  exist yet, would we design all of this? The answer was no. The earlier version (global
  auto/manual mode, 8 anchors, `min*`, a `shrink` flag, a `breakpoints` array, overflow past the
  box, falloff) is in git at `a96b566` (the 2026-11-18 version; the 2026-11-23 resolutions were
  never committed). §9 says what was dropped or deferred, and why, and keeps the falloff design.

**Nothing here is built.** A build plan comes after Pol reviews this document.

## 1. The problem

A decoration is a small block of tiles in a page margin, drawn from a shared style
(`apps/docs/src/content/docs/guides/decorations.md`). Today the host gives it `rows`, `columns`
and `cellSize`. `decorationBox` (`packages/tileset/src/render/decoration.ts:118`) fixes the box at
`columns × cellSize` px, and `tileset.css` adds `max-width: 100%` so a box wider than its parent
shrinks instead of making the page scroll sideways.

First use (2026-11-16) found three problems:

- **B-041: it cannot adapt to the page.** `options.responsive` rules reach a decoration, but they
  key on the render box's width (`render/options.ts:162`) and cannot change the box itself. "Use
  2 columns on a phone" cannot be written. The only adaptation is the shrink.
- **B-042(a): it collapsed to zero width inside an absolutely positioned parent**, although the
  box carries a width. **Not reproduced yet.** The suspect is the mixed rule "N px wide, but never
  wider than 100% of you": a parent that sizes itself to its child gets a circular question back.
- **B-042(b): the shrink is silent.** Tiles draw smaller than the declared `cellSize` and nothing
  says so.

The underlying issue is that the box is half "I decide my size" and half "you decide my size".

**Build step 0 is reproducing B-042(a)** in `apps/demo`. If it turns out to be a one-line CSS
interaction, that is recorded, and this design stands on B-041 alone.

## 2. Design principle

**CSS owns the area. The package owns whole tiles.**

A host page already has a complete system for deciding how big things are: containers, insets,
`@media`, `@container`, custom properties. A decoration should take its area from that system and
add only what CSS cannot do: fit whole tiles into the area, and keep the picture stable while the
area changes.

Every feature below was measured against one question: *does CSS already do this?* If it does,
the package does not offer a second way.

## 3. Invariants

These hold in every case.

- **Whole tiles only.** No tile is ever cut, by the box or by the screen edge. When there is less
  room than the full picture, whole tiles are hidden; a part of a tile is never shown. Space left
  over that is smaller than one tile stays empty, on the side away from the anchor.
- **One tile size.** All cells in a decoration are the same size. Nothing scales the tiles down to
  fit; the tile size changes only when `cellSize` changes (§4).
- **Never draws outside its box.** The box is what the host laid out, and the tiles stay inside
  it. So the layout never moves, and there is no sideways scrollbar to prevent.
- **Window, no reshuffle.** Each spot is generated once, at its largest size, and shows a window of
  that picture. Resizing reveals or hides whole tiles at the side away from the anchor; tiles
  already visible never change.
  - Tile choice is positional (`hash.ts`). Only two pieces of the engine depend on grid size:
    - `gradient`, which normalises over the extent (`registry/sources.ts:242`);
    - `everyNth`, which counts over `ctx.columns` (`registry/selections.ts:217`).
  - Generating at the max size makes both stable. Their pattern no longer depends on the
    *current* size, because the picture is always the max-size one. Today they depend on each
    spot's size (decorations guide, "A style must be reusable at any size").

## 4. The model

Four settings, plus the existing `avoid`.

| Setting | Values | Meaning |
|---|---|---|
| `columns`, `rows` | a number, or `"fill"` | **Per axis.** A number is an intrinsic size: the box is `n × cellSize` on that axis. `"fill"` means the container gives the size and the decoration shows as many whole tiles as fit. |
| `maxColumns`, `maxRows` | a number | **Required on a fill axis.** The size of the generated picture on that axis, and the most tiles it can show. On an intrinsic axis it is the count itself. |
| `anchor` | `"top-left"` (default), `"top-right"`, `"bottom-left"`, `"bottom-right"` | The corner the decoration is pinned to. It grows away from both sides of that corner; leftover space (less than one tile) goes to the far sides. |
| `cellSize` | px, or read from `--tile-size` | The tile size. See below. |
| `options.avoid` | `{ targets, padding }` (`render/options.ts:154`), unchanged | Clears tiles under the target elements. Because of the window, cleared tiles leave holes and nothing reshuffles. |

The common case, a margin band, is a fill width and a fixed number of rows:

```svelte
<TileDecoration {style} columns="fill" rows={2} maxColumns={12} anchor="top-right"
  options={{ provider, seed: "hero" }} />
```

Today's call, `rows={3} columns={2} cellSize={44}`, keeps working and means what it means now:
both axes intrinsic.

### The tile size comes from CSS

`cellSize` is either a number of px or, when it is not given, the value of the `--tile-size`
custom property on the decoration's container, read when the renderer measures. So the host
changes the tile size with its own queries:

```css
.hero-deco { --tile-size: 44px; }
@media (max-width: 600px) { .hero-deco { --tile-size: 32px; } }
/* or @container, keyed on whatever container the host likes */
```

**Why this does not loop.** The earlier design keyed a `breakpoints` array on the viewport,
because a tile size keyed on the box would loop: on an intrinsic axis the box is
`columns × cellSize`, so changing `cellSize` changes what was measured. A custom property set by
the host's queries is decided outside the decoration, by conditions the decoration cannot change
(the viewport, or a container that the host sizes). If a host writes a container query on a
container that is itself sized by the decoration's intrinsic width, it has made a CSS cycle, and
CSS containment rules already forbid a size container from taking its size from its children.

**Why not a package `breakpoints` array.** It would be a second responsive system beside the
host's own, with its own syntax, beside `options.responsive` as well. A custom property uses the
one the host already has.

### Order of resolution

1. **Tile size:** the `cellSize` prop, otherwise `--tile-size`, otherwise the file default (§6).
2. **Count per axis:** an intrinsic axis takes its number. A fill axis takes
   `min(floor(container / cellSize), max)`.
3. **Window:** show the tiles of the max-size picture that fit, counted from the anchor; hide the
   rest, whole.
4. **Avoid:** clear tiles under the `avoid` targets (`occlusionMask`, `render/occlusion.ts:150`).

A fill axis with less room than one tile shows zero tiles on that axis. That is not an error: the
host made the room that small.

## 5. The box contract

Per axis:

- **Fill: "you give me a size".** The decoration has no intrinsic size on that axis and fills its
  element. The host sizes the element with any positioning, including absolute with insets
  (`position: absolute; top: 0; right: 0; bottom: 0; width: 20%`).
- **Intrinsic: "I have my own size"**, `n × cellSize`, with any positioning, including a
  shrink-to-fit absolute box.

Because the contract is per axis, the common placement just works: in an ordinary block-level
`div`, a fill width takes the div's width and an intrinsic height of `rows × cellSize` gives the
div its height. The earlier design filled both axes by default and failed in exactly this
placement.

- **A fill axis that measures zero is a development error** naming the fix: "give the container
  a size on this axis (insets, width, height), or give `columns`/`rows` a number". This is
  B-042(a) made loud: an absolute box with an auto size asks its child how big it is, and a fill
  axis has no answer.
- **In a production build** the same case draws nothing on that axis and the box keeps the size
  the host gave it. It does not throw. This is the package's usual arrangement: development-loud,
  production-trusting (`decoration.ts`, `reshapeDecoration`).
- **An intrinsic axis wider than its parent** keeps `max-width: 100%`, so the page never scrolls
  sideways. But instead of scaling the tiles down, the box shows fewer tiles, each one
  whole; the ones furthest from the anchor are hidden, exactly like a fill axis. This replaces the silent shrink of B-042(b):
  the tiles keep their declared size, and the host who wants smaller tiles on a phone sets
  `--tile-size`.

## 6. Where the settings live

A file is one style, used by many decorations that the host places differently. The designer
knows the size the style was drawn for, so the file holds a few **defaults** in an optional
`decoration` block:

- `cellSize`
- `maxColumns`, `maxRows`
- `anchor`

`columns`/`rows` (fill or a number) are not in the file: whether an axis fills depends on where
the host puts the decoration, which the designer cannot know.

Order: `<TileDecoration>` props > `--tile-size` (for the tile size only) > file defaults >
built-in defaults. The block is optional, so this needs a schema version bump but `migrate()` only
bumps the version.

**Copy code** in the editor writes `style`, `seed`, `columns`/`rows`, and only the fields that
differ from the file. A prop overrides the file, so a call site that repeated every default would
stop following later edits to the file.

## 7. Cost of the window

- It costs one `generate()` per (style, seed, max size), and resizing never regenerates. That is
  cheaper than today, where `GridCache` (`render/breakpoints.ts:42`) generates once per new shape.
- `generate()` is `O(rows × columns × operations)`. The only measurement is a loose test (40×40,
  2 operations, under 500 ms).
- So `max*` is **required** on a fill axis. The build adds a benchmark (e.g. 64×64 with a heavy
  style) and a per-axis cap on `max*` set from it.
- Changing `cellSize` does not regenerate either: the picture is in cells, and only the window and
  the drawing change.

## 8. Editor

Files: `preview/PreviewTopBar.svelte`, `preview/DecorationPreview.svelte`,
`preview/decorations.ts`.

- **Gallery: uses the window.** It still shows the 7 shapes, but each one is a window of one
  max-size picture, as a host would see it. Without this the Gallery would renormalise `gradient`
  and `everyNth` per shape, and the same style would look different in the Gallery and in
  Placement.
- **Custom becomes Placement.** A **strip under the top bar**, shown only in the Placement view.
  - Columns: `Fill | Count` (`Toggle`), and a `NumericInput` for the count or the max.
  - Rows: the same.
  - A 4-corner anchor picker.
  - Sample text (`Checkbox`).
  - Copy code (§6).
  - The max fields and the anchor edit the file's `decoration` defaults through `session.apply`,
    so edits can be undone. Fill or Count is a placement choice, not a file default, so it stays
    view state (`view.svelte.ts`).
- **A container you can resize** on both axes, with handles taken from `PreviewFrame.svelte`.
  It has a dashed outline and a readout: "312 × 180 px → 7 × 2 tiles (max 12 × 2)".
- **Sample text:** a paragraph you can switch on. It is the `avoid` target, so the edge that
  `avoid` makes by clearing whole tiles around the text is visible.
- **The zero-size error** (§5) shows as a `Notice`.
- Cell px, Reroll and Grid are unchanged. Cell px stands in for `--tile-size`.

```
 Page|Decorations   Gallery|Placement   Cell 24|44|64|96   ↻ Reroll   Grid ●
 ─────────────────────────────────────────────────────────────────────────────
 Columns Fill|Count  max [12]   Anchor ┌─┬─┐   ☑ Sample text   ⧉ Copy code
 Rows    Fill|Count  [2]               └─┴─┘
 ─────────────────────────────────────────────────────────────────────────────
     ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
     ╎ ■ ■ ■ ■ ■ ■ ■               ╎◂▸   container 312 × 88 px
     ╎ ■ ■ ■   ■ ■                 ╎     → 7 × 2 tiles (max 12 × 2)
     └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘◢
```

## 9. What this replaces, rejected and deferred

### Replaced

- **B-041(a), per-placement rules that change `rows`/`columns`/`cellSize`:** dropped. A fill axis
  plus `--tile-size` covers it, using the page's own layout and queries.
- **B-041(b), fill mode:** this is the fill axis, made per axis and given an anchor and a window.
- **B-042(b), a warning when the shrink draws tiles smaller than declared:** replaced. Nothing
  shrinks any more: an intrinsic axis that does not fit shows fewer whole tiles (§5).
- **B-042(a):** reproduced first (§1), then checked that the new contract cannot reach it.

### Rejected

- **A global auto/manual mode.** Auto filled both axes, so it failed in a plain block `div`, the
  most common placement, and its default `shrink` differed from manual's. Per axis, one setting
  (`columns: "fill"`) does the same work and fails nowhere common.
- **A package `breakpoints` array.** A second responsive system beside the host's CSS and beside
  `options.responsive`. `--tile-size` reaches the host's own `@media` and `@container` (§4).
- **`minColumns` / `minRows`.** They only mattered as the threshold for shrink or overflow. With
  neither, below the max the decoration shows fewer tiles, down to zero.
- **A `shrink` flag.** It broke "one tile size" and existed mostly to keep today's behaviour. The
  tile size now changes only by `cellSize`, which the host controls by CSS. Today's
  `max-width: 100%` stays, but it hides whole tiles instead of scaling them (§5).
- **Overflow past the box, with the screen edge as an avoid target.** The aim, tiles spilling
  into the content and cleared around the text, is real, but CSS already expresses it: the host makes
  the **container** overlap the text (positioned, behind it, `pointer-events: none` if needed),
  and the window plus `avoid` clears whole tiles around the words. Drawing outside the box would need
  a screen-edge rule, a layout rule and a warning, and its default combination covered content on
  a phone.
- **Hide on overflow.** Never needed: nothing overflows.
- **Letting a tile be cut at an edge, so the decoration runs off the page.** Whole tiles only.
- **Breakpoints keyed on the box's own width.** They loop (§4).
- **Placement only as host props.** The file holds the style's defaults (§6).

### Deferred

Each is independent of the sizing fix and can be built on top of it later without changing it.

- **Edge anchors** (`"top"`, `"right"`, `"bottom"`, `"left"`): pinned on one axis and centred on
  the other. On the centred axis they must grow in steps of 2 cells (growing by 1 would shift the
  centre by half a tile and move every visible tile), and an odd max then needs explaining in the
  readout. No host has asked for one yet. Add when one does.
- **Floating** (the centre, growing in every direction). Same reason.
- **Falloff by distance from the anchor.** Probably the most valuable *visual* addition (dense at
  the corner, sparse outward), but it is an engine change, not sizing. Tracked as its own backlog
  item (B-046). The agreed design, kept here so it is not lost:
  - A mode of the `gradient` Source, not a renderer-side list of kinds and not a separate
    `distance` Source. It is an ordinary Operation, so any Target can fall off: `scale`,
    `opacity`, `rotation`, or density (a palette with a `null` entry).
  - `gradient` gains `from: "angle" | "anchor"`, default `"angle"` (today's output unchanged, no
    migration). `"anchor"` returns `min(d / reach, 1)`, where `d` is the distance in whole cells
    from the anchor and `reach` is an integer. Rounded bands from a corner (Euclidean is the
    working assumption), straight from an edge. `angle` is ignored in this mode.
  - Distance is in whole cells, never a fraction of the current size, so falloff respects the
    window. The same choice `valueNoise` makes.
  - `EvalCtx` gains `anchor`, set by the decoration's reshape like `rows` and `columns`; a page
    tileset's anchor is `"top-left"`. This widens O4 (`ctx.ts:1-28`) and passes the test `extent`
    passed: pure config, never a measurement. The anchor comes from the placement, so one style
    mirrors its falloff between a top-left and a top-right spot.
  - Editor: a `From: Angle | Anchor` switch on the Gradient card; in Anchor mode the angle slider
    becomes `Reach (cells)`, with its own pattern icon.
  - To check while building: how validation treats a param that only applies in one mode.
  - Until then, the window alone already makes an angle gradient stable across sizes.

## 10. Open questions for the build plan

1. **B-042(a):** reproduce it (§1).
2. **Reading `--tile-size`:** from the container's computed style at measure time. A custom
   property change does not fire `ResizeObserver`, so a query that changes only `--tile-size`
   needs another trigger. Options: re-read on every measure plus a `matchMedia`/resize listener,
   or require the host to call `update()`. To settle with a prototype.
3. **The Gallery window** (§8): a small change in `preview/decorations.ts`, but it changes what the
   Gallery shows for styles that use `gradient` or `everyNth`.
4. **`options.responsive` on a decoration:** today a style's own rules are dropped and the host's
   are applied. With fill axes and `--tile-size`, is there anything left that a decoration needs
   them for? If not, ignore them on decorations and say so in the guide.
