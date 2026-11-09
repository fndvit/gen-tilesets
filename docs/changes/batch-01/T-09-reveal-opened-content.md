# T-09 Scroll opened content clear of the footer
Backlog: B-020 · Tier: contained · Areas: ui-kit · Decisions: none
Output: unchanged
Package: no

## What changed
A section or group the user opens from its own header now scrolls the sidebar, once its slide has
ended, until its bottom is in view, but never so far that its header leaves the top or slips under
an enclosing section's stuck header (T-08). Already visible: no scroll. Smooth, instant under
reduced motion. The geometry is in a new `lib/ui/reveal.ts`, tested; `Collapsible` calls it.

## Notes
- Only the user's own toggle reveals. Opens from outside (`Section`'s `reveal` and "+",
  `opening.open`) do not, so `OperationsSection`'s scroll to the opened card is never undone by a
  reveal of the whole section. Written at the point of use in `Collapsible.svelte`.
- `scrollIntoView({ block: "nearest" })` rejected: it scrolls a tall section's header off the top
  and cannot see the sticky header.
- New docs page `editor/ui-reveal-ts`; `editor/ui-collapsible` updated. `DESIGN_SYSTEM.md`: an
  "Opening near the bottom" row appended to Interaction conventions, and `reveal.ts` added to the
  list of files beside the primitives.
