# Every nth and Row/Column (B-009)

Progress record for the big-task session. B-009 was chosen on 2026-11-11, after B-005 was dropped.
The session runs in blocks, and each block is confirmed before the next starts.

## Block 1: decisions (answered 2026-11-11)

Today, `everyNth` picks every Nth **column** or every Nth **row**:
`(coord − offset) mod n == 0` with `axis: column | row`
(`packages/tileset/src/registry/selections.ts:178`). That is the Row/Column selection Pol
described. The "every N cells, and a new row doesn't reset the count" selection doesn't exist yet.

- **Structure: rename and repurpose (Pol).** Today's type becomes `rowColumn`, with the same
  params (`axis`, `n`, `offset`). `everyNth` gets the new counting. The schema goes from v4 to v5,
  and the migration step rewrites `selection.type: "everyNth"` → `"rowColumn"` in every operation,
  so old files draw exactly as before.
  Accepted cost: a site that calls `generate()` directly on an old *config*, without `migrate()`,
  gets the new counting. Under 0.x that means a version bump and a changelog line that says so.
- **Resize: accept and explain (Pol).** Every nth counts the cells you see, left to right and row
  after row: cell index `y·columns + x`. If the column count changes, the picture changes. With
  N=3, 10 columns gives diagonals and 9 gives vertical stripes. The editor's hint for this
  selection says so.
- **Params (decided, not asked):** `n` (integer, min 1) and `offset` (integer, default 0), the
  same names `rowColumn` keeps. The rule is `(y·columns + x − offset) % n === 0`. It is
  today's rule, and JS `%` is safe here: a negative multiple gives `-0`, which `=== 0`.
  `rowColumn` keeps its impl unchanged, because migrated files must draw byte-identically.

## Block 2: engine and schema (handoff brief, for a fresh conversation)

**Status:** built 2026-11-11 on `b-009-every-nth`; see Review below. Awaiting Pol's confirmation.
It was planned to run in a new conversation. Before
starting, read `CLAUDE.md`, `ARCHITECTURE.md` and Block 1 above. Don't re-ask Block 1's
questions; they are answered.

**Branch:** `b-009-every-nth` from `dev`. The PR targets `dev` (`gh pr create --base dev`).
Merging and pushing to `dev` are Pol's: give the `!` command. Commit this plan doc as the first
commit on the branch, if it isn't on `dev` yet.

**Goal:** after this block, the engine has two Selections, and every older file loads and draws
exactly as before:
- `rowColumn`: today's rule, unchanged.
- `everyNth`: counts cells row after row.

`pnpm test` and `pnpm typecheck` are green. The editor shows the new type with a label-only
picker cell; its artwork and hint come in Block 3.

### Changes

1. **`packages/tileset/src/registry/selections.ts`** (the registration is at ~line 178).
   - Register `rowColumn` with *exactly* today's `everyNth` params and impl:
     `axis: enum column|row`, `n: integer min 1`, `offset: integer default 0`, and
     `(coord − offset) % n === 0`. Move the existing doc comment (the `%`-is-safe-against-zero
     note) with it.
   - Redefine `everyNth`: params `n` (integer, min 1) and `offset` (integer, default 0); no
     `axis`. The impl is `(y * ctx.columns + x − offset) % n === 0`. The `%` note applies
     unchanged, because the test is against zero.
   - Set `coordinateBound: false` and no `extent` on both.
   - In the comment at the point of use, say why: the count is row-major over the grid as drawn,
     so the pattern changes with the column count (Pol, Block 1). The rejected alternative,
     counting against the design width, goes in the same comment.
2. **`packages/tileset/src/migrate.ts`**: add a `{ from: 4, to: 5 }` row to `MIGRATIONS`.
   - It is the first row that rewrites content, not only the version. Say so in its comment and
     in `note`.
   - `migrate()` runs **before** `validate()`, so the step must survive malformed input:
     - leave the file untouched apart from the version when `config` is not an object or
       `config.operations` is not an array;
     - skip any operation or selection that isn't an object;
     - rewrite only `selection.type === "everyNth"` → `"rowColumn"`, and keep every other key.
   - Don't mutate the input (there is a test for that); build new objects.
   - Responsive rules hold no operations (`shape.ts`, `reshape`), so only `config.operations` is
     walked.
   - Check `types.ts` first in case Operations live anywhere else in a file. If they do, walk
     that place too.
