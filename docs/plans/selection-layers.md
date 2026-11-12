# Selection layers (B-033)

Progress record for the big-task session. B-033 was chosen on 2026-11-11. The session runs in
blocks, and each block is confirmed before the next starts.

**History.** The first Block 2 (commit 61d6c74, 2026-11-11) added a `union` Selection beside the
plain one. On 2026-11-12 Pol asked for one shape instead: `Operation.selection` is always a list of
layers. The plan below is that revision. The union build is undone in the follow-up commit, not
rewritten out of history.

## Context

B-033 lets an operation's Selection be made of several layers. An operation affects every cell
that any of its layers selects.

Block 2 was built on `b-033-selection-layers` (commit 61d6c74, not pushed). It added a `union`
Selection, kept a single layer as the plain object, and needed a lot of machinery to tell the two
shapes apart:
- a `selectionList` ParamSpec;
- a parameter-dependent `coordinateBound`;
- a no-nesting rule;
- keeping `union` out of the picker;
- `layersOf` and `withLayer` in the editor.

Pol, 2026-11-12: **`Operation.selection` is always an array of layers, even for one layer.** The
key keeps its name, `selection`. One shape means:
- no `union` type and no new ParamSpec;
- `coordinateBound` goes back to a plain boolean;
- the editor's draft is always a list.

Older files still load. The 5 → 6 migration wraps each old selection in a one-item list, and
layer 0 keeps the operation's old random channel, so a migrated file draws byte-identically. What
breaks:
- code that hands `generate()` an old-shaped config without `migrate()`;
- code that builds an `Operation` in TypeScript.

Under 0.x that costs a version bump and a changelog line.

Unchanged from Block 1 (Pol):
- random layers are channelled **by position**. Layer 0 keeps `opId:selection`, and layer i ≥ 1
  uses `opId:i:selection`;
- the extent is the bounding box of the layers, or the whole grid if any layer has none;
- an operation pins the grid if any layer is coordinate-bound.

Decided here, not asked:
- A selection must hold **at least one layer**. An empty list would be an operation that silently
  does nothing.
- Layers are plain Selection objects, with no wrapper. B-034 can later reserve one sibling key
  (e.g. `"except": true`), the way `type` is reserved today.

## Block 2 rework (same branch, a follow-up commit)

**Undo the union machinery.** Remove:
- the `union` registration and the `selectionList` ParamSpec;
- `coordinateBound` as a function, and `extent` returning `undefined`;
- the `selectionList` branches in `affordance.ts`, `ParamFields.svelte`, `defaultParams` and
  `validate.ts`;
- the picker filter in `OperationBody.svelte`;
- `holdsLayers`, `layersParam`, `layersOf` and `withLayer` in `apps/editor/src/layers.ts`.

Keep:
- `layerOwner` (`hash.ts`);
- the `shape.ts` message that names the bound layer types;
- `Orphan.outside`;
- `isCoordinateBound`, which now takes a list.

**Engine (`packages/tileset/src`)**
1. `types.ts`:
   - `Operation.selection: Selection[]`, commented: "layers; ORed; at least one; order matters
     only for random channels (B-033)";
   - `schemaVersion: 6`, with its history comment.
2. Shared layer preparation, used by both `generate()` and `selection()` so they cannot disagree
   (E8):
   - **`ctx.ts`** `operationCtx` computes `extent` as the bounding box over the layers. The rule
     moves here from the union registration: skip zero-area extents; the grid if any layer has
     none.
   - **`selection.ts`** gains `selectionPredicate(op, ctx)`. It resolves each layer's
     registration and ctx **once** (layer 0 uses `ctx`; layer i ≥ 1 uses
     `{...ctx, operationId: layerOwner(op.id, i)}`), and returns `(x, y) => any layer matches`.
     There is no WeakMap; the per-layer ctx is built once per operation. `generate.ts`'s
     `PreparedOperation` holds that predicate instead of `selection: SelectionRegistration`.
   - The O4 and position-channel rationale comments move with the code.
3. `registry/selections.ts`:
   - `isCoordinateBound(selection: readonly Selection[])` is true if any layer's registration is
     bound;
   - it stays total over malformed input (not an array, unknown types).
