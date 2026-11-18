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
- **B-037** Preview a decoration style in the editor. A file meant only for `<TileDecoration>` is authored blind: the preview draws it as a page tileset, never at the shapes a host places it at. Add a Decorations mode to the preview: a gallery of shapes plus one custom rows × columns, preview-only state — *Open: built on branch `decorations` (docs/changes/decorations-preview), PR not yet opened.*
- **B-038** Single-file export: an editor export option that writes each asset into `tileset.json` as a `data:` URI. Tiles are 150–200 B SVGs, so one file is the natural format for small styles, and serving `tiles/` stops being a problem (Observable Framework publishes only files a page names literally). `prefixedProvider` must pass absolute and `data:` URLs through unchanged. E14's "every `meta.src` is a relative path" widens to "every `meta.src` is written by the editor", which keeps the typo hole closed. From first-use feedback, 2026-11-16;
- **B-039** `bytesProvider(read)`: a provider factory that takes `(path) => Promise<ArrayBuffer | Blob>`, sets the MIME type from the extension (an SVG blob without one fails with `EncodingError`), and makes one blob URL per path, shared by every tileset. It replaces the hand-written recipe in `guides/without-svelte.md`. Not a built-in `loadTilesetZip`, because that would add the package's first runtime dependency. Any zip reader plugs in, e.g. Observable's `zip.file(p).arrayBuffer()`. From first-use feedback, 2026-11-16;
- **B-040** Honour "Reseed on load" without host code: `loadSalt: "auto"` (proposed as the default), where the renderer draws one uint32 per instance. A salt reaches only flagged operations (`hash.ts` `pickSeed`), so this changes only files whose author asked for it. It is SSR-safe because tiles arrive in the browser, and `generate()` stays pure because the renderer draws the salt. It changes output, so it needs a version bump and a changelog line. Related: B-035. From first-use feedback, 2026-11-16;
- **B-041** Decorations that follow the width. Today `options.responsive` rules reach a decoration, but its box is fixed at `columns × cellSize` when it is built (`decorationBox`), so a rule that changes the shape cannot resize it. Proposed: (a) per-placement rules that may set `rows`/`columns`/`cellSize` and resize the box; (b) a fill mode `{ cellSize, minColumns, maxColumns }` that takes the column count from the box. Needs analysis before building, like `RESPONSIVE-HOSTING.md`. From first-use feedback, 2026-11-16 — *Analysed: `docs/plans/decoration-sizing.md` (2026-11-18). (a) dropped in favour of auto placement + breakpoints; (b) becomes auto placement. Not built.*
- **B-042** Decoration box surprises: (a) the host reported having to set its element to `columns × cellSize`, or it collapsed inside an absolutely positioned parent, although `decorationBox` already sets that width on the box it creates. Reproduce before fixing (suspects: shrink-to-fit together with the box's `max-width: 100%`, or a `container-type` wrapper). (b) Add a dev warning when `max-width: 100%` draws tiles smaller than the declared `cellSize`; the decorations guide already documents the shrink. From first-use feedback, 2026-11-16 — *Analysed with B-041 in `docs/plans/decoration-sizing.md`: (b) is replaced by an opt-in `shrink` flag; (a) is still to be reproduced, to confirm the new sizing rules cannot reach it.*
- **B-043** User-facing type docs. Published `.d.ts` tooltips show `07 §5.3`, `R1`, `S10` and similar, which a user cannot follow. On the exported API (`options.ts`, `types.ts`, `provider.ts`, decoration inputs), the JSDoc becomes plain usage text, and the citations and rationale move to `//` comments beside it, which the `.d.ts` does not carry. The citations are moved, not stripped, so the CLAUDE.md citation rule holds; reword that rule to say so. From first-use feedback, 2026-11-16;
- **B-044** Dev warning when a file's `engineVersion` differs in major.minor from the installed package (on 0.x a minor version may change output). The version is generated at build from `package.json`, never written by hand (E2), the way `css.generated.ts` is. From first-use feedback, 2026-11-16;
- **B-045** Docs gaps from first use: the README's "Where the images go" table gets an Observable Framework row that points at the zip recipe (line 43 says only "works the same"). The decorations guide gets a full-bleed example (`margin-inline: calc(50% - 50vw)` plus `overflow-x: clip` on `body`), and a note that the `provider` must stay the same object across updates, and why. From first-use feedback, 2026-11-16;

## Done

- **B-001** Re-order sections: batch-01 T-03, PR #20
- **B-002** Sticky section headers: batch-01 T-08, PR #19
- **B-003** Grid button → On/off switch: batch-01 T-01, PR #20
- **B-004** Tile motif in the sidebar free space: batch-01 T-06, PR #20; motif removed 2026-11-13 (0157602)
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
- **B-036** Tour builds Mosaic one operation at a time: tour-operations blocks 1–3, PR #32
