# T-02 More gallery tiles and a second template
Backlog: B-031 · Tier: contained · Areas: editor-io, editor-shell, docs-demo · Decisions: D-04 (Pol's answer, then overridden by Pol), D-05 (Mosaic)
Output: unchanged
Package: no

## What changed
The Tile gallery's Collection gains the 57 files of `../tiles/` (flowers included, colourway by colourway, then the lettered shapes), after the 21 Collage pictures, in one grid. New tileset lists a second template, **Mosaic**, after Collage, with its thumbnail.

## Notes
- Deviation from D-04, by Pol: the Images and Shapes tabs were built and then removed after review. Every picture is in the one Collection grid, in manifest order, and the manifest has no `tab` field. `TileGallery.svelte` and its scroller are as on `dev`.
- Download size: the shapes add 181 KB (pictures and thumbnails); `real-a`/`real-b` were re-encoded as Collage was (embedded PNG → WebP q90, 1.45 MB → 77 KB, 0 px over the pixelmatch threshold). Mosaic adds about 23 KB. Opening the gallery still fetches only thumbnails.
- Labels: `circle05` reads "Circle 0.5" (its stroke width); `realA`/`realB` read "Real · A/B"; `stripesFull` reads "Stripes".
- Mosaic's thumbnail is an Export image of it (1024 px, 2×) scaled to cover 192 × 120. It opens with reseeded flags, so the editor's first draw can differ from the thumbnail. Mosaic's files are as Pol committed them.
- `TileGallery`'s props are unchanged.
- Docs: `starters.md`, `tile-gallery.md` (a rejected-tabs note), and the callers line of `ui-keys.md` (the removed `TabBar.svelte` dropped).
