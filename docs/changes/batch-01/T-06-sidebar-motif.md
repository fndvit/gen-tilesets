# T-06 Tile motif in the sidebar's free space
Backlog: B-004 · Tier: contained · Areas: editor-shell · Decisions: none
Output: unchanged
Package: no

## What changed
The space between the last sidebar section and the Randomness footer now shows a quiet checkered field of flat squares in `--grey-200` on the `--grey-100` ground, drawn by the package's own `<TileDecoration>`. It grows and shrinks with that space and disappears under two rows. New pure `lib/sections/motif.ts` (style, size rule, the three look constants at the top) with `motif.test.ts`, and `SidebarMotif.svelte`, mounted after `.sections` with the sidebar's `ScrollArea` in `fill` mode.

## Notes
- The square is an SVG data URL that states its `width`/`height`. Without them the canvas substrate could not decode it and painted nothing, which only a browser check showed.
- T-04's probe re-run with the motif mounted: no page scroll (126 checks at 660–2560 px, zoom 100 and 200 %).
- Docs: new `editor/sidebar-motif.md` (both files); `editor/app.md` updated.