3. **The schema version:**
   - `SCHEMA_VERSION = 5` in `validate.ts:96`;
   - `schemaVersion: 5` in `types.ts:319`;
   - the editor literals in `apps/editor/src/document.ts:129` and
     `apps/editor/src/lib/sections/motif.ts:53`. If they can import the constant instead, do
     that; then the number lives in one place.
4. **`shape.ts`** (~line 26): the note says `everyNth` "holds at any size". Add `rowColumn` there,
   and say that `everyNth` holds but *looks* different at another column count.
5. **`apps/editor/src/lib/operations/OperationBody.svelte`, `SELECTION_GLYPHS`:**
   - point `rowColumn` at the existing `every-nth.svg`, since it draws columns, today's meaning;
   - remove the `everyNth` entry, so it falls back to a label-only cell.

   This is a one-line move to keep the editor honest. Real artwork is Block 3, from Figma.

### Tests (all must pass; update every existing test that means today's behaviour)

- `registry/registry.test.ts`:
  - the name list gains `rowColumn`;
  - the three `everyNth` tests (lines ~90–120) become `rowColumn` tests, otherwise unchanged;
  - the `coordinateBound` sweep (~223) includes `rowColumn`;
  - new `everyNth` tests:
    - with a 4-column ctx and n=3, the cells (0,0), (3,0), (2,1), (1,2) are selected and (1,0)
      is not; that is the count continuing across the row boundary;
    - an `offset` larger than the cell index;
    - the default offset;
    - `n=1` selects everything.
- `selection.test.ts:71–72`: the existing cases become `rowColumn`. Add an `everyNth` case.
- `validate.test.ts:339, 349`: switch these to `rowColumn` (they use `axis`). Add one check that
  `everyNth` with an `axis` key is rejected, *if* validate rejects unknown params; read
  `validate.ts` to find out.
- `migrate.test.ts`:
  - the v1, v2→v3 and v3→v4 tests now end at v5. Their step lists and expected files gain
    `[4, 5]`.
  - new `describe("migrate — the v4 → v5 path")`:
    - (a) a v4 file without `everyNth` changes nothing but the version;
    - (b) a v4 file with an `everyNth` op becomes `rowColumn`, and its params are untouched;
    - (c) **`generate()` on the migrated v5 file equals `generate()` on the v4 config with the
      old rule.** Pin it with a small literal expected grid, written out by hand. The old impl
      no longer exists under the old name, so it can't be called for comparison.
    - (d) malformed `config`/`operations` survives;
    - (e) the input is not mutated.
- Editor tests that name `everyNth` with `axis` move to `rowColumn`:
  - `apps/editor/src/controls/mapping.test.ts:207–211`;
  - `orphans.test.ts:60`;
  - the name list in `controls/affordance.test.ts:146`, which also gains `rowColumn`.
  - `labels.test.ts:31` stays. Add `labelFor("rowColumn")` and decide its label here: plain
    sentence case gives "Row column", so add an override `"Row/Column"` to `NAMED` in
    `labels.ts`. Copy beyond that is Block 3.

### Docs (CI gate: every changed source file's module page is updated in the same commit)

Under `apps/docs/src/content/docs/`, update the pages whose **Written from:** names a changed
file:
- `engine/selections.md`, `engine/migrate.md`, `engine/selection.md`, `engine/shape.mdx`,
  `engine/validate.md` and `engine/types.md` (version);
- the editor pages for `OperationBody` and `labels`.

Leave the other pages that only *mention* `everyNth` to Block 4: the glossary, the responsive
guide and the stories. Run `pnpm --filter @vit-foundation/tileset-docs build` to confirm the gate
passes.

### Check before calling it done

- The v4 JSON fixtures stay at v4 on purpose, since that proves migration on load:
  - `apps/demo/public/{kelp,readme}/tileset.json`;
  - `apps/editor/public/templates/{collage,mosaic}/tileset.json`;
  - `apps/docs/src/fixtures/basic.json`.

  None of them uses `everyNth`. Confirm each one's loader runs `migrate()` before `validate()`.
  If any validates a raw v4 file, it will now fail with a version error. In that case, migrate
  it in the loader, not by editing the JSON.
