# Selection layers (B-033)

Progress record for the big-task session. B-033 was chosen on 2026-11-11. The session runs in
blocks, and each block is confirmed before the next starts. Pol approved the plan below (Block 1
decisions included) on 2026-11-11.
## Context

B-033 (`BACKLOG.md`): an operation's Selection can be made of several **layers**, each one of
today's selections (Handpick, Drag/rect, Row/Column, Every Nth, Checkerboard, Random, All). The
operation affects every cell **any** layer selects. In the editor, the Selection step lists the
layers with a "+ Add selection layer" button, and the overlay shows the combination live. There is
no "Done" button. An operation with one layer saves exactly as today.

This is a **big** task under `docs/Batch-workflow.md` (new Selection type, new `ParamSpec`, schema
bump), so it runs like B-009: in blocks, each one analysed, built, reviewed, tested and confirmed by
Pol before the next. The progress record lives in `docs/plans/selection-layers.md`, in the format of
`docs/plans/every-nth.md`. Its first commit goes on branch `b-033-selection-layers`, cut from `dev`.
The PRs target `dev`, and Pol merges.

## Block 1: decisions

From the backlog, already decided:
- A `union` Selection with a new list param type.
- Validation recurses into the layers. Schema bump with no content migration.
- Extent is the bounding box of the layers, or the whole grid if any layer has none.
- The union is coordinate-bound if any layer is.
- Each `random` layer gets its own hash channel.

Pol, 2026-11-11:
- **Random layers are channelled by position.** Layer 0 keeps today's channel
  (`opId:selection`), so adding a second layer never changes the first layer's scatter, and old
  files draw the same. Layer i ≥ 1 hashes on its own channel. Deleting or moving a layer reshuffles
  the Random layers after it. The file stays as clean as today.

Decided here, not asked (Pol can overrule them at Block 1 review):
- **A union holds at least 2 layers, and a layer can't be a union.** One layer is saved as the
  plain selection, so a 1-layer union would be a second way to write the same thing, and
  `cameWithFile`'s JSON comparison would see two different files. Nesting adds nothing that a
  union doesn't already do.
- **An empty Handpick layer is skipped in the extent box.** Its zero-area extent would otherwise
  pull the box towards (0,0). If every layer is zero-area, the extent is zero-area.
- **`union` never shows in the type picker.** The editor builds it from the layer list.

## Block 2: engine and schema (+ the editor changes needed to stay green)

**Engine (`packages/tileset/src`)**
1. `registry/registry.ts`: add a new `ParamSpec` variant, `{ type: "selectionList" }`.
2. `registry/selections.ts`: register `union` with `params: { layers: { type: "selectionList" } }`.
   - **`coordinateBound`** becomes `boolean | ((params) => boolean)`. `union` uses
     `layers.some(isCoordinateBound)`. Export a helper,
     `isCoordinateBound(selection: Selection): boolean`, and route every reader through it. The
     comment records the rejected options: a static `true` would fire the E12 confirmation on
     procedural unions, and §9.3 says that teaches authors to dismiss it.
   - **`extent`**: the bounding box of the layers' declared extents. Return `undefined` (the whole
     grid) if any layer declares none. Skip zero-area extents.
   - **`impl`**: `layers.some((layer, i) => reg(layer).impl(layer, x, y, layerCtx(ctx, i)))`.
     - `layerCtx(ctx, 0)` is `ctx` itself.
     - For i ≥ 1 it is `{ ...ctx, operationId: layerOwner(ctx.operationId, i) }`, cached per
       `ctx` in a `WeakMap`, so nothing is allocated per cell.
     - `random`'s channel then comes out as `op:<i>:selection`. The colon is excluded from ids
       (`06` §5.3), so it can't collide with another operation's channel. Only Selections ever see
       a layer ctx, never Sources.
   - Comment at the point of use, recording the rejected alternatives: widening `EvalCtx` (O4 is
     closed), and a stable per-layer id (Pol chose by position).
3. `hash.ts`: `layerOwner` sits beside `selectionChannel`. Update the "closed at three shapes"
   note (X3) and the `channelCache` bound comment, which now grows with layers × operations.
