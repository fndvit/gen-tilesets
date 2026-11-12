# Backlog

Every item has a permanent ID (`B-001`, `B-002`…) that batches cite (see `docs/Batch-workflow.md`).
IDs are never renumbered or reused, even after an item is done or dropped; a new item takes the
highest ID ever used + 1. A finished item moves to **Done** as one line, e.g.
`- **B-003** Grid button → On/off switch: batch-01 T-01, PR #NN`. A dropped item goes there too,
with `dropped: <reason>`.

- **B-006** The relation between the ‘Grid and Size’ and ‘Breakpoints’ section is confusing even for me. We should re-think how do these 2 work, the user must understand better what creating a breakpoint mean and what it implies. This needs to be clearer. For example, some attributes on breakpoints like ‘cellSize’ seem to not affect the preview at all. Why is there a “Columns” field in breakpoints but not in Grid & Size? Once a breakpoint is created, it should be clear which view are we seeing at all times. This might mean reworking how the breakpoints sections is presented;
- **B-007** When adding a pattern to an operation, the user might want to re-use it for another one. I.e: the same noise function applied to a scale operation might be wanted for the rotation in another one. Allow different operations to use the same pattern as others;
- **B-008** Currently we have Offset X & Y separated. Same with Scale. Instead, group them as a single attribute (Offset, Scale), and add X & Y as parameters inside the same attribute, so the user can choose to affect both at the same time, or just one of them;
- **B-013** Bug: I have been able to scroll past the editor — *Open: batch-01 T-04 (PR #20) fixed the one case it reproduced (horizontal scroll from the "Preview size" hint at 660 px). No vertical scroll reproduced; needs the file or state it happened in.*
- **B-034** "Except" selection layers: a layer that removes cells instead of adding them (e.g. everything except a rect). Layer order starts to matter. Depends on B-033. It builds on B-033's list shape: an "except" layer could be a reserved sibling key on a layer (e.g. `"except": true`), the way `type` is reserved. Reordering layers belongs here;
- **B-035** "Reseed on load" is offered only when an operation's Source is stochastic (`apps/editor/src/reseed.ts` `isStochastic` reads `sources.get(...).stochastic`). An operation with a `random` Selection also depends on the seed — it hashes `effectiveSeed` and the salt — but gets no toggle when its Source is not stochastic. A proper fix needs Selections to declare `stochastic` too, which changes the Registry contract; today the editor finds `random` by name (`draft.svelte.ts` `shiftsScatter`);
- **B-036** Onboarding tour: rebuild Mosaic one operation at a time on a first visit (steps 5–11, operation 1 stage by stage with its card open, then operations 2 and 3), with Skip operations. A novice user's test (2026-11-12) showed the single "An operation" step over the finished picture did not explain operations. *In progress: branch `tour-operations`, plan `docs/plans/tour-operations.md`; PR pending.*

## Done

- **B-001** Re-order sections: batch-01 T-03, PR #20
- **B-002** Sticky section headers: batch-01 T-08, PR #19
- **B-003** Grid button → On/off switch: batch-01 T-01, PR #20
- **B-004** Tile motif in the sidebar free space: batch-01 T-06, PR #20
- **B-011** Drag to draw a Rect selection: batch-02 T-01, PR #22
- **B-012** Hide/unhide operations: batch-02 T-02, PR #22
- **B-014** Painted cells outside the grid: batch-01 T-05, PR #20
- **B-015** Fresh-load hint points at "Assets on load": batch-01 T-02, PR #20
- **B-016** Templates and the tile gallery: starters-onboarding, PR #23
- **B-017** Onboarding: the tour: starters-onboarding, PR #23
- **B-018** Operations (i) explainer: batch-01 T-07, PR #20
- **B-019** Randomness (i) explainer: batch-01 T-07, PR #20
- **B-020** Scroll opened content clear of the footer: batch-01 T-09, PR #19
- **B-021** Reseed on load from a closed card: batch-01 T-11, PR #20
- **B-022** Chosen Toggle segment readable on hover: batch-01 review, 537507b
- **B-023** Explainer opens where it fits: batch-02 T-03, PR #21
- **B-010** Rotation carries into a later tileId operation: dropped: by design, each cell keeps what earlier operations wrote; the Operations explainer says so (batch-01 T-07, PR #20). Pol, 2026-11-11
- **B-005** Unique colour/index per operation: dropped (Pol, 2026-11-11)
- **B-024** Switching Reseed on load seems to lose the picture: the checkbox hint says what the flag does and that unticking brings the picture back; engine unchanged (Pol, 2026-11-11)
- **B-025** Tiles (i) explainer: batch-03 T-03, PR #25
- **B-026** Randomness footer set apart by a gap and a hairline edge: batch-03 T-04, PR #25
- **B-027** Scroll an opened operation into view: batch-03 T-06, PR #26
- **B-028** Smooth scroll when a section closes: batch-03 T-05, PR #26
- **B-029** Reseed on load as a checkbox in a fixed place: batch-03 T-07, PR #26
- **B-030** After Export: what to do with tileset.zip: batch-03 T-08, PR #25
- **B-031** More tiles (Shapes in the gallery) and the Mosaic template: batch-03 T-02, PR #24
- **B-032** Collage template without its no-op operation: batch-03 T-01, PR #24
- **B-009** Every Nth counts row after row; the old rule is Row/Column: b-009 blocks 1–4, PRs #27–#30
- **B-033** Selection layers: b-033 blocks 1–4, PR #31