4. `validate.ts`:
   - `selection` must be an array (`TYPE_MISMATCH`) with at least one layer (`OUT_OF_RANGE`);
   - each layer goes through `tagged(..., "selection")` at `/selection/<i>`;
   - `pinningOperations`' well-shaped filter checks for an array of objects with a string `type`;
   - `SCHEMA_VERSION = 6`.
5. `migrate.ts`, the 5 → 6 row, which now rewrites content:
   - an operation whose `selection` is a non-array object becomes `[selection]`;
   - anything else is left alone for `validate()` to report;
   - a malformed `config` or `operations` is tolerated;
   - nothing is mutated. Same discipline as 4 → 5.
6. `shape.ts`: `coordinateBoundOperations` and the message use the list. The procedural-name list
   goes back to `!r.coordinateBound`. `index.ts` exports `isCoordinateBound`, plus
   `selectionPredicate` only if the editor needs it (prefer not).

**Editor (`apps/editor/src`)**
- `draft.svelte.ts`: the draft holds `selectionLayers: {type: string|null; params}[]` (at least
  one) and `activeLayer: number`.
  - `fromOperation` deep-copies the layers, for E3/E6 no-aliasing.
  - `toOperation` and `toShadowOperation` write the array.
  - The Selection step is chosen when every layer has a type.
  - **In Block 2 the UI still edits only the active layer (layer 0).** Block 3 adds the list.
  - Add `draftSelection*` accessors so `OperationBody.svelte` and `App.svelte` (`painting`,
    `rectangle`, `paintCells`, `drawRect`) read and write the active layer with minimal churn.
- Every `op.selection.type` / `.cells` reader moves to the list:
  - `labels.ts` `partsOf`: the layer labels joined with " + ";
  - `orphans.ts`, `document.ts` `trimToGrid` (map over layers), `advisories.ts`
    (`selectionType` names the layers);
  - `tour.ts:334` (`op.selection[0].type`), `lib/sections/motif.ts:74`, and the `App.svelte`
    resize dialog;
  - `layers.ts` shrinks to `cellsOf`, or folds into `orphans.ts` if nothing else uses it.
- Templates: migrate `public/templates/*/tileset.json` to v6 with the real `migrate()` (a
  one-off script), not by hand.

**Fixtures and literals.** Mechanical: change `selection: {…}` to `selection: [{…}]` in:
- the engine and editor tests;
- the demo's inline Svelte configs (`Hosting`, `Square2x2`, `Responsive`, `Decorations`);
- `PaletteListStory`.

These stay old on purpose, to prove that migration on load works:
- the demo `public/*/tileset.json` files;
- the docs `fixtures/basic.json`.

Check that each one's loader migrates first.

**Tests**
- Engine:
  - a two-layer selection is the OR of its layers;
  - **layer 0 random equals the pre-B-033 rule** (`hash(stage1(seed), selectionChannel(opId),
    x, y, salt) < density`), checked cell by cell;
  - two random layers select different cells;
  - the extent rules;
  - `isCoordinateBound` on good and malformed input;
  - validation: not an array, empty, a bad layer at `/selection/1/density`, an unknown layer type;
  - migrate 5 → 6: wraps, survives malformed input, does not mutate, and **`generate()` on a
    migrated v5 file with a random selection equals the hand-pinned old cells**;
  - `selection()` agrees with `generate()` for a multi-layer selection;
  - the resize message.
- Editor:
  - `draft.test.ts` round-trips 1 and 3 layers with no aliasing;
  - orphans, `trimToGrid` and `atRisk` on multi-layer selections;
  - the `affordance.test` name list goes back to seven;
  - the `import.test` upgrade steps;
  - labels.
- Docs: redo the Block 2 page edits for the array shape.
  - Drop the union and `selectionList` text.
  - `editor/layers.md` goes if `layers.ts` goes; otherwise it is trimmed.
  - `engine/types.md`, `validate.md`, `migrate.md`, `selections.md`, `ctx.md`, `selection.md`,
    `generate`'s page, and the editor pages for `draft`, `labels`, `orphans` and `document`.
  - Then build the docs.
