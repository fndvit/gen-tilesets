# T-03 (i) explainer for Tiles
Backlog: B-025 · Tier: contained · Areas: editor-shell · Decisions: D-01 (Pol's edits: "asset" for "picture", formats and recommended size added)
Output: unchanged
Package: no

## What changed
The Tiles header has an (i), before its "+", that opens "How tiles work" beside the sidebar: adding tiles (gallery, Upload…, drops, the six formats and a recommended size), tile groups, weights, and that Reroll assets only swaps assets within a group. The text is `TILES_EXPLAINER` in a new `lib/sections/tiles-explainer.ts` (tested), wired in `TilesSection.svelte` exactly as `OperationsSection.svelte` wires its explainer.

## Notes
- Outside the task's area (ui-kit, one line): D-01's text has no note, and `Explainer.svelte` always drew the note under a hairline, so an empty note would have left a bare rule at the bottom. `Explainer` now draws no note when `note` is `""`; the other three explainers have notes and draw as before. No session-B task edits `Explainer.svelte`.
- Docs: new `editor/tiles-explainer.md`; `editor/tiles-section.md` and `editor/ui-explainer.md` updated.
