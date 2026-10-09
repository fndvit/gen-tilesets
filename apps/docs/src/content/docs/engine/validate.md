---
title: validate.ts
description: The schema check. Walks a parsed TilesetFile and returns every problem as a code at a JSON Pointer; an empty list means valid.
sidebar:
  order: 21
---

**Written from:** `packages/tileset/src/validate.ts`, `validate.test.ts`, the helpers it reads in
`shape.ts` and `responsive.ts`, and the call sites in `load.ts`, `apps/editor/src/document.ts`,
`apps/editor/src/lib/ImportPanel.svelte` and `index.ts`.

## Overview

The validator is the gatekeeper for a tileset file. It reads a file that has already been parsed
and checks every part of it: the version, the grid size, the tiles and their images, each
operation, the layout, and the optional rules for different screen widths. It returns a list of
problems, each with a code and the exact location in the file. An empty list means the file is
valid.

It never fixes anything. A value that is out of bounds is reported, not clamped, and it collects
every problem rather than stopping at the first, so an editor can highlight all of them at once.

It sits just after migration: file → migrate → **validate** → generate → draw. The generator
trusts its input and does not re-check it, so this is the one place a bad file is caught.

## In detail

### Purpose

`validate(file)` is the separate validation function the engine's design relies on: `generate()`
trusts its input and behaves undefinedly on an unvalidated config (cites **C5**). The source gives
the cost argument for keeping it separate: validity is a property of the config, which does not
change between generations, so folding the check into `generate()` would pay `O(config)` on every
resize, reroll and editor frame. It produces errors only, with no warnings or severities (cites
**C6**). It takes a parsed value, and because an in-memory editor document can hold `NaN`,
`Infinity` or a function, finiteness is checked rather than assumed.

### Public surface

Exported from the engine entry point (`index.ts:121–126`).

| Symbol | Kind | Meaning |
| --- | --- | --- |
| [`validate`](/api/index/functions/validate/) | `(file: unknown) → ValidationError[]` | Empty array means valid. Never throws on bad input. |
| [`ValidationError`](/api/index/interfaces/validationerror/) | interface | `{ path, code, message }`. `path` is an RFC 6901 JSON Pointer. |
| [`ErrorCode`](/api/index/type-aliases/errorcode/) | string union | The sixteen codes below. |
| [`SCHEMA_VERSION`](/api/index/variables/schema_version/) | `4` | The one version this build knows. 4 since 0.8.0, 3 was 0.7.0, 2 was ADR-005 (per its doc comment). |

**`message` is not part of the contract.** The source says to branch on `code`; matching on
prose would make every reworded message a silent behaviour change in another package. A
published code is never reassigned to different semantics.

### Inputs → outputs

The walk runs in this order (`validate.ts:899–933`):

1. Not a plain object → one `TYPE_MISMATCH` at `""` (the root), and stop.
2. `schemaVersion` absent → `SCHEMA_VERSION_MISSING`, and stop. Not exactly `SCHEMA_VERSION` →
   `SCHEMA_VERSION_UNKNOWN`, and stop. **A bad version is reported alone**: the loader "never
   guesses a version from the fields present" (cites **C2**), and a hundred shape errors against a
   schema the file was not written for would be that guess made loudly.
3. Unknown top-level keys (allowed: `schemaVersion`, `engineVersion`, `config`, `layout`,
   `responsive`).
4. `engineVersion`: required, must be a string, content never checked (cites **C3**).
5. `config`, then `layout`, both required.
6. `responsive`, if present. Then, **only if the error list is still empty**, the per-band box
   check.

#### Error codes

