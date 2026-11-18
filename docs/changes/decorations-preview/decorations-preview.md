# Decorations preview: see a decoration style while you author it
Backlog: B-037 · Tier: contained · Areas: editor-shell, docs-demo · Decisions: Pol, 2026-11-16 (gallery of shapes plus a custom rows × columns view; preview-only state, never in the file)
Output: unchanged
Package: no

## What changed
The preview bar has a **Page | Decorations** switch. Decorations draws the file being edited through the package's `<TileDecoration>`, the component a host page mounts, so a file meant only as a decoration style is no longer authored blind.
- **Gallery**: seven fixed shapes (1×1, 2×2, 2×3, 3×2, 3×3, 4×1, 1×4), each with its own seed. **Custom**: one shape, columns and rows typed (1–12).
- **Cell px** 24 / 44 / 64 / 96 and **Reroll spots** apply to both. Grid on draws each spot's edge and cell lattice. The background swatch applies.
- The open draft and hidden operations apply, as in Page mode. A file with a Drag or Handpick operation draws nothing and one note names those operations; hiding them previews the rest.
- All of it is preview state: never in the file, gone on a reload. Overlays and brushes are Page-only.

## Notes
- New: `lib/preview/decorations.ts` (tested), `lib/preview/DecorationPreview.svelte`, docs page `editor/decoration-preview`. `view.svelte.ts` gains `mode`, `decorationView`, `decorationCell`, `custom`, `reroll`.
- `App.svelte`'s **S2** header gains a second amendment: `TileDecoration` is a preset over the same `TilesetRenderer`, so still no second implementation. Rejected: reshaping the file in the editor and drawing it with `<Tileset>`.
- The refusal is checked once for the whole view, not per spot. Per spot, Collage repeated the same long message seven times.
- The button is "Reroll spots" because the footer already has "Reroll assets".
- Docs updated: `app`, `preview-width`, `preview-bars`, `guides/decorations`.
