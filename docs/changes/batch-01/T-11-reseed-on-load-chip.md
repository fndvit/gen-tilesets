# T-11 Reseed on load from a closed card
Backlog: B-021 · Tier: contained · Areas: operations-ui, editor-shell · Decisions: D-06 (Pol's answer)
Output: unchanged
Package: no

## What changed
A closed operation card whose Pattern is random-based (the registry's `stochastic` flag) now ends its chip row with a "Reseed on load: On / Off" chip that toggles the flag without opening the card. It is a `role="switch"` with `aria-checked`, and On wears the selected state. `OperationsSection` writes it with the existing `replaceOperation`, so it is one undo entry and `document.ts` is unchanged. The flag is written as an explicit `true`/`false`, as Save writes it.

## Notes
- Outside the listed areas: the two small rules (when the chip shows, and the operation it writes) are `reseedOnLoadChip` and `withReseedOnLoad` in `reseed.ts` (editor-state, which session A holds), tested in `reseed.test.ts`, so they are not only in `.svelte` files.
- Checked in the browser with the kelp fixture: the chip appears on the four Noise cards and not on the Constant one. Click, Space and Enter toggle it. "Preview a fresh load" enables as soon as it is on. The open card's toggle shows the same state, and Undo reverts it. The target is 24 px tall, and at the 400 px sidebar the chip wraps to its own line without overflowing.
- Docs: `editor/operation-card.md`, `editor/operations-section.md`, `editor/reseed.md`.