- Update `docs/plans/selection-layers.md`: record Pol's change, and replace the Block 2 review.

**Exit:**
- `pnpm test`, `pnpm typecheck` and the docs build are green;
- every old fixture draws as before;
- in `pnpm dev`, an imported v5 file shows its operations unchanged.

Pol confirms before Block 3.

## Block 2 review (rework, 2026-11-12)

**Status:** built on `b-033-selection-layers`. Waiting for Pol to confirm before Block 3 starts.

**What changed, against the union build**
- **Removed:**
  - the `union` registration and the `selectionList` ParamSpec;
  - `coordinateBound` as a function, and `extent` returning `undefined`;
  - the `selectionList` branches in `affordance.ts`, `ParamFields.svelte`, `defaultParams` and
    `validate.ts`;
  - the picker filter;
  - `layersOf`, `holdsLayers`, `layersParam` and `withLayer`.

  These files are byte-identical to before Block 2: `registry.ts`, `selections.ts` (bar the new
  `isCoordinateBound`), `affordance.ts` and `ParamFields.svelte`.
- **Engine:**
  - `Operation.selection: Selection[]`;
  - `selection.ts` `selectionPredicate` ORs the layers. Each layer's registration and ctx is
    resolved once per Operation: layer 0 keeps the Operation's ctx; layer i ≥ 1 gets
    `operationId: layerOwner(opId, i)`;
  - `generate()` uses that predicate;
  - `ctx.ts` `layersExtent` gives the bounding box over the layers. It is the grid if any layer
    has no extent, and it skips zero-area layers;
  - `isCoordinateBound(layers)`;
  - `validate()`: `selection` must be a non-empty array, and each layer is checked at
    `/selection/<i>`;
  - the 5 → 6 row wraps every object selection in a one-item list;
  - the `shape.ts` message names the bound layer types.
- **Editor:**
  - the draft holds `layers` and `activeLayer`, and `activeLayer(draft)` gives the active one;
  - `fromOperation` deep-copies the layers;
  - the shadow holds the typed layers only;
  - the Selection step, the brush and the drag edit the active layer, which is layer 0 until
    Block 3;
  - the card chip joins layer labels ("Drag + Random");
  - `layers.ts` is down to `cellsOf` and `selectionTypes`;
  - orphans, `trimToGrid`, the resize dialog and `tour.ts` read the list.
- **Templates** were migrated with the real `migrate()`; the content is identical apart from the
  wrap. JSON.stringify puts each number of a cell list on its own line, which makes the collage
  diff large.
- **Fixtures:**
  - engine and editor test literals are wrapped;
  - the demo's inline files (v2/v3), the demo's `public/*/tileset.json` and the docs'
    `basic.json` stay old, and each loads through `loadTilesetFile`, which migrates first.

**Regression guards:**
- `migrate.test`: a migrated v5 random selection paints exactly
  `hash(seed, "op1:selection", x, y, salt) < density`, the old rule written out by hand;
- `selection.test`: layer 0 random equals random alone; layer 1 equals the hand-written
  `op1:1:selection` rule;
- the overlay agrees with `generate()` for a rect + random + random selection.

**Tests:** 682 + 649 = 1331 before B-033, and 701 + 662 = 1363 now. `pnpm test`, `pnpm typecheck`
and the docs build are green.

**Breaking, under 0.x:** code that builds an `Operation` in TypeScript, or passes an old-shaped
config to `generate()` without `migrate()`, must now use the array. Files on disk are unaffected.

**Not done here:** in `pnpm dev`, open an older file (or a template) and check that the
operations look and draw as before. Pol checks it.

## One PR for all blocks (Pol, 2026-11-12)

Blocks 2, 3 and 4 all go on `b-033-selection-layers` and ship as **one PR** into `dev`, opened
after Block 4.
- Don't open a PR per block.
- Each block is still confirmed by Pol before the next one starts.
- Pushing and `gh pr create` are denied to Claude here: give Pol the command (see the end of
  Block 4).

## Block 3: editor layer UI (handoff brief, for a fresh conversation)

