---
title: load.ts
description: The plain consumer's door. migrate() then validate(), in that order, throwing on either.
sidebar:
  order: 1
---

**Written from:** `packages/tileset/src/load.ts`, `load.test.ts`, and the call sites in
`render/Tileset.svelte`, `apps/editor/src/lib/ImportPanel.svelte` and `index.ts`.

## Overview

The loader is the front door for a tileset file. When an app has read a tileset from disk, it
hands it to the loader, which upgrades older files to the current format and then checks that
nothing is malformed. If anything is wrong it stops with a message listing every problem, so a
bad file never reaches the drawing code. It sits at the very start of the pipeline:
file → load → generate → draw.

## In detail

### Purpose

`load.ts` reimplements nothing. It is **the sequence** `migrate()` → `validate()`, put behind
one function so that the order becomes a property of the package rather than an instruction each
host has to remember. If the two calls are reversed, nothing complains. The file is validated
against a version it does not yet claim, and the failure is silent.

### Public surface

Both functions are exported from the engine entry point (`index.ts:136`).

| Function | Signature | Migrates? | On failure |
| --- | --- | --- | --- |
| [`loadTilesetFile`](/api/index/functions/loadtilesetfile/) | `(raw: unknown, label = "tileset file") → TilesetFile` | yes | throws |
| [`assertValidFile`](/api/index/functions/assertvalidfile/) | `(file: unknown, label: string, hint?: string) → TilesetFile` | **no** | throws |

### Inputs → outputs

`loadTilesetFile` takes a **parsed** value, not text. A JSON syntax error belongs to whoever
called `JSON.parse`. It then branches on `migrate()`'s `MigrationOutcome`:

| `outcome.kind` | What happens |
| --- | --- |
| `"current"` | `raw` itself is validated and returned **by identity**. `"current"` carries no payload. |
| `"migrated"` | `outcome.file` is validated and returned. |
| `"newer"` | Throws its own message: *declares schemaVersion N, but this build knows M. Upgrade the package.* |
| `"unrecognized"` | **No branch on purpose.** Falls through to `validate()`, which reports `SCHEMA_VERSION_MISSING` / `SCHEMA_VERSION_UNKNOWN` at `/schemaVersion`. |

`assertValidFile` formats every `ValidationError` as `  <path> [<CODE>] <message>`, one per
line, and appends `hint` after the list. The return value is the input, cast to `TilesetFile`.

### Invariants it obeys

- **migrate before validate.** Rewriting a `schemaVersion` is a coercion, and `validate()` never
  coerces (source cites `06` §9.2).
- **The cast is the whole point.** A JSON import widens `schemaVersion` to `number`, so it never
  assigns to `TilesetFile` by itself. Validation is what earns the cast, and this module is the
  only place in the package that performs it.
- **One error format, not two.** `"unrecognized"` is reported by `validate()` and *alone* (cited
  as **C2**). It does not guess a version from the fields present.
- **Identity is preserved** for a current file. `<Tileset>` needs a stable reference, so nothing
  is cloned underneath the host.

### Callers

| Caller | Uses | Why |
| --- | --- | --- |
| `render/Tileset.svelte:222` | `assertValidFile` | In a `DEV` build only, `checked = assertValidFile(file, …, hint)`. Every later `$derived` reads `checked`, never `file`, so the assertion cannot be removed as dead code without also removing the data. In production it is skipped (cited as **S3**). |
| `render/TileDecoration.svelte` | (by reference) | Its comment describes the same `DEV`-only relationship. |
| Host apps | `loadTilesetFile` | The intended consumer path. |
| `apps/editor`: **not a caller** | — | `ImportPanel.svelte:183` calls `migrate()` and `validate()` itself. It needs `MigrationOutcome.steps` for its upgrade advisory (**E16**) and needs the structured errors to report each at its path. Throwing discards both. |

Callees: `migrate()` (`migrate.ts`), `validate()` and `SCHEMA_VERSION` (`validate.ts`).

**Bundle note** (`dev.ts`): importing `assertValidFile` into `<Tileset>` pulls in the whole of
`validate.ts`. Production builds drop it only because `DEV` is written so that Vite can fold it to
`false`.

### Tests: `load.test.ts`

The file tests **the sequence**, not the parts. `migrate.test.ts` and `validate.test.ts` own those.

- A current file is returned with `toBe` identity.
- A v1 file loads. This is the test that would fail if the order were reversed.
- `newer` names both versions and says *Upgrade the package*.
- An absent, string (`"2"`), or non-object `schemaVersion` reaches `validate()`'s codes
  (`SCHEMA_VERSION_MISSING`, `SCHEMA_VERSION_UNKNOWN`, `TYPE_MISMATCH`).
- Every error is reported, not only the first, and the caller's `label` appears in the message.
- `assertValidFile` does **not** migrate, so a v1 file throws `SCHEMA_VERSION_UNKNOWN`.
- `hint` comes after the error list. The root pointer `""` is shown as `/`.

### Gotchas & rejected alternatives

- **What it gives up.** Throwing discards `steps` and the structured errors. That is fine for a
  consumer and wrong for an editor, which is why both paths exist.
- **`label` is the caller's job.** The function cannot know which file it was handed, so the
  message names whatever the host passes, for example `"static/tileset.json"`.

### Review notes

- `load.ts` (docstring of `assertValidFile`) says *"`TilesetFile.schemaVersion` is the literal
  type `2`"*, but `types.ts:319` declares `schemaVersion: 4`. The comment is stale. The argument
  still holds; only the number is wrong.
- `load.test.ts:15` says *"A v2 file that validates clean"*. The fixture uses `SCHEMA_VERSION`,
  which is 4.
