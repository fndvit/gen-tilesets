---
title: document.ts
description: The editor's document model. A fresh valid file, and every transition, a TilesetFile → TilesetFile function, that is allowed to change it.
sidebar:
  order: 3
---

**Written from:** `apps/editor/src/document.ts`, `document.test.ts`, `library.test.ts`,
`rules.test.ts`, `reseed.test.ts`, `history.test.ts`, and the call sites in `App.svelte`,
`lib/TileLibrary.svelte`, `lib/OperationStack.svelte`, `lib/OperationDraft.svelte` and
`session.svelte.ts`.

## Overview

The document module defines what the editor is editing and every way it may change. The editor
keeps no model of its own. Its document is a tileset file, exactly as it will be exported. This
module provides a fresh, valid starting file, and a function for every edit: set the rows,
change the design width, rename a tile, add an operation, add a breakpoint, and so on.

Each edit takes the whole file and returns a whole new file. If the edit would make the file
invalid, it does nothing and returns the file it was given. So the editor holds a valid file at
every moment, even between keystrokes.

This is the centre of the editor's pipeline: import → **document** → draft/history → preview →
export. The session holds the current file and applies these edits. The undo history stores the
results. The preview draws the file. Export writes it out unchanged, except that it stamps the
current `engineVersion`.

## In detail

### Purpose

`document.ts` is `Transition` and the functions returning one. Its header states three invariants
it exists to hold:

- **E3.** The editor's state *is* a [`TilesetFile`](/api/index/interfaces/tilesetfile/), with no
  second model projected on export.
- **E5.** Every file-touching action is a total `TilesetFile → TilesetFile` that produces a legal
  file. In-flight input stays in the control until it parses.
- **E4.** Nothing is written into `meta` beyond its declared keys.

Nothing else may write to the document. [session.svelte.ts](/editor/session/) enforces that
structurally.

#### Layout transitions

`setRows`, `setCellSize`, `setReferenceWidth`, `setHorizontalAlignment`, `setYOffset`. All but
`setHorizontalAlignment` take **text** and parse it with [fields.ts](/editor/fields/). A parse
failure returns the input. Three of them, `cellSize`, `referenceWidth` and `horizontalAlignment`,
go through `withLayout`, which re-derives `config.columns` with `deriveColumns`
([derive.ts](/editor/derive/)). That makes them **destructive** under E12. `rows` and `yOffset`
touch no derivation.

#### Seed and salts

`setDefaultSeed(text)` trims and refuses an empty result. `rerollSeed()` writes a fresh
`memorableSeed()` ([seed.ts](/editor/seed/)). `rerollOperation(id)` and `rerollAssets()` increment
a salt with `nextSalt` ([reseed.ts](/editor/reseed/)), which wraps at 2³².
`setReseedOnLoad(id, on)` and `setReseedAssetsOnLoad(on)` write the flags unconditionally.

#### Tile library

`tileReferences`, `addTiles`, `addAssets`, `renameTile`, `deleteTile`, `deleteAsset`,
`setAssetWeight`.

#### Operation stack

`addOperation`, `removeOperation`, `replaceOperation`, `moveOperation`.

#### Breakpoints (responsive rules)

`addRule`, `removeRule`, `moveRule`, `setRuleField`, `addRuleField`, `removeRuleField`. Every one
ends in `withRules`, which accepts the result only if [`validate`](/api/index/functions/validate/)
returns no errors.

### Public surface