**Before starting:**
1. Read `CLAUDE.md`, `ARCHITECTURE.md` and this whole file. Don't re-ask Block 1's questions or
   the list-shape decision; they are answered.
2. Read `apps/editor/DESIGN_SYSTEM.md`: Component patterns, Interaction conventions,
   Accessibility.
3. **Ask Pol whether Block 2's manual check passed** (an older file or a template opens and
   draws as before). If it didn't, fix that first.

**Branch:** keep working on `b-033-selection-layers`. Its head has the Block 2 rework (11a71c7).
Check `git log` and `git status`, and pull first if Pol pushed.

**Where things stand (Block 2):** the data model is already done. Don't redo it.
- `draft.svelte.ts`:
  - `Draft.layers: DraftLayer[]` holds at least one layer, each
    `{type: string | null; params}`;
  - `Draft.activeLayer` is an index;
  - `activeLayer(draft)` returns the live layer object;
  - `toOperation` refuses while any layer is untyped;
  - `toShadowOperation` keeps the typed layers only (`null` if there are none);
  - `fromOperation` deep-copies.
- `OperationBody.svelte` keeps `const layer = $derived(activeLayer(draft))`. The GlyphGrid,
  `ParamFields`, `chooseSelection` and `chosen("selection")` all go through it.
- `App.svelte`: `painting`, `rectangle`, `paintCells` and `drawRect` read and write the active
  layer. `SelectionOverlay` draws the combination through the engine's `selection()`.
- `labels.ts`: the card chip already joins the layer labels ("Drag + Random").

What's missing is UI: a way to see the layers, add one, remove one, and choose which one is open.

### Analyse first, then confirm with Pol before coding

Write the analysis below into this file as "Block 3: analysis". Ask Pol only the questions marked
**Ask**. Lead with the visible consequence, in plain words, with an ASCII mock-up in the question's
preview.

1. **The Selection step's layout. Ask: pick between two mock-ups.** Recommended: an accordion of
   layer rows under the step's question.
   - Each row: the layer's glyph (the GlyphGrid artwork, small), its label ("Drag", "Random"),
     a mono summary (see 2), and a 28px **IconButton** × "Remove layer N", shown only when there
     are 2 or more layers.
   - The open (active) row expands to today's GlyphGrid and options well, so only one layer is
     open at a time.
   - Under the rows, an **Add row** (`AddBar`, `bar`): "+ Add selection layer".
   - **With one layer the step looks like today, plus the Add row**, so a single-layer user
     sees no new clutter. Decide whether a single layer still shows a row header: recommended
     no.
   - The alternative: a compact chip strip of layers above the GlyphGrid.
2. **Row summary text: decide, don't ask.** Put a pure function `layerSummary(layer)` in
   `lib/operations/labels.ts` so it can be tested, e.g.:
   - Drag: `"3×2 at 0,0"`;
   - Handpick: `"5 cells"`;
   - Random: `"30%"`;
   - Every Nth / Row/Column: `"every 3rd"`;
   - Checkered: `"parity 0"`;
   - All: `""`;
   - untyped: `"choose…"`.

   It must be driven by the params generically where it can, not by a per-type table. Read
   `labels.ts` and `param-hints.ts` first. A small per-type table may be acceptable for the
   wording, the way `NAMED` is.
3. **Adding a layer: decide.** It appends `{type: null, params: {}}` and makes it active.
   - The overlay keeps showing the typed layers (the shadow already drops untyped ones).
   - Next and Save stay gated until it has a type (`isComplete`). Say so in the Save button's
     disabled hint.
4. **Removing a layer: decide.**
   - Removing the active one makes its neighbour active (the previous one, else the next).
   - Focus moves to the new active row's header, never to `<body>`.
   - Removing never leaves zero layers: the × is hidden at one layer.
   - Removing a layer shifts the Random scatter of the layers after it (Block 1, by position).
     **Ask** whether that needs a hint on the ×; recommended: a short hint, "Random layers after
     this one get a new scatter".
5. **Reordering: none in Block 3.** Order only affects Random scatter. Record this as decided;
   it can come with B-034, where order matters.