| Code | Raised when | Reported at |
| --- | --- | --- |
| `SCHEMA_VERSION_MISSING` | `schemaVersion` is `undefined`. | `/schemaVersion` |
| `SCHEMA_VERSION_UNKNOWN` | `schemaVersion` is anything other than the number `SCHEMA_VERSION` (older, newer, a string). | `/schemaVersion` |
| `MISSING_KEY` | A required key is absent or `undefined` (a `null` value counts as present). A tagged object's parameter with no registry default is absent. A responsive rule has neither `minWidth` nor `maxWidth`, or sets no shape field. | The missing key's own path, e.g. `/config/rows`; for the two rule cases, the rule (`/responsive/<i>`). |
| `UNKNOWN_KEY` | A key not in the known set, at any depth. Not raised inside an asset's `meta`, and not raised on a Selection/Source whose `type` is unknown. | The unknown key, escaped (`/config/a~1b~0c` for `a/b~c`). |
| `TYPE_MISMATCH` | Wrong JavaScript type, including `null` anywhere but a palette `tileId`. Also: root not an object; a `range` that is not a two-element array; a `cellList` entry that is not a two-element array; `meta` not an object; `responsive` not an array; a rule's shape field not a number. | The offending value. |
| `NOT_AN_INTEGER` | A finite number with a fractional part (or beyond the safe-integer range) where an integer is required: `rows`, `columns`, salts, `steps`, `integer` parameters, `cellList` coordinates, a rule's `rows`/`columns`. | The value. |
| `NOT_FINITE` | `NaN` or `±Infinity` in any number field. Not `TYPE_MISMATCH`: they are numbers. | The value. |
| `OUT_OF_RANGE` | A numeric bound fails; an `enum` parameter outside its values; `target` not a Target name (of any type); `horizontalAlignment` not `"column"`/`"gutter"`; `defaultSeed` empty; a palette with no entries; a rule's `minWidth`/`maxWidth` below 0; `minWidth > maxWidth`; a band whose resolved shape leaves no box. | The value; for an empty palette, `…/mapping/palette`; for `minWidth > maxWidth`, the rule's `minWidth`; for the box check, `/responsive/<i>` of the blamed rule. |
| `INVALID_IDENTIFIER` | A Tile id, TileAsset id, Operation id or palette `tileId` that does not match `^[A-Za-z0-9_-]+$`. | The id. |
| `DUPLICATE_ID` | A Tile id used twice in `tiles`; a TileAsset id used twice **within one Tile**; an Operation id used twice. | The second (and later) occurrence's `id`. |
| `EMPTY_ASSET_LIST` | A Tile's `assets` is `[]`. | `…/tiles/<i>/assets` |
| `ZERO_WEIGHT_SUM` | Every weight in a Tile's assets, or in a palette, is legal but they sum to `≤ 0`. Suppressed if any weight was already reported. | The array (`…/assets` or `…/mapping/palette`). |
| `DANGLING_TILE_REF` | A non-null palette `tileId` names no Tile in `tiles`. | `…/palette/<i>/tileId` |
| `UNKNOWN_TYPE_NAME` | A Selection or Source `type` is not in its registry. | `…/selection/type` or `…/source/type` |
| `INVALID_TARGET_BLEND` | `blend` is a string not in `acceptedBlends(target)`. This includes an unregistered Blend name. Only checked when `target` is legal. | `…/operations/<i>/blend` |
| `COORDINATE_BOUND_RESIZE` | A responsive rule names `rows` or `columns` while the stack holds a coordinate-bound Operation. One error per (field, Operation) pair. | `/responsive/<i>/rows` or `/responsive/<i>/columns` |

#### Primitives and paths

`at()` builds a pointer from tokens, escaping `~` as `~0` **before** `/` as `~1`; the other order
would turn a literal `/` into `~01`. The `Errors` collector only appends. Five helpers carry
nearly every check: `finite` (type, then `NOT_FINITE`), `integer` (`finite`, then
`Number.isSafeInteger`), `inRange`, `uint32` (integer in `[0, 2³²)`), and `identifier`. `required`
treats only `undefined` as absent; the source quotes `06` §5.1: "`null` is never a way to write
'absent'." `unknownKeys` walks `Object.keys` against a fixed list.

#### Config (`/config`)

Known keys: `rows`, `columns`, `defaultSeed`, `assetSalt`, `reseedAssetsOnLoad`, `tiles`,
`operations`.

