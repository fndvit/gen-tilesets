# First visit opens Mosaic; tour text in ink with the (i) icon
Backlog: B-016, B-017 · Tier: contained · Areas: editor-shell, ui-kit · Decisions: Pol, 2026-11-10
Output: unchanged
Package: no

## What changed
- **The first visit opens Mosaic** instead of Collage, and New → From template lists Mosaic first. The tour's "An operation" step now describes Mosaic's operation 3 (`op5`): a Random Selection of about 3 in 100 cells, and a Constant Pattern giving them the tile "Special".
- **No grey text in the tour.** The count and the closing aside are ink, like the rest of the bubble.
- **The (i) is the real icon.** The Randomness step's aside reads "Click on the ⓘ buttons to know more info.", with the ⓘ drawn as the editor's `info` icon and spoken as "information".

## Notes
- `FIRST_VISIT_TEMPLATE` is `"mosaic"`; `collageFailedNotice` is renamed `firstVisitFailedNotice`. `exampleOperation` now checks the third operation is `op5` with a `random` Selection.
- `tour.ts` adds `INFO` and `Span.icon`; `spans` cuts each `INFO` mark into its own icon span. Tested in `tour.test.ts`.
- `DESIGN_SYSTEM.md` *Onboarding: the tour* (steps 1, 4, 6, 8, 9, the bubble, the contrast row) updated.
- Docs: `editor/first-visit.md`, `tour.md`, `tour-dialog.md`, `starters.md`, `new-tileset.md`, `keeping.md`, `operation-card.md` updated.
