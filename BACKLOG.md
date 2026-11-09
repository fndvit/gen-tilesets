# Backlog

Every item has a permanent ID (`B-001`, `B-002`…) that batches cite (see `docs/Batch-workflow.md`).
IDs are never renumbered or reused, even after an item is done or dropped; a new item takes the
highest ID ever used + 1. A finished item moves to **Done** as one line, e.g.
`- **B-003** Grid button → On/off switch: batch-01 T-01, PR #NN`. A dropped item goes there too,
with `dropped: <reason>`.

- **B-005** Operations should have a unique color/index to be able to follow them on the stack more easily, even after re-organizing them;
- **B-006** The relation between the ‘Grid and Size’ and ‘Breakpoints’ section is confusing even for me. We should re-think how do these 2 work, the user must understand better what creating a breakpoint mean and what it implies. This needs to be clearer. For example, some attributes on breakpoints like ‘cellSize’ seem to not affect the preview at all. Why is there a “Columns” field in breakpoints but not in Grid & Size? Once a breakpoint is created, it should be clear which view are we seeing at all times. This might mean reworking how the breakpoints sections is presented;
- **B-007** When adding a pattern to an operation, the user might want to re-use it for another one. I.e: the same noise function applied to a scale operation might be wanted for the rotation in another one. Allow different operations to use the same pattern as others;
- **B-008** Currently we have Offset X & Y separated. Same with Scale. Instead, group them as a single attribute (Offset, Scale), and add X & Y as parameters inside the same attribute, so the user can choose to affect both at the same time, or just one of them;
- **B-009** The ‘EveryNth’ selection does not work how I imagine it. For me ‘everyNth’ means that every N cells, a cell is selected, and changing a row does not reset that count. The current behaviour acts more as a ‘Row’ or ‘Column’ selection, which is fine to have, but with another name. This means: change the behaviour of everyNth so it works like it should, and create another selection for ‘Row/Column’;
- **B-010** Bug: In an operation where we configure a constant tileId in a cell, after another operation that configures rotation, it looks like rotation affects the tileId even if the tileId operation comes after. TLDR: a rotation operation affects operations that go after it; — *Open: batch-01 T-07 (PR #20) only explains the behaviour in "How operations work"; the engine fix is T-12, not yet scheduled.*
- **B-013** Bug: I have been able to scroll past the editor — *Open: batch-01 T-04 (PR #20) fixed the one case it reproduced (horizontal scroll from the "Preview size" hint at 660 px). No vertical scroll reproduced; needs the file or state it happened in.*

## Additions

- **B-016** We want to create a set of ‘Example tiles’ and ‘Example tilesets’ (find a better word than ‘example’), so the user can use the tool right away without having to create tiles from the beginning. This should be implemented in a way that makes the user experience logical, which might include changing how the current ‘add tiles’ functionality works;
- **B-017** We need to create a brief Onboarding explaining the steps to create a Tileset. It should include: how to configure the tileset dimension, how to add tiles, how to add operations, how to randomize (a brief step for every section). The user must be able to opt-out at any time, and the onboarding must make use of the typical UI that points to the places where the user must look at every step;

## Done

- **B-001** Re-order sections: batch-01 T-03, PR #20
- **B-002** Sticky section headers: batch-01 T-08, PR #19
- **B-003** Grid button → On/off switch: batch-01 T-01, PR #20
- **B-004** Tile motif in the sidebar free space: batch-01 T-06, PR #20
- **B-011** Drag to draw a Rect selection: batch-02 T-01, PR #22
- **B-012** Hide/unhide operations: batch-02 T-02, PR #22
- **B-014** Painted cells outside the grid: batch-01 T-05, PR #20
- **B-015** Fresh-load hint points at "Assets on load": batch-01 T-02, PR #20
- **B-018** Operations (i) explainer: batch-01 T-07, PR #20
- **B-019** Randomness (i) explainer: batch-01 T-07, PR #20
- **B-020** Scroll opened content clear of the footer: batch-01 T-09, PR #19
- **B-021** Reseed on load from a closed card: batch-01 T-11, PR #20
- **B-022** Chosen Toggle segment readable on hover: batch-01 review, 537507b
- **B-023** Explainer opens where it fits: batch-02 T-03, PR #21