6. **Preview gestures:** the brush and the drag already follow `activeLayer`.
   - Check that switching the active row swaps between the brush and the drag correctly.
   - Check that an untyped active layer mounts neither.
   - Check that the hidden-operations logic (batch 02) still works.
   - Read `lib/RectLayer.svelte`, `lib/PaintLayer.svelte` and the `App.svelte` mounting block.
7. **Coordinate-bound types under resizing breakpoints:** the picker already disables Drag and
   Handpick per layer (`selectionItems`). Confirm that the hint still reads right with several
   layers.
8. **Card and stepper answers:** `chosen("selection")` and the chip already handle several
   layers. Check the step row's answer text with an untyped layer present.
9. **The tour:** `tour.ts` only reads `op.selection[0]`. Check whether any tour step targets the
   Selection step's DOM (`data-tour` or selectors in `tour.ts`) that the new layout moves.
10. **Accessibility (WCAG 2.2 AA, `accessibility-sizing` memory: Claude decides sizes, strong
    hover):**
    - rows are buttons with `aria-expanded` and `aria-controls`;
    - × has an accessible name with the layer number and type;
    - targets are at least 24px (2.5.8);
    - the focus ring follows the design system;
    - hover is a clear wash;
    - there is no drag-only interaction.

### Build (after Pol confirms the analysis)

- Put state changes in plain `.ts` functions in `draft.svelte.ts`, so they can be tested:
  `addLayer(draft)`, `removeLayer(draft, i)` and `openLayer(draft, i)`. Svelte components can't
  be unit-tested here (CLAUDE.md, Testing).
- Put the layout in `OperationBody.svelte`, or a new `lib/operations/SelectionLayers.svelte` if
  that keeps the body readable. Reuse `GlyphGrid`, `AddBar`, `IconButton`, `Hint` and the
  `options` snippet.
- Tests:
  - `draft.test.ts`: add, remove and open, including active-index rules, never zero layers, and
    removing the active layer;
  - `labels.test.ts` for `layerSummary`.
- Docs: the module pages for every changed file (`editor/operation-body`, `editor/draft`,
  `editor/operation-labels`, a page for any new component; the CI coverage gate). Run
  `pnpm --filter @vit-foundation/tileset-docs build`.
- `DESIGN_SYSTEM.md`: add a **Selection layers** row to Component patterns, describing what was
  built.
- Gate: `pnpm test`, `pnpm typecheck` and the docs build are green.
- Write "Block 3: review" here, in Block 2's format (what changed, tests before and after,
  anything not done).
- Commit on the branch. **Don't push or open a PR yet.**
- **Pol's manual check** in `pnpm dev` (port 5174):
  - add Drag + Random: the overlay shows both, live;
  - drawing edits only the open layer;
  - adding and removing layers, including the active one;
  - one layer looks like today;
  - Save stays off while a layer is untyped;
  - an export of a two-layer operation has a two-item `selection`.

## Block 3: analysis (2026-11-12)

**Pol's answers:**
- Block 2's manual check: not done yet when Block 3 started. Pol still has to do it.
- Layout: **accordion rows**.
- The × gets a **short hint** when a Random layer comes after it.

**Decided:**
1. **Layout.**
   - With one layer, the step is today's step plus "+ Add selection layer" (`AddBar`, `bar`).
     There is no row header.
   - With two or more, each layer is a row.
     - The header is a button with `aria-expanded` and `aria-controls`. It shows a small glyph
       (a dashed square while untyped), "Layer N", the label and a muted mono summary.
     - A 28px × `IconButton` sits beside the header, as a sibling and not nested inside it.
     - The open row expands to the GlyphGrid and the options well. One row is open at a time.
2. **`layerSummary(layer)`** (`labels.ts`) is driven by the params.
   - A `cellList` param gives "N cells".
   - The rect shape (`rectParams`) gives "3×2 at 0,0".
   - A 0–1 number gives a percentage.
   - No params gives "".
   - Untyped gives "choose…".
   - A small table words the two "every Nth" types: "every 3rd", "every 3rd column", and
     ", offset N" when the offset is not zero.
   - Anything else falls back to "name value" pairs ("parity 0"), so a later type still gets a
     summary (E9).