| Export | Signature | Refuses (returns input) when |
| --- | --- | --- |
| `Transition` | `(file: TilesetFile) => TilesetFile` | n/a |
| `ENGINE_VERSION` | `string`, from Vite's `__ENGINE_VERSION__` | n/a |
| `newDocument()` | `→ TilesetFile` | n/a |
| `setRows(text)` | `→ Transition` | not an integer `>= 1` |
| `setCellSize(text)` | `→ Transition` | not `> 0`; or rules present and result invalid |
| `setReferenceWidth(text)` | `→ Transition` | not `> 0`; or rules present and result invalid |
| `setHorizontalAlignment(a)` | `→ Transition` | rules present and result invalid |
| `setYOffset(text)` | `→ Transition` | not in `[0, 1)` |
| `setDefaultSeed(text)` | `→ Transition` | trimmed text empty |
| `rerollSeed()` | `→ Transition` | never |
| `rerollOperation(id)` | `→ Transition` | never (an unknown id is a no-op map) |
| `rerollAssets()` | `→ Transition` | never |
| `setReseedOnLoad(id, on)` | `→ Transition` | never |
| `setReseedAssetsOnLoad(on)` | `→ Transition` | never |
| `TileReference` | `{ operationId, entry }` | n/a |
| `tileReferences(file, tileId)` | `→ TileReference[]` | n/a |
| `addTiles(tiles)` | `→ Transition` | `tiles` empty |
| `addAssets(tileId, assets)` | `→ Transition` | `assets` empty |
| `renameTile(tileId, name)` | `→ Transition` | never, including empty or duplicate names |
| `deleteTile(tileId)` | `→ Transition` | any palette references the Tile |
| `deleteAsset(tileId, assetId)` | `→ Transition` | Tile unknown; it has `<= 1` asset; remaining weights sum `<= 0` |
| `setAssetWeight(tileId, assetId, text)` | `→ Transition` | text not `>= 0`; Tile unknown; new sum `<= 0` |
| `addOperation(op)` | `→ Transition` | rules present and result invalid |
| `removeOperation(id)` | `→ Transition` | no Operation has that id |
| `replaceOperation(op)` | `→ Transition` | rules present and result invalid |
| `moveOperation(id, index)` | `→ Transition` | unknown id, index out of range, or same index |
| `addRule()` | `→ Transition` | neither candidate rule validates |
| `removeRule(index)` | `→ Transition` | index out of range; result invalid |
| `moveRule(index, to)` | `→ Transition` | either index out of range, or equal; result invalid |
| `setRuleField(index, field, text)` | `→ Transition` | no such rule; parse fails; value unchanged; result invalid |
| `addRuleField(index, field)` | `→ Transition` | no such rule; field already set; result invalid |
| `removeRuleField(index, field)` | `→ Transition` | no such rule; field absent; result invalid |

### Inputs → outputs

**`newDocument()`.** It returns `schemaVersion: 4` (the comment says this is *4 since 0.8.0 added
the translateX/translateY Targets*), `engineVersion: ENGINE_VERSION`, and a config with
`rows: 5`, `columns: deriveColumns(1000, 100, "gutter")` = 10, a `memorableSeed()`,
`assetSalt: 0`, `reseedAssetsOnLoad: false` and empty `tiles` and `operations`. The layout is
`cellSize: 100`, `referenceWidth: 1000`, `yOffset: 0`, `horizontalAlignment: "gutter"`. That
is a grid exactly 1000 design px wide with no bleed. The starting numbers are *UI constants with
no authority anywhere*.

**`keepsRulesLegal(file, next)`** (private). If `next` has no `responsive` rules, it returns
`next` unconditionally. Otherwise it returns `next` only if `validate(next)` is empty, and `file`
if not. It wraps `withLayout`, `addOperation` and `replaceOperation`. It catches two cases that
only rules make reachable: a coordinate-bound Operation added while a rule resizes the grid
(`COORDINATE_BOUND_RESIZE`), and a re-derived `columns` under which a rule's `bleed` leaves no
box.

**`withRules(file, rules)`** (private). It removes `responsive` entirely when `rules` is empty, so
an emptied list exports like a file that never had one. It returns the new file only if it
validates.

**`addRule()`.** It puts `maxWidth` at 600 when there are no bounds yet. Otherwise it uses
`max(0, floor(min(all bounds) / 2))`. It first tries a rule carrying the file's own `columns`,
from [`shapeOf`](/api/index/functions/shapeof/). If that does not validate (a coordinate-bound
Operation pins the grid), it falls back to the file's own `cellSize`. So a new rule changes
nothing until it is edited.

**`addRuleField(index, field)`.** It starts the field at the base's own value from `shapeOf`
(`rows`, `columns`, `cellSize`, `bleed`, `yOffset`). `minWidth` starts at the rule's `maxWidth`,
or 600. `maxWidth` starts at the rule's `minWidth`, or 600.