- `rows`, `columns`: required integers `≥ 1`.
- `defaultSeed`: required string, length `≥ 1`. The empty string would hash to a legal seed
  nobody chose.
- `assetSalt`: optional `uint32`. `reseedAssetsOnLoad`: optional boolean.
- `tiles`, `operations`: required arrays, **either may be empty**. That is a fresh editor
  document, and it generates a grid of `tileId: null` (cites **G4**).
- Tile ids are collected from `tiles` before `operations` are walked, so a palette reference
  resolves the same whether the Tile appears earlier or later in the file.

#### Tiles and TileAssets (`/config/tiles/<i>`)

- Tile keys: `id` (identifier, unique across Tiles), `name` (any string, even empty or repeated;
  cites **C10**, **D1**), `assets` (required non-empty array).
- TileAsset keys: `id` (identifier, unique within its Tile only), `weight` (finite, `≥ 0`; zero
  means "listed but never chosen"), `meta` (optional object, contents not inspected; the one
  exception to strictness, cites **C4**).
- `ZERO_WEIGHT_SUM` is raised only when every weight was individually legal.

#### Operations (`/config/operations/<i>`)

Known keys: `id`, `salt`, `reseedOnLoad`, `selection`, `source`, `target`, `mapping`, `blend`.

- `id`: identifier, unique. The source calls this a correctness requirement: hash channels are
  namespaced by Operation id, so two Operations sharing one would share their random values.
- `salt` optional `uint32`; `reseedOnLoad` optional boolean.
- `selection`, `source`: required tagged objects; see below.
- `target`: required; must be a key of `TARGETS`, else `OUT_OF_RANGE` (a non-string is also
  `OUT_OF_RANGE`, not `TYPE_MISMATCH`).
- `blend`: required **bare string**, never a tagged object. Checked against `acceptedBlends(target)`,
  which is derived from the Blend registry, so a Blend registered later is accepted without this
  file changing (cites ADR-001, **O7**).
- `mapping`: required object; its shape depends on `target`.

#### Tagged objects and parameters

`tagged()` checks a Selection or Source: object, then `type` present, then a string, then
registered. An unregistered name is `UNKNOWN_TYPE_NAME`, and **nothing further is checked**: there
is no schema to check against, and reporting every parameter as unknown would bury the one error
that matters. Otherwise `taggedParams()` applies the registry's `ParamSchema`:

- Unknown keys are anything but `type` and the schema's parameter names.
- An absent parameter is legal if its spec has a `default`, or is a `cellList` (absent means the
  empty list). Otherwise `MISSING_KEY`.
- `param()` per spec type: `number` (finite, then `min`, `max`, `exclusiveMin`, `exclusiveMax`),
  `integer` (integer, then `min`, `max`), `enum` (membership; `OUT_OF_RANGE`, not `TYPE_MISMATCH`,
  because a string and a number outside the set are the same mistake), `cellList` (array of
  two-element arrays of integers).

#### Mapping

The mapping carries no kind tag; its kind comes from the Operation's `target` (cites **C8**). If
`target` was illegal, the mapping is only checked to be an object.

- **Tile target** (`tileId`): only key `palette`, required. A non-empty array of
  `{ tileId, weight }`. `tileId` may be `null` (clear this cell); otherwise an identifier that must
  name a Tile. `weight` finite, `≥ 0`; the sum must be `> 0` when every weight was legal.
- **Numeric target**: keys `range` (required, two finite numbers, `min > max` allowed and reverses
  the map) and `steps` (optional integer `≥ 2`, because the stepped formula divides by
  `steps - 1`). Absent `steps` means continuous, so it is not a `MISSING_KEY`.

Because the shape is checked strictly, a numeric mapping that carries `palette` produces
`UNKNOWN_KEY` at `…/mapping/palette` and `MISSING_KEY` at `…/mapping/range`, not a "wrong kind"
error.

#### Layout (`/layout`)

All four keys required: `cellSize` and `referenceWidth` finite `> 0`; `yOffset` finite in `[0, 1)`
(validated, not clamped); `horizontalAlignment` exactly `"column"` or `"gutter"`. There is **no
cross-field check** of `columns × cellSize` against `referenceWidth`.