3. **Adding** appends an untyped layer and opens it.
   - The overlay keeps the typed layers.
   - Next and Save stay gated. Save's hint names the untyped layer.
   - The step row reads "Drag + not set".
4. **Removing:**
   - Removing the open layer opens the previous one, or the next if it was first. Removing an
     earlier one keeps the same layer open.
   - Focus moves to the open row's header, or to the Add bar once one layer is left.
   - The × is hidden at one layer.
   - The hint shows only when a later layer is `random`. That is a name check, because a
     Selection has no `stochastic` declaration to read, and adding one changes the Registry
     contract (the same reason `rectParams` gives).
5. **No reordering.** Order only moves the Random scatter. It can come with B-034.
6. **Gestures:** the brush and the drag already follow `activeLayer`. An untyped open layer
   mounts neither. Hidden operations are keyed by operation id, so layers don't touch them.
7. **The coordinate-bound hint** is per type, and the picker is shared, so it is unchanged.
8. **The tour** targets the card and reads `op.selection[0]`, so it is unchanged.
9. **Accessibility:**
   - targets are at least 24px;
   - the × is named "Remove layer N (Type)";
   - the focus ring is the system's;
   - hover is a wash;
   - nothing is drag-only.

## Block 3 review (2026-11-12)

**Status:** built on `b-033-selection-layers`, not pushed. **Pol confirmed Blocks 2 and 3,
including the Block 3 fix, on 2026-11-12.** Block 4 can start.

**What changed**
- **`draft.svelte.ts`:**
  - `addLayer` appends an untyped layer and opens it;
  - `removeLayer` never removes the last layer, keeps the same layer open, and opens the
    neighbour when the open one goes;
  - `openLayer` clamps its index;
  - `shiftsScatter` drives the × hint. It is a `random` name check, with the reason at the point
    of use.
- **`labels.ts`:**
  - `layerSummary` is driven by the parameters, with `NTH_WORDING` for the two every-Nth types;
  - `partialSelection` gives the step row "Drag + not set";
  - `untypedLayers` names the untyped layers in Save's hint.
- **New `SelectionLayers.svelte`:**
  - one layer is today's step plus "+ Add selection layer";
  - two or more are accordion rows (glyph, Layer N, label, summary, ×), with one open;
  - focus goes to the open row's header after a removal, or to the Add row once one layer is
    left.
- **New `selection-glyphs.ts`:** `SELECTION_GLYPHS` moved out of `OperationBody` so the rows can
  share it.
- **`OperationBody.svelte`:**
  - the Selection branch renders `SelectionLayers`;
  - `layer`, `selectionSchema` and `chooseSelection` moved out;
  - the step row and Save's hint read the partial state.
- **Docs:**
  - the pages for `draft`, `operation-body` and `operation-labels`;
  - a new `editor/selection-layers` page, which also covers `selection-glyphs.ts`;
  - a **Selection layers** row in `DESIGN_SYSTEM.md`.

**Checked in a headless browser** against the running dev server (Mosaic, operation 1):
- one layer is unchanged apart from the Add row;
- adding shows "All + not set", Save is disabled with "Still open: Selection (layer 2 has no
  type).", and the new row reads "Not set … choose…";
- picking Random enables Save, and the × of layer 1 gets the scatter hint;
- reopening layer 1 swaps the grid;
- removing the open layer 1 leaves one layer and focuses the Add row;
- there were no console errors.

**Tests:** 701 + 662 = 1363 before Block 3, and 701 + 680 = 1381 now. `pnpm test`,
`pnpm typecheck` and the docs build are green.

**Not done here:** Pol's manual check in `pnpm dev`. The overlay shows both layers live, and
drawing edits only the open layer. The Drag/Handpick gestures swap as rows open. An export of a
two-layer operation has a two-item `selection`.

### Block 3 fix (2026-11-12)

- **Bug (Pol):** pressing "+ Add selection layer" made the preview drop the draft, as if the
  earlier layers had never been applied, until the new layer got a type. The draft cue went too.
