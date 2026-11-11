---
title: migrate.ts
description: The migration table and the walk over it. Brings an older file up to the current schemaVersion, or says why it cannot.
sidebar:
  order: 20
---

**Written from:** `packages/tileset/src/migrate.ts`, `migrate.test.ts`, and the call sites in
`load.ts`, `apps/editor/src/lib/ImportPanel.svelte` and `index.ts`.

## Overview

The migrator upgrades old tileset files. Every file says which version of the format it was
written for. When the format changes, the migrator knows how to carry a file from each older
version to the next one, step by step, until it reaches the version this build understands.

It does not judge whether the file is otherwise correct. Its only job is to rewrite the version
(and, in principle, anything the version change requires) and to report what it did. It also
tells the caller when a file is *newer* than this build, which needs different advice: update
the software, not the file.

It runs first in the pipeline, before the validator: file → migrate → validate → generate →
draw. Most hosts reach it through the loader, which runs both in the right order.

## In detail

### Purpose

`migrate.ts` holds the ordered table of version steps (`MIGRATIONS`) and `migrate()`, which walks
that table from the file's declared `schemaVersion` up to `SCHEMA_VERSION`. It is kept outside
`validate()` because rewriting a version is a coercion and validation never coerces (source cites
`06` §9.2). It is also kept from validating: a migrated file is "shaped for" the current schema,
not proven legal by it (cites **C5**, **C8**).

### Public surface

All four are exported from the engine entry point (`index.ts:110–115`).

| Symbol | Kind | Meaning |
| --- | --- | --- |
| [`migrate`](/api/index/functions/migrate/) | `(file: unknown) → MigrationOutcome` | Walk the table. Never throws. |
| [`MIGRATIONS`](/api/index/variables/migrations/) | `readonly Migration[]` | The table: ordered, adjacent, terminating at `SCHEMA_VERSION`. |
| [`Migration`](/api/index/interfaces/migration/) | interface | `{ from, to, note, upgrade(file) }`. `upgrade` is whole-value and never mutates its input. |
| [`MigrationOutcome`](/api/index/type-aliases/migrationoutcome/) | union | Four kinds; see below. |

The table today:

| Row | Note (verbatim from source) | What `upgrade` does |
| --- | --- | --- |
| 1 → 2 | "nothing to do — ADR-005 widened Operation.target and changed no key" | Sets `schemaVersion: 2`. |
| 2 → 3 | "nothing to do — 0.7.0 added the optional `responsive` rules and changed no key" | Sets `schemaVersion: 3`. |
| 3 → 4 | "nothing to do — 0.8.0 widened Operation.target with translateX/translateY and changed no key" | Sets `schemaVersion: 4`. |
| 4 → 5 | "renamed the everyNth Selection to rowColumn — everyNth now counts cells row after row" | Sets `schemaVersion: 5` and rewrites `selection.type: "everyNth"` to `"rowColumn"` in every Operation, keeping every other key. |
| 5 → 6 | "nothing to do — B-033 added the union Selection (selection layers) and changed no key" | Sets `schemaVersion: 6`. |

The first three rows and the last are no-ops beyond the version number. The comments say why each
bump still exists: so that an older engine meeting a file that *uses* the new feature refuses it
by version rather than with an unknown key, an `OUT_OF_RANGE` target or, for 5 → 6, an
`UNKNOWN_TYPE_NAME` on `union` (cites **C2**). No v5 file holds a union, so there is nothing to
rewrite.

**4 → 5 is the first row that rewrites content** (B-009). The old `everyNth` (every nth column or
row) became `rowColumn` with the same params and impl, and the name `everyNth` went to a new
row-major count; the rename is what makes a v4 file draw exactly as it did. Because it runs before
`validate()`, it assumes nothing: when `config` is not an object or `config.operations` is not an
array only the version changes, and an Operation or selection that is not an object passes
through as it is. Only `config.operations` is walked, because responsive rules hold no Operations.

The cost it accepts: a config handed to `generate()` **without** `migrate()` that uses the old
`everyNth` now draws with the new count.

### Inputs → outputs

`migrate()` takes a **parsed** value, not text. It returns one of four outcomes:

| Condition | Outcome |
| --- | --- |
| Not a plain object (`null`, array, string…) | `{ kind: "unrecognized", declared: undefined }` |
| `schemaVersion` is not a safe integer (absent, `"2"`, `1.5`) | `{ kind: "unrecognized", declared }` |
| `schemaVersion === SCHEMA_VERSION` | `{ kind: "current" }`: no payload, the caller keeps its own reference. |
| `schemaVersion > SCHEMA_VERSION` | `{ kind: "newer", declared }` |
| Lower, and every step from it exists | `{ kind: "migrated", file, steps }`, where `steps` lists each `Migration` applied, in order. |
| Lower, but a step is missing (e.g. `0`, `-3`) | `{ kind: "unrecognized", declared }` |

The version is read **strictly**: the string `"1"` is not `1`. Accepting it would move the
coercion out of `validate()` and into here rather than remove it.

The walk is a loop that looks up the row whose `from` equals the current version. It is walked
rather than indexed so that a gap in the table is a refusal, not a silent skip to the next row
that happens to fit.

### Invariants

- **Migrate before validate.** `validate()` knows exactly one version. Migration produces a new
  value that claims it.
- **Migration is not validation.** A file broken for an unrelated reason still migrates; the
  validator then reports the real problem at its own path.
- **Never mutates its input.** The caller may still hold the pre-import document.
- **A no-op row is still a row.** The `note` records that *nothing has to change*, which the
  source treats as a fact worth carrying (cites `06` §4.3).
- **`newer` is the only case** where *update the software, not the file* is the right advice
  (cites `09` §12.4). The source says conflating it with an older file was the defect this module
  was written to fix.

### Callers / callees

| Caller | Uses | Why |
| --- | --- | --- |
| `load.ts:70` | `migrate` | `loadTilesetFile` branches on the outcome; throws its own message for `newer`. |
| `apps/editor/src/lib/ImportPanel.svelte:183` | `migrate` | Opens an imported archive. Sets a separate `newer` state for that case; otherwise validates `outcome.file` (if migrated) or the raw read. |
| `index.ts:110–115` | re-export | Public API. |
| `apps/demo/src/App.svelte:41` | (comment only) | Describes the order; the demo calls the loader. |

Callees: `SCHEMA_VERSION` from `validate.ts:96`. Nothing else.

Tests elsewhere that call it: `apps/editor/src/import.test.ts` (imports `migrate` and validates
`outcome.file`).

### Tests: `migrate.test.ts`

- A v1 file migrates through `[1,2]`, `[2,3]`, `[3,4]`, `[4,5]`, `[5,6]` in order, and the result equals the input
  with only `schemaVersion` changed.
- The migrated file validates clean. This is the "an old file opens" property.
- The input object is not mutated.
- A v1 file with an unrelated unknown key still migrates; `validate()` then reports exactly
  `UNKNOWN_KEY` at `/somethingElse`.
- The v2 → v3 path adds no `responsive` key. The v3 path takes `[3,4]`, `[4,5]`, `[5,6]`; the v4 path `[4,5]`, `[5,6]`.
- The v4 → v5 path: a file with no `everyNth` changes only its version; an `everyNth` selection
  becomes `rowColumn` with its params untouched; `generate()` on the migrated file matches a
  hand-written grid of the old column rule, while the unmigrated config draws the new count; a
  malformed `config`, `operations`, Operation or selection survives; the input is not mutated.
- The v5 → v6 path (B-033) takes only `[5,6]`, changes nothing but the version number, and the
  result validates.
- `current`, `newer` (with `declared`), and `unrecognized` for absent, `"2"`, `1.5`, `0`, `-3`,
  `null`, `[]` and `"{}"`.
- The table is well-formed: adjacent (`to === from + 1`), contiguous, starts at 1, ends at
  `SCHEMA_VERSION`, every row has a non-empty note, and every `from` reaches the current version.

### Gotchas & rejected alternatives

- **Not inside `validate()`.** That would make "validation never coerces" a rule with an
  exception.
- **Not validating as it goes.** That would make `validate()` reachable by two paths with two
  answers.
- **`"current"` carries no file.** `"migrated"` does. Callers must use their own reference in the
  first case (the loader relies on this for identity).
- **Unrecognized is left to `validate()`**, which reports `SCHEMA_VERSION_MISSING` or
  `SCHEMA_VERSION_UNKNOWN` at `/schemaVersion`, so there is one error format, not two.

### Review notes

- `migrate.ts:77–78` says *"A future `2 → 3` row appends here and composes with this one"*. The
  table already holds `2 → 3` and `3 → 4`, so this sentence is stale.
