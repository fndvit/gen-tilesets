# Bundle B2 (ui-kit)
Backlog: B-002 · Tier: trivial · Areas: ui-kit · Decisions: none
Output: unchanged
Package: no

## What changed
- T-08 Sticky section headers: an open section's header (`Collapsible`, `variant="section"`) is
  `position: sticky; top: 0` with the card's background and `z-index: 2`, so it stays at the top
  of the sidebar, ink rule included, while its body scrolls under it. It sticks within its own card;
  headers never stack. Groups do not stick.

## Notes
- `DESIGN_SYSTEM.md`: a "Sticky headers" row appended to Interaction conventions.
- Docs page `editor/ui-collapsible` updated.
- The heading carries the card's radius (top corners only when open), so a header that is not stuck
  does not show square corners over the ground.
