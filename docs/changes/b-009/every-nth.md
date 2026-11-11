# B-009 Every Nth counts row after row; the old rule is Row/Column
Backlog: B-009 · Tier: big · Areas: engine, schema, operations-ui · Decisions: Pol, 2026-11-11 (Block 1 of docs/plans/every-nth.md: rename and repurpose; accept and explain the resize)
Output: changed
Package: yes

## What changed
`everyNth` now counts cells left to right, row after row: it selects `(y · columns + x − offset) % n === 0`, with `n` and `offset` and no `axis`. The old every-Nth-column-or-row Selection is `rowColumn`, with the same params and rule as before. The schema goes from 4 to 5. `migrate()`'s 4 → 5 row renames an old file's `everyNth` to `rowColumn`, so files that are migrated on load draw as before. **A config passed to `generate()` without `migrate()` that uses `everyNth` now draws differently.** Every Nth's picture depends on the column count: with N = 3, 10 columns make diagonals and 9 make vertical stripes. The editor says so in the hint on N.

## Notes
- PRs #27 (Blocks 1–2 and the glyphs) and #28 (Blocks 3–4); plan and reviews in `docs/plans/every-nth.md`.
- Rejected: counting against the design width instead of the grid as drawn.
- Editor: "Every Nth" and "Row/Column" labels; `every-nth.svg` on `everyNth`, a hand-written `row-column.svg` on `rowColumn`; the editor's templates went to v5.
- Version bump and the `CHANGELOG.md` section happen at release (`pnpm changelog draft`).