**`deleteAsset`.** It refuses to empty a Tile, and also refuses when the remaining weights sum to
`<= 0`, the same rule as `setAssetWeight`. Deleting the weighted asset of `[1, 0]` would leave
`[0]`: a Tile with an asset that still cannot select one, which `validate()` rejects as
`ZERO_WEIGHT_SUM`.

**`setAssetWeight`.** It computes the Tile's weight sum with the new value substituted and refuses
if the sum is `<= 0`. Zero on one asset is legal, meaning *listed but never chosen*.

**`tileReferences(file, tileId)`.** It only looks at Operations with `target === "tileId"`, since a
Mapping's kind is fixed by its target. It returns one entry per matching palette index.

**`moveOperation(id, index)`.** It splices out and back in. This is the one transition where an
index is an argument: the subject is named by id, but a destination has no id.

### Invariants

- **Total on legal input (E5).** A transition never returns `null`, never throws to signal
  refusal, and never lands a half-change. Refusal is identity.
- **Transitions take text** where a control types. Taking a `number` would push parsing to every
  call site and let a future caller land a value the schema rejects.
- **`columns` is derived, never edited (E1).** It is written by `newDocument` and `withLayout` and
  displayed by the UI.
- **Nothing is migrated (§9.4).** A destructive layout edit does not rewrite coordinate-bound
  Selections. Undo is the repair.
- **Confirmation belongs to the caller.** A transition that opened a dialogue would not be total.
  `App.svelte`'s `destructive()` does the confirming.
- **Stack order is meaning and is never canonicalized.** Operations are removed and replaced by
  id, never by index. There is no `disabled` flag: muting, if it existed, would remove the
  Operation and hold it aside.
- **A refused deletion re-checks.** `deleteTile` refuses on its own terms even though the caller
  already checked `tileReferences`, because a transition must not depend on a check made
  elsewhere.
- **The seed is trimmed** because the engine hashes the string, and `"sunset "` and `"sunset"`
  would be two different pictures.
- **`setReseedOnLoad` writes whatever it is asked.** Hiding the control over a non-stochastic
  Source is the view's job (`offersReseedOnLoad`). Refusing here would be the silent clearing the
  source forbids.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `session.svelte.ts:38`, `:49`, `:104` | `newDocument`, `Transition` |
| `App.svelte:27-45` | imports the layout, seed, rule and `ENGINE_VERSION` exports |
| `App.svelte:439`, `:447` | `setRows`, `setYOffset` through `session.apply` |
| `App.svelte:458`, `:464`, `:480` | `setReferenceWidth`, `setCellSize`, `setHorizontalAlignment` through `destructive()` (`:212`) |
| `App.svelte:526-565` | `moveRule`, `removeRule`, `setRuleField`, `removeRuleField`, `addRuleField`, `addRule` |
| `App.svelte:679`, `:681`, `:695`, `:703` | `setDefaultSeed`, `rerollSeed`, `rerollAssets`, `setReseedAssetsOnLoad` |
| `App.svelte:346` | `ENGINE_VERSION` shown in the header |
| `lib/TileLibrary.svelte:108`, `:128`, `:168`, `:178`, `:187`, `:196`, `:251` | `addTiles`, `addAssets`, `tileReferences`, `deleteTile`, `deleteAsset`, `setAssetWeight`, `renameTile` |
| `lib/OperationStack.svelte:153`, `:163`, `:193`, `:202`, `:226` | `moveOperation`, `rerollOperation`, `removeOperation`, `setReseedOnLoad` |
| `lib/OperationDraft.svelte:171` | `replaceOperation` or `addOperation` on commit |

Callees: `deriveColumns` (`derive.ts`); `parseRows`, `parseCellSize`, `parseReferenceWidth`,
`parseYOffset`, `parseWeight`, `RULE_PARSERS` (`fields.ts`); `nextSalt` (`reseed.ts`);
`memorableSeed` (`seed.ts`); [`validate`](/api/index/functions/validate/) and
[`shapeOf`](/api/index/functions/shapeof/) from the engine.

### Tests