4. `validate.ts`:
   - add a `selectionList` case to `param()`. It must be an array of at least 2 items, and each
     item goes through `tagged(..., "selection")`;
   - an item whose registration has a `selectionList` param is an error ("a layer cannot itself
     be a union"). Read the existing `ValidationErrorCode`s first, and reuse one if it fits;
   - `taggedParams`' "absent is optional" rule does **not** apply to `selectionList`;
   - set `SCHEMA_VERSION = 6`.
5. `migrate.ts`: add a `{from: 5, to: 6}` row with a "nothing to do" note. `types.ts`:
   `schemaVersion: 6`, and its history comment.
6. `shape.ts`: `coordinateBoundOperations` uses `isCoordinateBound`. Update the header note.
   `index.ts`: export `isCoordinateBound`.
7. `generate.ts`, `selection.ts`, `ctx.ts`: no change in logic. They already dispatch through the
   registry and `extent?.()`. Check `selection.ts`'s E8 header still reads true.

**Editor, minimum to stay green (no layer UI yet)**
- `controls/affordance.ts`:
  - `affordanceFor` gets a `selectionList` kind;
  - `defaultFor` returns `[]`;
  - `admits` checks for an array;
  - `ParamFields.svelte` renders nothing for that kind.
- `OperationBody.svelte`: filter out of the picker any Selection whose params include a
  `selectionList`. This is a declaration check, not a name check.
- `orphans.ts` (`atRisk`, the `authored`/`outsideCells`/`cameWithFile` `cells` reads) and
  `document.ts` `trimToGrid`: go through `isCoordinateBound`, and through a small editor helper
  `layersOf(selection)` (`[sel]`, or `sel.layers`). Then nested Handpick layers are counted and
  trimmed.
- `apps/editor/public/templates/*/tileset.json` go to v6, because `starters.test.ts` requires it.
  The other fixtures stay old to prove that migration on load works.

**Tests**
- `registry.test.ts`:
  - a union of rect + checkerboard selects the OR of the two;
  - extent: the bounding box; the grid when an `all`/`random` layer has no extent; an empty
    Handpick layer is skipped;
  - `isCoordinateBound`: false for procedural layers, true when one layer is rect;
  - two `random` layers at the same density select different cells;
  - **layer 0 `random` equals the same `random` used alone, cell for cell.**
- `validate.test.ts`: fewer than 2 layers is rejected; a nested union is rejected; a bad layer
  param reports the nested path (`/config/operations/0/selection/layers/1/density`); `layers`
  is required.
- `migrate.test.ts`: the paths now end at 6, plus a 5→6 no-op test.
- `selection.test.ts`: the overlay predicate for a union matches `generate()`'s cells.
- Editor:
  - `affordance.test.ts` name list gains `union`;
  - `orphans.test.ts`: a union with a rect layer is at risk, and a procedural union is not;
  - `document.test.ts`: `trimToGrid` trims a nested Handpick layer.
- Docs pages whose **Written from:** names a changed file (CI gate), and the docs build.

**Exit:** `pnpm test`, `pnpm typecheck` and the docs build are green. A hand-written union file
loads and draws in the editor, shown as a label-only "Union" card.

### Review

**Status:** built 2026-11-11 on `b-033-selection-layers`. Waiting for Pol to confirm before Block 3
starts.

**What changed**
- Engine:
  - `ParamSpec` gains `selectionList`.
  - `union` is registered:
    - its impl ORs the layers;
    - its extent is the bounding box of the layers, or the grid if any layer has none, with
      zero-area layers skipped;
    - its `coordinateBound` is a function of `layers`.
  - `SelectionRegistration.coordinateBound` is now `boolean | (params) => boolean`, and `extent`
    may return `undefined`.
  - The new export `isCoordinateBound(selection)` is the one way to ask. `shape.ts` and the editor
    use it.
- Random layers:
  - layer 0 keeps the Operation's `ctx`, so its channel is still `opId:selection`;
  - layer i ≥ 1 gets `operationId` rewritten to `layerOwner(opId, i)` (`hash.ts`), so its channel
    is `opId:i:selection`;
  - the per-layer contexts are cached per `ctx` in a `WeakMap`.
- `validate()`:
  - `layers` must be an array (`TYPE_MISMATCH`) and is required (`MISSING_KEY`);
  - fewer than 2 layers is `OUT_OF_RANGE` at `.../layers`;
  - each layer is validated as a Selection at its own path;
  - a layer that itself holds layers is `OUT_OF_RANGE` at `.../layers/i/type`. Existing codes are
    reused, and no new code was added.
- Schema v6:
  - `SCHEMA_VERSION`, `TilesetFile.schemaVersion` and the 5 → 6 row ("nothing to do").
  - Editor templates are at v6. `starters.test.ts` requires that, as it did in B-009.
- `shape.ts`:
  - the resize message names a union's bound layers ("a Selection layer of type "rect"") instead
    of "the Selection union";
  - `union` is not listed as a procedural way out.
- Editor:
  - New `layers.ts`: `layersParam`, `holdsLayers`, `layersOf`, `withLayer`, `cellsOf`. Layers are
    found by a declared `selectionList`, not by the name `union`.
  - `affordance.ts` gains kind `selectionList`, and `ParamFields` renders nothing for it.
  - `defaultParams` gives `[]` for a `selectionList`.
  - `OperationBody` keeps layer-holding Selections out of the picker, and disables a cell on
    `coordinateBound === true`.
  - `orphans.ts` and `trimToGrid` read every layer:
    - a Handpick layer inside a union is counted and trimmed;
    - `Orphan.outside` carries a union's loss, because `authored − reachable` is wrong when a rect
      layer reaches cells nobody painted;
    - `advisories.ts` uses `outside` when it is set.
- Docs: a new `editor/layers` page, and 20 module pages updated (engine `selections`, `registry`,
  `validate`, `migrate`, `types`, `shape`, `hash`, `selection`, `index-entry`, `load`, `ctx`;
  editor `orphans`, `affordance`, `param-fields`, `draft`, `document`, `advisories`,
  `operation-body`, `starters`, `import`). Some line numbers and counts on those pages were already
  stale before this block, and were corrected with them. `ARCHITECTURE.md`'s migrate row was
  updated too.

**Tests:** 682 + 649 = 1331 before, and 698 + 661 = 1359 after. They pin, among other things:
- a union is the OR of its layers;
- **a `random` layer 0 draws exactly as the same `random` alone**;
- two `random` layers select different cells;
- the extent rules;
- `isCoordinateBound` on good and malformed input;
- the validation paths;
- the 5 → 6 row;
- the overlay predicate agrees with `generate()` for a rect + random + random union;
- the resize message;
- `atRisk`, orphans, `outsideCells` and `trimToGrid` on unions;
- the `layers.ts` helpers.

`pnpm test`, `pnpm typecheck` and the docs build are green.

**No existing output moves.** `generate()` is unchanged, and no file before v6 can hold a union.

**Not done here:** loading a hand-written union file in the editor, which should show a label-only
"Union" card and the combined overlay. Pol checks it in `pnpm dev`.

**BLOCKED:** none.

## Block 3: editor layer UI

- **Draft model** (`draft.svelte.ts`): replace `selectionType`/`selectionParams` with
  `selectionLayers: {type: string|null, params}[]` (always ≥ 1) and `activeLayer: number`.
  - `fromOperation` unpacks a union into layers and **deep-copies them** (the E3/E6 no-aliasing
    rule; today's copy is one level deep).
  - `toOperation`/`toShadowOperation` write one layer as the plain selection (exactly as today),
    and several as `{type:"union", layers}`.
  - The Selection step counts as chosen when every layer has a type.
- **Selection step** (`OperationBody.svelte`):
  - a list of layer rows: glyph, label, short summary, and × remove when there are 2 or more;
  - clicking a row makes it the active layer, which expands to today's GlyphGrid and ParamFields
    for that layer, so one layer is open at a time;
  - "+ Add selection layer" appends an untyped layer and makes it active;
  - no Done button; Next/Save as today.
- **Preview** (`App.svelte`): `painting`/`rectangle` read the **active layer's** type and params.
  `paintCells`/`drawRect` write into it. `SelectionOverlay` is unchanged: it already shows the
  union through the engine's `selection()`.
- **Labels** (`labels.ts`): a union card's selection chip reads its layers joined, e.g.
  "Drag + Random". Param hints look up the active layer's type.
- Tests: `draft.test.ts` (round-trips 1 and 3 layers, no aliasing of nested layers, collapsing
  to one layer saves a plain selection), `labels.test.ts`, `paint.test.ts` if helpers change.
- The look follows the "Ink on paper" system and the WCAG 2.2 AA sizing rule. The layer rows get
  strong hover feedback.
- Manual check in `pnpm dev` (5174):
  - add a Drag + Random selection; the overlay shows both, live;
  - drawing on the preview edits only the open layer;
  - deleting down to one layer saves a plain selection (check the export).

## Block 4: docs and release notes

- Glossary, `guides/responsive` (a union's coordinate-bound status), `guides/decorations`,
  `editor/*` pages, `ParamFieldsStory`, and `DESIGN_SYSTEM.md` if the layer row adds a pattern.
- Change entry `docs/changes/b-033/selection-layers.md`, in the format of `docs/changes/b-009/`.
- Move B-033 to **Done** in `BACKLOG.md`.
- Draft a changelog line for the release: a new `union` Selection, a new `selectionList`
  ParamSpec, schema v6, `coordinateBound` may be a function, and the new export
  `isCoordinateBound`. No existing output changes. No version bump in the task.

## Verification (every block)

- `pnpm test` and `pnpm typecheck` from the root; `pnpm --filter @vit-foundation/tileset-docs build`.
- The Block 2 regression guard: every existing fixture draws the same (`generate.test.ts` and the
  migrate tests), and the `random` layer 0 test pins the backward-compatible channel.
- Block 3: Pol does the manual editor check before the block is confirmed.
