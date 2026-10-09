---
title: registry.ts
description: The Registry class and the parameter-schema types shared by the Selection, Source and Blend registries.
sidebar:
  order: 22
---

**Written from:** `packages/tileset/src/registry/registry.ts`, `registry/registry.test.ts`, and
the call sites in `registry/selections.ts`, `registry/sources.ts`, `registry/blends.ts`,
`validate.ts`, `index.ts` and the editor's controls.

## Overview

The registry is a lookup table of named building blocks. A tileset file refers to its building
blocks by name: which cells to affect, where the numbers come from, how to combine them. Each
name has to resolve to real code. This module defines the table that does that resolution.

It also defines how a building block describes its settings, as plain data rather than code. That
lets three different consumers read the same description: the validator checks a file against it,
the editor builds a control for each setting from it, and the generator receives the values.

There are three tables, one each for Selections, Sources and Blends, each defined in its own file
on top of this one. They sit beside the pipeline rather than in it: validate and generate both
look names up here.

## In detail

### Purpose

`registry.ts` provides a minimal generic `Registry<Entry>` keyed by `entry.name`, and the
`ParamSpec`/`ParamSchema` types. There is **no public registration API**: the header says the
engine is developed in this repository and consumed by pinning a version, so a new Source is added
as a source file, a table entry, a commit and a release (cites `05` §3).

### Public surface

Exported from `index.ts:102`.

| Symbol | Kind | Meaning |
| --- | --- | --- |
| [`Registry`](/api/index/classes/registry/) | class | `new Registry(kind)` where `kind` is `"selection" \| "source" \| "blend"`. Methods: `register`, `get`, `has`, `names`, `all`. |
| [`ParamSpec`](/api/index/type-aliases/paramspec/) | union | One parameter's spec; see below. |
| [`ParamSchema`](/api/index/type-aliases/paramschema/) | `Record<string, ParamSpec>` | A type's parameters by name. |
| `Registration<Impl>` | interface | `{ name, params, impl }`. Exported from this file but not re-exported by `index.ts`, and nothing imports it. |

`ParamSpec` variants:

| `type` | Fields | Notes |
| --- | --- | --- |
| `"number"` | `min?`, `max?`, `exclusiveMin?`, `exclusiveMax?`, `default?` | Inclusive and exclusive bounds are separate fields. |
| `"integer"` | `min?`, `max?`, `default?` | |
| `"enum"` | `values: (string \| number)[]`, `default?` | |
| `"cellList"` | none | A list of `[x, y]` pairs. Has no `default`; absent means empty. |

### Inputs → outputs

| Method | Behaviour |
| --- | --- |
| `register(entry)` | Adds it. **Throws** if the name is already taken: `` `<kind> "<name>" is already registered. 05 X4: …` ``. |
| `get(name)` | Returns the entry. **Throws** on an unknown name: `` `Unknown <kind> type "<name>" (05 X7). Registered: …` `` listing every registered name. |
| `has(name)` | Boolean, never throws. |
| `names()` | Names in registration order. |
| `all()` | Entries in registration order. |

Entries are held in a private `Map`, so order is insertion order.

### Invariants

- **X4: no silent overwrite.** Registering an occupied name throws. The source's reason: silent
  overwrite would make load order decide what a config means.
- **X7: an unknown type is a failure.** `get` never substitutes a default. The source notes that
  in a validated config this throw is unreachable: `validate()` raises `UNKNOWN_TYPE_NAME` first,
  "and that is the whole of X7's enforcement". The throw is the undefined-behaviour edge **C5**
  describes.
- **Names are unique within a kind, not globally.** `random` is both a Selection and a Source; they
  live in different registries and take different parameters.
- **Parameter schemas are data**, so they can be walked (validate, editor) as well as used.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `registry/selections.ts:23`, `registry/sources.ts:33`, `registry/blends.ts:27` | `Registry` (each builds one instance), `ParamSchema` |
| `validate.ts:37` | `ParamSchema`, `ParamSpec` types, to walk a tagged object's parameters |
| `apps/editor/src/draft.svelte.ts:119` | `ParamSchema`, in `defaultParams` |
| `apps/editor/src/controls/affordance.ts:73–158` | `ParamSpec`, in `affordanceFor`, `defaultFor`, `admits` |
| `apps/editor/src/controls/ParamFields.svelte:16`, `ParamControl.svelte:15` | `ParamSchema` / `ParamSpec` as prop types |
| `index.ts:102` | re-export |

The registry methods are called on the three instances; see [selections.ts](/engine/selections/),
[sources.ts](/engine/sources/) and [blends.ts](/engine/blends/) for those call sites.

Callees: none.

### Tests

`registry/registry.test.ts`, block "the registry — 05 §5":

- A fresh `Registry` throws `/already registered/` on a duplicate name.
- `sources.get("simplexNoise")` and `selections.get("and")` throw `/Unknown source/` and
  `/Unknown selection/`.
- `random` is registered as both a Selection and a Source.

`names()` and `all()` are exercised indirectly by the preset tests in the same file and by
`mapping.test.ts`. `apps/editor/src/controls/affordance.test.ts` walks every registered type's
`ParamSchema`.

### Gotchas & rejected alternatives

- **No public registration API**, on purpose. A consumer cannot add a Source; that is a change to
  this package.
- **Schemas as data, not validator functions.** The comment on `ParamSpec`: "three consumers read
  it, one runs it." A function can be called but not walked.

### Review notes

- `Registration<Impl>` (`registry.ts:20`) is exported but has no users. Each registry file
  declares its own registration interface instead. It looks like dead code.
- `registry.ts:30` attributes the tolerated `random` name collision to *"`CONVENTIONS.md`
  §10.3"*; the matching test (`registry.test.ts:39`) cites *"01 §10.3"*. The two citations
  disagree. (Not followed; this note is only about the inconsistency.)