- **Cause:** `draftFile` was built from `toOperation`, which is `null` unless `isComplete`, and
  since B-033 `isComplete` is false while any layer is untyped. The preview fell back to the saved
  file.
- **Fix:** `draftFile` leaves untyped layers out first (`typedOnly`), the rule
  `toShadowOperation` already used for the overlay. With no typed layer it is still `null`. Save
  is unchanged: `isComplete` and `toOperation` on the real draft still refuse an untyped layer.
- **Tests:** three more in `draft.test.ts`.

## Block 4: docs, release notes, the PR (handoff brief, for a fresh conversation)

**Pol confirmed Blocks 2 and 3 on 2026-11-12.** No more questions are open; Block 4 is writing,
not deciding. Ask Pol only if something below turns out to be false.

**Before starting:**
1. Read `CLAUDE.md`, `ARCHITECTURE.md`, and this whole file (the Context, Block 1 decisions, the
   Block 2 rework, and the Block 3 analysis and review are what the PR body summarises).
2. Read `docs/changes/README.md` and the entry format in `docs/Batch-workflow.md`, under "Change
   entries". Use `docs/changes/b-009/every-nth.md` as the model.
3. **Branch:** `b-033-selection-layers`, head `ba7df5e` or later. Check `git log` and `git
   status`. The PR goes into **`dev`**, not `main` (`main` is far behind; `git log origin/dev..HEAD`
   is the PR's real commit list, seven commits at the time of writing).

### 1. Docs pages (left out of Blocks 2 and 3 on purpose)

Checked on 2026-11-12; these are the pages that still describe a single Selection:
- `apps/docs/src/content/docs/concepts/glossary.md`:
  - **Selection** row (line ~35): an Operation's selection is a list of one or more layers,
    each one of the listed types; the Operation affects every cell any layer selects. An
    Operation is coordinate-bound if any layer is.
  - **Channel** row (line ~55): layer 0 keeps `operationId + ":selection"`; layer i ≥ 1 uses
    `operationId:i:selection`.
- `apps/docs/src/content/docs/concepts/determinism.mdx`: the channel table row for the
  `random` Selection (line ~73) and the paragraph after it. Same channel rule, and say why it
  is by position (Block 1): a migrated file's one layer keeps its old channel, so it draws
  byte-identically. Also check the `selections.ts:213` line citation still points at the
  `random` Selection.
- `apps/docs/src/content/docs/guides/responsive.md`: lines ~32 and ~144 say "a coordinate-bound
  Operation". Add that an Operation is coordinate-bound when **any** of its layers is (`rect`,
  `cellList`).
- `apps/docs/src/content/docs/guides/decorations.md` line ~51: `selection: { type: "all" }`
  becomes `selection: [{ type: "all" }]`. Then read the page's `avoid` scope text and check it
  still holds with several layers (the extent is the bounding box of the layers, or the whole
  grid if any layer has none).
- `apps/docs/src/content/docs/guides/engine.md`: read it, and fix any Operation literal or
  Selection wording; grep found no literal there.
- **Don't edit** `apps/docs/src/content/docs/api/`: it is generated and git-ignored.
- **Don't edit** the demo fixtures (`apps/demo/src/Hosting.svelte`, `Decorations.svelte`,
  `Responsive.svelte`, `Square2x2.svelte`, `apps/demo/public/*/tileset.json`). They declare old
  `schemaVersion`s and go through `loadTilesetFile`, so they are the migration's regression
  guard. Their single-object `selection` is correct for their version.
- `packages/tileset/README.md` has no Selection text; `ARCHITECTURE.md` was already updated in
  Block 2 (lines ~109, ~111). Re-read both to be sure, don't assume.

### 2. Change entry

New file `docs/changes/b-033/selection-layers.md`, in `every-nth.md`'s format:
- Title: `# B-033 Selection layers: an operation's selection is a list of layers`.
- Header: `Backlog: B-033 · Tier: big · Areas: engine, schema, operations-ui · Decisions: Pol,
  2026-11-12 (selection is always a list; accordion layer UI; × hint only before a Random layer)`.
- `Output: unchanged` (no existing picture changes; a migrated file draws byte-identically).
  Check what values `pnpm changelog check` accepts for `Output:` before writing it.
