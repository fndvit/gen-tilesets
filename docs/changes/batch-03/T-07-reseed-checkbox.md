# T-07 "Reseed on load" as a checkbox in a fixed place
Backlog: B-029 · Tier: contained · Areas: operations-ui, ui-kit · Decisions: D-03 (A)
Output: unchanged
Package: no

## What changed
"Reseed on load" is a labelled checkbox, the new `lib/ui/Checkbox.svelte` (a native checkbox, 16px box, the whole label a ≥ 24px target, hover/press washes, the accent focus ring). On a closed operation it left the chip row for a row of its own at the card's left edge, so it is in the same place on every card; the open card's Pattern step uses the same checkbox instead of its Off/On toggle. Writes are unchanged (`withReseedOnLoad` + `replaceOperation`, and `draft.reseedOnLoad`).

## Notes
- New token `--checkbox: 16px` in `tokens.css` (beside `--target-min`).
- `DESIGN_SYSTEM.md`: the Operation card row gains item 5; appended a *Checkbox* row. Docs: new `ui-checkbox.md`; `operation-card.md`, `operation-body.md`, `ui-toggle.mdx` (caller list).
- Toggling still changes the picture; that is T-09 (B-024), not decided in this batch.
