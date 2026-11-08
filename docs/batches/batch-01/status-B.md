# Batch 01, session B

## T-08 Sticky section headers
Done. Checked in the editor (Playwright, 1280×700): with Grid & size scrolled 100px into its body,
its header sits at the scroller's top and receives the pointer; the body scrolls under it.

## T-09 Scroll opened content clear of the footer
Done. Checked in the editor (Playwright, with and without reduced motion):
- Operations opened at the bottom of a full sidebar scrolls until its bottom shows.
- Tiles and Breakpoints opened while fully visible: no scroll.
- Grid & size opened in a 420px-tall window (taller than the view): stops with its header at the top.
- A breakpoint rule (group) opened at the bottom, 340px window: stops with its header just under
  the stuck Breakpoints header (52px), not under it.
- Reduced motion: the scroll is instant (done within 50ms of the click).
Not driven: `opening.open` from the orphan notice. It cannot fight by construction (only the
user's own header toggle reveals), but the review may want to drive it.
