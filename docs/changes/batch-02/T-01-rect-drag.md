# T-01 Drag to draw a Rect selection
Backlog: B-011 · Tier: contained · Areas: operations-ui, editor-shell · Decisions: D-01 (Pol: B's gesture, A's result)
Output: unchanged
Package: no

## What changed
While an operation's Selection is a rectangle, dragging on the preview sets its X, Y, Width and Height live; a click gives a 1×1 rectangle. A new `lib/RectLayer.svelte` does the gesture, mounted by `App.svelte` in the `{:else}` of the `cellList` brush. Per Pol's D-01 answer the dashed outline follows the pointer past the grid's edge, while the values written are clamped to the grid; the overlay shows the difference. The arithmetic is new and tested in `paint.ts`: `rectFrom`, `cellReached`, and `rectParams`, which recognises a rectangle Selection by its four integer parameters rather than by name.

## Notes
- Esc and `pointercancel` end the drag and keep the values already written, as the plan says ("end"), rather than restoring the rectangle from before the drag.
- `paint.ts`'s bounding table (and the `paint` docs page) said a `rect` drag does not bound; D-01 changed that row to "the result, not the gesture", with the reason.
- Docs: new `editor/rect-layer.md`; `editor/paint.md` and `editor/app.md` updated.
- Follow-up (Pol): the `rect` Selection is labelled "Drag" in the UI (`labels.ts`; registry name unchanged), and the dragged outline is now a marquee — solid edge, 15% fill, as the iOS screenshot drag — so it is clear that dragging sets the rectangle. Hover stays dashed and fainter.
- Second follow-up (Pol): 15% was invisible over the overlay's 12% wash. The marquee is now a 30% fill with a full-strength 1px edge and a 1px paper ring. The Drag glyph (`assets/glyphs/selection/rect.svg`) gains the Handpick glyph's cursor (a Figma export) at the selected block's bottom-right corner; the block moved one column left so the cursor fits inside the 43×43 image.