#### Responsive rules (`/responsive`)

Optional array. The source describes four layers:

1. **Each rule's fields.** Known keys are `minWidth`, `maxWidth` and the shape fields
   (`SHAPE_FIELDS`: `rows`, `columns`, `cellSize`, `bleed`, `yOffset`). `referenceWidth` is
   therefore an unknown key in a rule. Conditions are finite and `≥ 0`, and `minWidth ≤ maxWidth`.
   Each shape field is checked by `shapeFieldProblem` from `shape.ts`, the same function
   `reshapeErrors` uses, so a host rule and a file rule cannot disagree about a legal value.
   `bleed` always passes here; its bound is relative.
2. **A rule must say when and what.** No condition, or no shape field, is `MISSING_KEY` at the
   rule. A rule with no condition would be the base under another name.
3. **`COORDINATE_BOUND_RESIZE`.** `pinningOperations` filters the file's Operations to the
   well-shaped ones (object, `selection.type` a string, `id` a string) and asks
   `coordinateBoundOperations` from `shape.ts` which are coordinate-bound. Malformed Operations
   are skipped so one defect is not reported twice.
4. **Every band has a box** (`everyBandHasABox`). Runs only if the whole file is otherwise
   error-free. For each width from `bandWidths(rules)` it resolves the active rules and reshapes
   the file; if `layout.referenceWidth` is not `> 0` (`columns - bleed` leaves nothing) it raises
   one `OUT_OF_RANGE`, blaming the last active rule that set `bleed` or `columns` (or rule 0), and
   **stops at the first failing band**.

### Invariants

- **Everything is checked; nothing is coerced** (cites §9.2). An absent field with a declared
  default is not coercion, because nothing was rewritten.
- **Strict at every depth** (cites §9.1, **C4**). The source's example: `"opactiy": 0.5` under a
  permissive schema loads, is discarded, and leaves a picture that does not match the file.
- **Collect, never throw.** A validator that threw on the first problem would make the editor's
  error list a function of key order.
- **Validated against the registries and `TARGETS`, never a copy.** Parameter schemas are data so
  this function can walk them.
- **`null` is a value in exactly one place**: a palette entry's `tileId`.

### Callers / callees

| Caller | Uses | Why |
| --- | --- | --- |
| `load.ts:47` | `validate` | Inside `assertValidFile`, used by `loadTilesetFile`. |
| `load.ts:25`, `migrate.ts:35` | `SCHEMA_VERSION` | The version to compare against and migrate to. |
| `apps/editor/src/lib/ImportPanel.svelte:195` | `validate` | After `migrate()`; a non-empty list is shown and the file is not opened. |
| `apps/editor/src/document.ts:239` | `validate` | `keepsRulesLegal`: when the file has responsive rules, an edit is kept only if the result validates. |
| `apps/editor/src/document.ts:685` | `validate` | `withRules`: a rules edit is kept only if the result validates. |
| `index.ts:121–126` | re-export | Public API. |

Callees: `acceptedBlends`, `TARGETS` (`registry/blends.ts`); `selections`, `sources` (their
registries); `ParamSchema`, `ParamSpec` types (`registry/registry.ts`); `activeRules`,
`bandWidths`, `ruleOverride` (`responsive.ts`); `coordinateBoundMessage`,
`coordinateBoundOperations`, `reshape`, `SHAPE_FIELDS`, `shapeFieldProblem` (`shape.ts`).

Other tests that call it: `migrate.test.ts`, `shape.test.ts` (reshaped files validate clean, and
an unknown Selection type is left to `validate()`), `apps/editor/src/document.test.ts`,
`import.test.ts`, `rules.test.ts`.

### Tests: `validate.test.ts`

- **Valid cases:** a whole file; an empty document; every optional field absent; a reversed
  range; a `null` palette `tileId`; a numeric mapping with no `steps`; a zero-weight asset beside a
  non-zero one.
