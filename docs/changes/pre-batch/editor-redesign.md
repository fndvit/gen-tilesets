# Editor redesign, "Ink on paper"
Backlog: – · Tier: big · Areas: ui-kit, editor-shell, operations-ui, editor-state, editor-io, renderer · Decisions: Pol's answers in the archived REDESIGN_PROGRESS.md
Output: unchanged
Package: yes

## What changed
The editor was rebuilt on a design system: tokens, base styles and UI primitives (`lib/ui/`), then
the shell, Grid & Size, Tiles (tile groups and tile assets) and Operations sections on top of them.
Stage 2 redesigned the preview (top bar with sizes, colour and grid; corner handles; breakpoint bar;
reference image and "The file" view removed), warnings and dialogs (`Notice`, `Dialog`, a notices
store), the palette widget, tile and pattern, an explainer and field preview for Noise with a live
draft, and an export menu with PNG image export. Branch `editor-redesign`, 2026-11-04 to
2026-11-08, merged as PR #18.

## Notes
- Recorded after the fact, when per-task change files were introduced; the redesign predates
  batches, so it has no backlog item.
- The package part, `renderImage` and `imageSize`, shipped as 0.11.0 and is already in
  `CHANGELOG.md`, which cites this file so the release script does not fold it again.
- The living reference is `apps/editor/DESIGN_SYSTEM.md`. The session-by-session log, Pol's
  answers and why "Ink on paper" was chosen are in `../gen-tileset-spec-archive/editor-redesign/`.
- Left undone (redesign backlog items 6, 8, 9, 10): glyphs for Attribute, Source and Blend; the
  space between field labels and their values; hints for keyboard users (`ui/Hint` opens on hover
  only); a subtler accent edge on the open operation card.
