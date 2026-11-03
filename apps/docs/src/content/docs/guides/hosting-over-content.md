---
title: Hosting over content
description: Keep tiles clear of the headings, text and buttons laid over a tileset, as the layout changes.
sidebar:
  order: 3
---

`options.avoid` uses the page's actual layout: the tileset measures the elements you name and hides
every tile that overlaps one of them. It hides whole tiles, and it keeps doing so as the elements
move.

```svelte
<section class="hero">
  <Tileset {file} options={{ provider, avoid: { targets: "h1, p, .cta", padding: 8 } }} />
  <div class="copy"><h1>…</h1><p>…</p><a class="cta">…</a></div>
</section>
```

- **`targets`** can be a selector, an element, or a list of elements. A selector is resolved inside
  the tileset's **parent element** (the section above), skipping any wrapper the package adds
  itself, such as `<TileDecoration>`'s box. It never matches the tileset's own cells. A list written
  inline is compared by content, so a re-render doesn't re-register anything.
- **`padding`** is plain clearance, in CSS px, around each target.
- **It follows the layout.** That covers the section or a target resizing, text rewrapping at any
  width or breakpoint, web fonts loading, elements being added or removed, `class` or `style`
  changes, and text edited in place. **It doesn't follow** a target moved by a CSS animation or
  transition, because that resizes and mutates nothing. Call `refresh()` from
  `@vit-foundation/gen-tilesets/render` when the animation ends.
- **Nothing is drawn over the page before the mask exists.** With `avoid` set, the tileset stays
  hidden until its first measurement, which under SSR means until hydration. Its space is still
  reserved, so nothing shifts when it appears.
- **The picture itself doesn't change.** The grid is generated exactly as it would be without
  `avoid`, and the mask is applied when painting. An uncovered cell shows the tile it always had,
  and the same `(file, seed, loadSalt)` still gives the same picture.
- **It works on both substrates.** Under `"dom"`, a hidden cell carries `data-masked` and
  `visibility: hidden`. Under `"canvas"`, it is skipped when painting. Both update in the same frame
  as the layout change that caused them, so a resize never shows a frame of tiles over the text.
- **The test uses the drawn tile, not the cell.** A tile is hidden when the tile *as drawn* (moved,
  scaled or turned) overlaps the element, wherever its home cell is. A tile whose home cell is under
  the text but which is drawn clear of it stays visible. Turned tiles are tested by their bounding
  box, so they are hidden slightly early rather than late. Only the generated pose counts: a hover
  effect that grows a tile over the text does not hide it.

## Cost

All the tilesets on a page share one `ResizeObserver`, one `MutationObserver` and one
`IntersectionObserver`. They read all their measurements before writing anything, and skip tilesets
far off screen. Without `avoid`, nothing outside the tileset's own box is measured.

## In a wrapper for another framework

A selector resolves in the nearest ancestor that the package didn't add. If your wrapper adds its
own element around the tileset, mark it with `data-tileset-wrapper`, or selectors resolve inside that
element and match nothing. See [Without Svelte](/guides/without-svelte/#a-wrapper-for-another-framework).
