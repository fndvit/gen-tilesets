# T-03 Explainer opens where it fits
Backlog: B-023 · Tier: contained · Areas: ui-kit · Decisions: D-04 (A, partial preview width)
Output: unchanged
Package: no

## What changed
An Explainer measures its own height once mounted instead of guessing 420 px. Inside the sidebar it
opens beside it, over the preview, level with its trigger and kept inside the window (`placeBeside`
in `popover.ts`); it covers only its own 340 px of the preview, per Pol's answer to D-04. With no
room beside the sidebar (the stacked layout, or a preview column narrower than the panel) it hangs
on whichever side of its trigger it fits, or has more room (`placeOnLargerSide`).

## Notes
- `placeBeside` takes the anchor as well as the sidebar, viewport and size the plan named: the
  panel sits level with its trigger so the eye does not have to look for it.
- "No room beside" is measured rather than read from the 40rem media query, so a two-column window
  whose preview is narrower than the panel (about 700 px wide) also falls back.
- Checked in Chromium: "How operations work", "How randomness works" and "How noise works" open
  without inner scroll at 1280×700 and 1440×900; at 320×640 every one stays inside the window
  (scrolling). Esc, ✕, press-outside and focus return unchanged.
- Outside ui-kit, comment and docs only: the stale "opens upward" comment in
  `lib/sections/SidebarFooter.svelte` and its line in `sidebar-footer.md` (editor-shell).
- Docs: `ui-explainer.md`, `ui-popover-ts.md`, `sidebar-footer.md`. `DESIGN_SYSTEM.md`: a new
  *Explainer placement* row after *Explainer popover*, whose "under its trigger" now points to it.
