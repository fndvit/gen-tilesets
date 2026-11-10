# T-02 More gallery tiles and a second template
Backlog: B-031 · Tier: contained · Areas: editor-io, editor-shell, docs-demo · Decisions: D-04 (Pol's answer), D-05 (Mosaic)
Output: unchanged
Package: no

## What changed
The Tile gallery's Collection has two tabs: **Images** (the 21 Collage pictures) and **Shapes** (all 57 files of `../tiles/`, flowers included, colourway by colourway, then the lettered shapes). Each manifest entry gains a required `tab`, checked by `parseManifest`; `byTab` in `lib/tiles/gallery.ts` splits the collection. In `TileGallery.svelte` the tabs are an ARIA tablist with automatic activation, drawn as a segmented control, and picks survive switching tabs in pick order. New tileset lists a second template, **Mosaic**, after Collage, with its thumbnail.

## Notes
- Download size: Shapes adds 181 KB (pictures and thumbnails); `real-a`/`real-b` were re-encoded as Collage was (embedded PNG → WebP q90, 1.45 MB → 77 KB, 0 px over the pixelmatch threshold). Mosaic adds about 23 KB. Opening the gallery still fetches only thumbnails, and only the shown tab's.
- Deviation, small: the shared grid scroller (`.shelves`) now has a fixed height (`max(2 cells, min(560px, 100dvh − 360px))`) instead of a max-height. With a max-height the centred popup grew when Shapes replaced Images, moving the tabs from under the pointer. Still one scroller, as planned.
- Labels: `circle05` reads "Circle 0.5" (its stroke width); `realA`/`realB` read "Real · A/B"; `stripesFull` reads "Stripes".
- Mosaic's thumbnail is an Export image of it (1024 px, 2×) scaled to cover 192 × 120. It opens with reseeded flags, so the editor's first draw can differ from the thumbnail. Mosaic's files are as Pol committed them.
- `TileGallery`'s props are unchanged.
- Docs: `starters.md`, `tile-gallery.md`, `gallery.md`, and the callers line of `ui-keys.md` (which still lists a `TabBar.svelte` that no longer exists; left for its owner). DESIGN_SYSTEM.md: one row appended to *Tile gallery* ("Collection tabs"); the older line "Collection: … one flat list in the manifest's order (G1)" is superseded by it but was not edited (append only).