- **One case per code**, mostly asserting the code list exactly. A bad `schemaVersion` with a
  broken `config` and missing `layout` yields only `SCHEMA_VERSION_UNKNOWN`. A colon in an
  Operation id is `INVALID_IDENTIFIER`. Asset ids may repeat across Tiles.
  `INVALID_TARGET_BLEND` on `multiply`+`rotation` and `add`+`tileId`; `multiply` is accepted on
  `scale`, and `set`/`add`/`multiply` on both translate Targets.
- **Strictness:** an unknown key deep in a mapping, at its exact pointer; an unknown parameter on a
  registered type; `meta` contents uninspected but `meta` itself must be an object; RFC 6901
  escaping.
- **Parameters:** number bounds, enum, integer, a defaulted parameter absent, a required one
  missing, `cellList` pairs.
- **Mapping kind from target:** `palette` on an `opacity` mapping gives `UNKNOWN_KEY` +
  `MISSING_KEY` at the two expected paths; `steps: 1`; empty palette; unknown target.
- **Salts:** fractional → `NOT_AN_INTEGER`; `-1` and `2³²` → `OUT_OF_RANGE`; `2³² − 1` valid.
- **Layout:** `yOffset` `1.4` and `1` rejected, `0` accepted; `{}` gives four `MISSING_KEY`;
  unknown alignment; no cross-check against `referenceWidth`.
- **Not errors:** `reseedOnLoad` on a constant Source; a `rect` wholly outside the grid; any
  `engineVersion` string.
- **Collecting:** three independent problems give three errors; `null`, `[]`, `"{}"` give one
  `TYPE_MISMATCH`.
- **Responsive:** with and without rules; unknown key plus missing shape field; `referenceWidth`
  in a rule; per-field domains at their own paths; missing condition, inverted condition, negative
  `maxWidth`; non-array; `COORDINATE_BOUND_RESIZE` at `rows` and `columns`, message naming the
  Operation; a coordinate-bound stack may keep rules that move no cell; two rules that are each
  fine but together leave no box, blamed on rule 1.

### Gotchas & rejected alternatives

- **JSON Pointer, not dotted paths**, because arrays are everywhere in the file and the pointer
  indexes them without a new convention.
- **`yOffset` is validated, not clamped.** The source: a loader that rewrites a value "produces a
  picture the file does not describe, and the author's next save writes the rewritten value back
  over their own." Clamping is the editor's input constraint, not the loader's.
- **No ordering check on `range`.** `min > max` reverses the map.
- **Second complaints are suppressed.** `ZERO_WEIGHT_SUM` is skipped if a weight was already
  reported; the band check is skipped if anything else failed; malformed Operations are skipped in
  the coordinate-bound pass.
- **Legal-but-suspicious configs are not errors.** The header says these are advisories that
  belong to the editor.

### Review notes

- **Inconsistent type reporting between `target` and `blend`.** A non-string `target` (e.g. `5`)
  is `OUT_OF_RANGE`; a non-string `blend` is `TYPE_MISMATCH`. Both are "bare string from a fixed
  set". The `enum` parameter comment justifies `OUT_OF_RANGE` for the first style; `blend` does
  not follow it.
- **An unregistered Blend is `INVALID_TARGET_BLEND`, not `UNKNOWN_TYPE_NAME`**, unlike an unknown
  Selection or Source. This is consistent with the header's "a bare string, never a tagged object",
  but the code is less precise than it could be, and `validate.test.ts` does not pin an unregistered
  Blend name (the editor's `blend.test.ts:92` tests its own completeness gate, not `validate()`).
- **If `target` is illegal, `blend` is never checked against any registry**, so an unknown Blend
  name next to an unknown target produces only the target's error. Harmless because the file is
  rejected anyway, but not tested.
- **`rect` parameters have no lower bound.** `width` and `height` are plain `integer` specs, so
  `width: 0` or `-3` validates; the Selection then matches nothing. Not tested, and not stated as
  intended anywhere in `validate.ts` or `selections.ts`.
- The box check stops at the first failing band, so a file with two independent bad bands reports
  one. That seems deliberate (`return` after the first `add`) but it is not commented.
