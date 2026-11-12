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

## Block 2 rework (same branch, a follow-up commit; then one PR)

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

Then give Pol the push and `gh pr create --body-file` line. Pol confirms before Block 3.

## Block 3: editor layer UI

Simpler now, because the draft is already a list:
- **Selection step:**
  - layer rows (glyph, label, summary, and × when there are 2 or more);
  - clicking a row makes it the active layer, and only the active layer is expanded with today's
    GlyphGrid and ParamFields;
  - "+ Add selection layer" appends an untyped layer and makes it active;
  - no Done button.
- **Preview:** drawing goes to the active layer. `SelectionOverlay` is unchanged and shows the
  combination through `selection()`.
- "Ink on paper" styling, WCAG 2.2 AA sizes, strong hover feedback.
- Manual check:
  - Drag + Random shows both layers live;
  - drawing edits only the open layer;
  - deleting a layer works.

## Block 4: docs and release notes

- Glossary, the responsive and decorations guides, `DESIGN_SYSTEM.md` if needed.
- `docs/changes/b-033/selection-layers.md`.
- B-033 moves to Done in `BACKLOG.md`.
- Changelog line: `Operation.selection` is now an array of layers (schema v6); `migrate()` wraps
  old files, which draw unchanged; a config built in code or passed to `generate()` without
  `migrate()` must use the array; new `isCoordinateBound` export. No version bump in the task.

## Verification

- `pnpm test` and `pnpm typecheck` from the root, and
  `pnpm --filter @vit-foundation/tileset-docs build`.
- The regression guards: the migrated-v5 random test, and the old demo and docs fixtures loading
  unchanged.
- Pol's manual check in `pnpm dev` at each block.

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