- **`document.test.ts`.** `newDocument` has `schemaVersion: 4`, empty tiles and operations, and
  actually validates. That matters because `<Tileset>` asserts validity in DEV. `columns` is
  10, even, and covers the width; there is no bleed and `yOffset` is 0; the optional fields are
  written explicitly; a fresh seed matches `/^[a-z]+-[a-z]+-\d{1,2}$/`. The three destructive
  fields re-derive `columns` and the other two do not. A table of bad inputs per field returns
  the file `toEqual` unchanged. `yOffset` `"1.4"` is never coerced, the boundary values are
  admitted, and `"1."` commits as 1. The parsers and transitions agree on every sample text. For
  the seed: whatever is typed is written, empty is refused, it is trimmed, and nothing else is
  touched.
- **`library.test.ts`** (tile library and operation stack). Appends, rename never blocked (even to
  `""` or a duplicate), `tileReferences` ignores numeric targets. The refusals: referenced
  `deleteTile`, last-asset `deleteAsset`, last-weighted-asset `deleteAsset`, last non-zero
  weight, a weight the schema rejects. Every
  refusal is `toBe` identity. Operations append, keep order, are removed by id, are returned
  unchanged on no match, are replaced in place, and have no `disabled` field. `moveOperation`
  moves later and earlier, reaches both ends, is its own inverse, changes no Operation, and
  returns identity on each refusal case.
- **`rules.test.ts`** (Breakpoints). `addRule` yields a legal rule that changes nothing, sits below
  the narrowest bound, and falls back to `cellSize` on a pinned grid. Field set/add/remove, and
  refusing to remove a last condition or last shape field. `rows`/`columns` refused on a pinned
  grid. A `bleed` refused if it leaves no box. `removeRule` drops `responsive` entirely.
  `moveRule` reorders. Edits elsewhere keep rules legal: `addOperation` of a `rect` is refused
  while a rule resizes, and allowed once none does; `setCellSize` is refused when it would break
  a rule's bleed.
- **`reseed.test.ts`.** `rerollOperation` moves one salt only, `rerollAssets` moves no Operation,
  and neither touches the seed or layout. `setReseedOnLoad` writes the flag even over a
  non-stochastic Source.
- **`history.test.ts`** uses the layout transitions to exercise undo.

### Gotchas & rejected alternatives

- **Rejected: a richer internal model** (collapsed panels, muted flags, original assets) that
  emits a file on export. It makes a mismatched pair expressible, and the preview needs a live
  file regardless.
- **Rejected: `meta` as a place for editor state.** `meta` is additive-only, so a parked key
  becomes permanent and reaches every host's provider.
- **Rejected: a per-field rule check.** A rule's legality depends on the whole cascade and the
  stack, so `withRules` calls `validate()` (*O(config), at typing rate*) rather than keep a second
  copy of those rules.
- **`yOffset` has a control** although the layout-controls table omits it. It is required and
  nothing else reaches it.
- **A file without rules pays nothing.** `keepsRulesLegal` short-circuits, so behaviour is exactly
  pre-0.7.0.

### Review notes

- `document.ts:199-204` says *"The confirmation is Step 10 and is not implemented here… until Step
  10 there are no Operations for it to warn about."* Confirmation now exists
  (`App.svelte:212` `destructive()`, using [orphans.ts](/editor/orphans/)), so the second half is
  stale. (stale comment)
- Several transitions build a new object even when nothing changes: `setRows` to the current
  value, `setDefaultSeed` with the same trimmed text, `setHorizontalAlignment` to the current
  alignment, `rerollOperation`/`setReseedOnLoad` with an unknown id, and `renameTile` to the
  same name. `session.apply` compares by reference, so each pushes an undo entry that undoes to
  an identical file. Two consequences show in the UI. `App.svelte:679` applies `setDefaultSeed`
  on every `oninput`, so typing a trailing space pushes a no-op entry. `App.svelte:480` lets the
  already-selected alignment button go through `destructive()`, which can open the E12
  confirmation for a change that changes nothing. `history.test.ts:89-94` pins the
  `setRows("5")` case as *"a genuine entry"*, which contradicts `history.ts`'s *"an unchanged
  file **is** the same object"*. (inconsistency)