- `Package: yes`.
- **What changed:** `Operation.selection` is an array of one or more Selections; an Operation
  affects every cell any layer selects. Schema 5 → 6; `migrate()` wraps each older selection in
  a one-item list. Random layers are channelled by position. Extent = bounding box of the
  layers, or the whole grid if any has none. Coordinate-bound if any layer is. New export
  `isCoordinateBound` (it was not exported before; check `git diff origin/dev --
  packages/tileset/src/index.ts`). **Breaking under 0.x:** a config built in TypeScript, or
  passed to `generate()` without `migrate()`, must use the list. `validate()` refuses an empty
  list.
- **Notes:** the plan and reviews are in `docs/plans/selection-layers.md`; rejected: the `union`
  Selection (61d6c74, undone in 11a71c7), a chip strip instead of the accordion, a default type
  for an added layer, reordering (it only moves Random scatter; may come with B-034). Editor: the
  Selection step's layer list (`SelectionLayers.svelte`), and the live picture keeps the typed
  layers while a new one is untyped (Block 3 fix). The version bump and the `CHANGELOG.md`
  section happen at release.
- Run `pnpm changelog check`.

### 3. Backlog

`BACKLOG.md` line ~14 still describes the **union** design ("a `union` Selection (new list param
type, …, no migration)"), which is no longer true.
- Move B-033 to **Done**, in the form the other Done lines use (read them):
  "B-033 Selection layers: b-033 blocks 1–4, PR #NN". The PR number isn't known until Pol opens
  it, so write `PR pending` and leave the number for the post-merge memory update. Don't open a
  PR just to fill it in (`no-pr-for-trivial-doc-updates`).
- B-034 stays open. Add to its line that it now builds on the list shape: an "except" layer could
  be a reserved sibling key on a layer (e.g. `"except": true`), the way `type` is reserved, and
  that order will start to matter, so reordering layers belongs with it.

### 4. Changelog line (drafted, not written into `CHANGELOG.md`)

There is no version bump in this task. Put the draft in the PR body and in "Block 4: review":

> `Operation.selection` is now a list of selection layers; an operation affects every cell any
> layer selects (schema v6). `migrate()` wraps older files' selections and they draw unchanged.
> A config built in code, or passed to `generate()` without `migrate()`, must use the list.
> New export `isCoordinateBound`.

### 5. Gate, review, commit

- `pnpm test`, `pnpm typecheck`, `pnpm --filter @vit-foundation/tileset-docs build`, and
  `pnpm changelog check`. All green.
- Write "Block 4: review" in this file, in Block 3's format (what changed, tests before and
  after, anything not done). Test counts at the end of Block 3 plus its fix: 701 + 683.
- Commit on the branch. Don't push.

### 6. The PR

- Write the body to **that conversation's** scratchpad (give Pol the full absolute path). It
  covers Blocks 1–4:
  - the decisions: a list, not a `union`; channels by position; extent; coordinate-bound; at
    least one layer; the accordion; the × hint; no reordering;
  - the breaking change and who it affects;
  - tests before (701 + 662 before Block 3) and after;
  - Pol's checks (Blocks 2 and 3 confirmed 2026-11-12);
  - the changelog line;
  - that the branch also carries the backlog commit (ca51172) and the first `union` attempt
    (61d6c74), which 11a71c7 undoes;
  - the Claude Code attribution line at the end.
- Pushing and `gh pr create` are denied to Claude (`merge-push-permissions`). Give Pol:
  `! git push -u origin b-033-selection-layers && gh pr create --base dev --title "B-033: selection layers" --body-file <path>`
- After Pol merges: update the `b-033-selection-layers` memory with the PR number and mark the
  task done. Fill in the PR number in `BACKLOG.md` in the next PR that touches it, not in a
  PR of its own.

## Verification (every block)

- `pnpm test` and `pnpm typecheck` from the root, and
  `pnpm --filter @vit-foundation/tileset-docs build`.
- The regression guards: the migrated-v5 random test, and the old demo and docs fixtures loading
  unchanged.
- Pol's manual check in `pnpm dev` at each block.
