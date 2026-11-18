# Decoration sizing (B-041, B-042)

Design record for how a decoration takes its size and how it behaves when the room it has changes.
Agreed with Pol on 2026-11-18, in discussion. **Nothing here is built.** This is the analysis that
B-041 asked for before building. A build plan comes after Pol reviews this document.

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
  box carries a width. Not reproduced yet. The suspect is the mixed rule "N px wide, but never wider
  than 100% of you": a parent that sizes itself to its child gets a circular question back.
- **B-042(b): the shrink is silent.** Tiles draw smaller than the declared `cellSize` and nothing
  says so.

The underlying issue is that the box is half "I decide my size" and half "you decide my size".

## 2. Invariants

These hold in every combination of the settings below.

- **Whole tiles only.** No tile is ever cut, by the box or by the screen edge.
- **One tile size.** All tiles in a decoration are the same size. Only `shrink` bends this, and
  only when the author turns it on.
- **Window, no reshuffle.** Each spot is generated once, at its largest size, and shows a window of
  that picture. Resizing reveals or hides whole tiles at the side away from the anchor; tiles
  already visible never change. A consequence: `gradient`'s range and `everyNth`'s pattern, which
  today depend on each spot's size (decorations guide, "A style must be reusable at any size"),
  stop depending on the *current* size, because the picture is always the max-size one.

## 3. Anchor and falloff

Two separate things. An earlier draft merged them, and Pol pulled them apart.

**Anchor: where the decoration is pinned and which way it grows.**

- An **edge** or a **corner** (`"top-right"`, `"left"`, …). It grows away from that side. Leftover
  space (less than one tile) and overflow go to the far side.
- **Floating** (centre). It grows outwards in every direction. It grows in steps of 2 cells per
  axis: growing by 1 would shift the centre by half a tile and move every visible tile, which
  breaks the window invariant.

**Falloff: an optional effect by distance from the anchor. Off by default.** A decoration may want
none. When on, it is one of a list of kinds, which can be extended:

- **Density:** fewer tiles are painted further from the anchor. Each cell's chance comes from its
  own position (positional hashing), so it is deterministic.
- **Stepped opacity:** bands of cells at decreasing opacity, e.g. 100% → 60% → 30%.

**Distance is counted in whole cells from the anchor, never as a fraction of the current size.** A
tile 3 cells out looks the same whether the decoration is 4 or 8 wide, so falloff respects the
window. This is the choice `valueNoise` already makes (its feature size stays fixed in cells) and
the opposite of `gradient` (which renormalises to the selection's extent).

## 4. Two independent axes

### Axis 1: placement (how big it is meant to be)

| | The author writes | Who decides the cell count |
|---|---|---|
| **auto** (default) | anchor, `minColumns`/`maxColumns` (and rows) | The space: as many whole tiles as fit, clamped to min and max. The max is also the size of the generated picture. |
| **manual** | `rows`, `columns` | The author, exactly, as today. This keeps one-off shapes possible: a 2×2 here, a 3×4 there. |

### Axis 2: resizing (what happens when the room changes)

Three tools. They are not exclusive and combine freely, e.g. *auto + no shrink + avoid + breakpoints*,
or *manual + shrink + breakpoints*.

- **`shrink`** (flag). Scale the whole decoration down, still in whole tiles. In manual mode it
  defaults to **on**, which keeps today's behaviour. In auto mode it only matters below the
  minimum, since above it auto shows fewer tiles instead.
- **`breakpoints`** (array). Width → tile size, e.g. 48 px, or 32 px below 600 px. They key on the
  decoration's **parent space or the viewport, never its own box**. The box's width is
  `columns × cellSize`, so a breakpoint that changed `cellSize` while measuring the box would loop.
  This is the main difference from today's `responsive` rules.
- **`avoid`**. The existing `options.avoid`, `{ targets, padding }` (`render/options.ts:154`).
  It clears tiles that sit under the target elements. Because of the window, cleared tiles leave
  holes and nothing reshuffles.

### Order of resolution

1. Breakpoints pick the tile size.
2. Placement picks the cell count.
3. If it does not fit: `shrink` if on, otherwise **overflow**.
4. `avoid` clears tiles, and the screen edge clears tiles that would be cut by it.

## 5. Overflow

When the decoration does not fit and `shrink` is off, it **overflows**. It is never hidden. Pol's
reasoning: overflow combined with `avoid` gives an organic edge, with tiles spilling into the
content and cut around the text instead of along a rectangle.

- It overflows **away from the anchor**, into the content, never outwards past the screen edge.
- **The screen edge is always an avoid target.** Tiles that would be cut by it are cleared. That
  keeps whole tiles and prevents a sideways scrollbar.
- **The overflow does not move the layout.** The space keeps its size in the page; the extra tiles
  draw on top, behind the content, and cannot be clicked (`pointer-events: none`).
- **Development warning:** overflow with `avoid` off, because it will cover whatever is next to it.
- **Development error:** an auto decoration whose space measures zero. That is the B-042(a) case,
  made loud instead of silent.

## 6. What this replaces, and what was rejected

- **B-041(a), per-placement rules that change `rows`/`columns`/`cellSize`:** dropped. Auto
  placement plus breakpoints covers it, using the page's own layout instead of a second set of
  breakpoints on each decoration.
- **B-041(b), fill mode:** this is auto placement, extended with anchor, window and falloff.
- **B-042(b), a warning when the shrink draws tiles smaller than declared:** replaced. Shrinking
  becomes an explicit flag, so it is no longer a surprise.
- **B-042(a):** still to be reproduced, but only to confirm that the new sizing rules cannot reach
  it.
- **Rejected: hide on overflow.** Hiding is safe, but it gives up the organic edge that overflow
  plus `avoid` makes.
- **Rejected: never shrink.** One tile size is the default, but shrinking stays available as an
  opt-in, and breakpoints are the preferred way to change size.
- **Rejected: letting a tile be cut at an edge, so the decoration runs off the page.** Whole tiles
  only.
- **Rejected: breakpoints keyed on the box's own width.** It loops (§4).

## 7. Open questions (for the build plan)

- **Density falloff: engine or renderer?** In the engine it is a palette weight by distance from
  the anchor, which needs the anchor in the config. In the renderer it is clearing cells. The
  determinism rules (CLAUDE.md) apply either way.
- **Opacity falloff.** `TileState` already carries `opacity` (`packages/tileset/src/types.ts:65`),
  so an engine-side Operation by distance is possible. Decide engine or renderer together with
  density.
- **Floating anchor.** Centre of the viewport or centre of its space? And what does overflow mean
  when it grows in every direction?
- **Cost of the window.** It generates at the max size. Check the cost for large max values.
- **Where the window lives.** Engine support (counting cells from the anchor), or the renderer
  drawing at max size and cropping, as the guide's `sizing: "fixed"` + `align` workaround already
  does?
- **Vertical filling:** deferred. Auto fills the width and the rows follow.
- **Defaults to confirm:** `shrink` on for manual; `shrink` in auto meaning "below the minimum,
  scale instead of overflow".