- Run `pnpm test`, `pnpm typecheck`, and the docs build.
- Manually, in the editor (`pnpm dev`, port 5174):
  - an Every nth operation with n=3 on a 10-column grid shows diagonals;
  - an imported file that used the old `everyNth` shows the same picture as before, as a
    Row/Column card.
- Do **not** bump `packages/tileset/package.json` and do not touch `CHANGELOG.md`; that happens at
  release.
- Draft the changelog line for the PR body instead. It must say that a config passed to
  `generate()` without `migrate()` that uses `everyNth` now draws differently.

### Review

Pol confirms the block before Block 3 starts.

**What changed**
- Engine:
  - `rowColumn` is registered with the old `everyNth`'s params, impl and comment, unchanged;
  - `everyNth` is `(cy · columns + cx − offset) % n === 0`, with `n` and `offset` and no `axis`.
    Its comment records the column-count dependence and the rejected design-width count.
- Schema:
  - `SCHEMA_VERSION` and `TilesetFile.schemaVersion` are 5;
  - the `4 → 5` row renames `everyNth` → `rowColumn` in `config.operations`. It survives
    malformed input and never mutates.
  - `types.ts` confirmed that Operations live nowhere else.
- `shape.ts` header: `rowColumn` holds at any size; `everyNth` holds, but looks different at
  another column count.
- Editor:
  - `document.ts` and `motif.ts` read `SCHEMA_VERSION` instead of a literal, so the number lives
    in one place;
  - the `every-nth.svg` glyph moved to `rowColumn`, and `everyNth` is label-only;
  - `labels.ts` gained `rowColumn` → "Row/Column".
- `validate()` rejects unknown params, so `everyNth` with an `axis` is `UNKNOWN_KEY`, and a test
  pins it.
- Editor tests that hard-coded `schemaVersion` 4 or the `[1, 2, 3]` migration steps
  (`document`, `export`, `import`) now read `SCHEMA_VERSION`, or gained the step.
- Docs:
  - `engine/`: `selections`, `migrate`, `selection`, `shape`, `validate`, `types`, `load`
    (version);
  - `editor/`: `operation-body`, `operation-labels`, `document`, `sidebar-motif`, `starters`;
  - `ARCHITECTURE.md`'s migrate row.

**Tests:** 671 + 644 = 1315 before, and 682 + 646 = 1328 after. `pnpm test`, `pnpm typecheck` and
the docs build are green.

**One departure from the brief: the editor templates went to v5.** `starters.test.ts` asserts
that every template's `schemaVersion === SCHEMA_VERSION`, with the message "needs migrating". So
`apps/editor/public/templates/{collage,mosaic}/tileset.json` cannot stay at v4. Neither has an
`everyNth`, so the 4 → 5 row changes only the version, and that one-line diff is the whole
change.

The other fixtures all load through `loadTilesetFile`, which migrates first, so they stay old
and still prove migration on load:
- the demo's `kelp`, `readme` and `atlas` (v2);
- the docs' `basic.json`;
- the demo's inline literals.

**Not done here:** the manual editor check (n=3 on 10 columns showing diagonals; an old
`everyNth` import drawing the same picture as a Row/Column card). The migration test pins the
second one in code. Pol checks both in `pnpm dev`.

**BLOCKED:** none.

## Block 3: editor
- `labels.ts`: "Row/Column" for `rowColumn`, "Every nth" for `everyNth`.
- `OperationBody.svelte`: the glyph map. The existing `every-nth.svg` moves to `rowColumn`, and
  `everyNth` gets new artwork from Figma.
- The hint text about the column count.
- `SelectionOverlay`: it goes through `selection.ts`, so no logic changes are expected.
- Every test that names `everyNth`.

## Block 4: docs and release notes
- The module pages under `apps/docs` that name `everyNth` (engine/selection(s), glossary,
  responsive guide, editor pages, stories), plus `DESIGN_SYSTEM.md`.
- CHANGELOG and the version bump happen at release, not in a task.
