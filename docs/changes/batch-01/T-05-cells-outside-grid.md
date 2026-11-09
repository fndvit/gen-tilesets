# T-05 Painted cells outside the grid
Backlog: B-014 · Tier: contained · Areas: editor-state, editor-shell · Decisions: D-03 (A)
Output: unchanged
Package: no

## What changed
The orphan notice now offers "Remove N cells outside the grid" for each painted list (`cellList`) with cells past the grid, through a new `trimToGrid(id)` transition in `document.ts`: one undoable step, after which the notice goes away. When the cells were already outside the grid in the file as opened, the notice says so ("An operation has cells outside the grid … It was like this in the file you opened") and no longer offers Undo, which would have gone back to the previous document. After a resize made in the session the text is today's, Undo included, plus the button.

## Notes
- **Deviation from the plan:** the plan said to read "opened or imported" from the history, which it took to record a `replaced` entry on open. It records none: `replaced` pushes a plain snapshot with no mark. Rather than change the history (the write path), `session.open()` now also keeps the file it opened, read-only, as `session.opened` (`null` after New). `orphans.ts` `cameWithFile(op, config, opened)` compares against it cell by cell, so a cell a later resize pushed out keeps the Undo wording. `apply()`, `history.ts` and the undo stack are unchanged.
- `orphanedNotice(orphans, onOpen?)` became `orphanedNotice(orphans, { onOpen?, onRemove?, cameWithFile? })`, and `documentNotices`' last argument likewise; `App.svelte` is the only caller.
- New pure helper `outsideCells(op, config)` in `orphans.ts`: the grid's bounds, not a Selection test (E8), used by `trimToGrid` and `cameWithFile`.
- Tests: `document.test.ts` (the transition), `orphans.test.ts` (`outsideCells`, `cameWithFile`), `advisories.test.ts` (both wordings, the mixed case, the Remove labels).
- Docs: `editor/document.md`, `editor/orphans.md`, `editor/advisories.md`, `editor/session.md`, `editor/app.md`.
