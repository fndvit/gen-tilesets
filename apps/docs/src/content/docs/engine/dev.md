---
title: dev.ts
description: The DEV flag. Development-build detection written so that bundlers can fold it to false and drop every DEV-only branch.
sidebar:
  order: 14
---

**Written from:** `packages/tileset/src/dev.ts`, and the call sites in `registry/sources.ts`,
`render/Tileset.svelte`, `render/TileDecoration.svelte` and `registry/registry.test.ts`.

## Overview

The dev module answers one question: is this a development build or a production build? The
package behaves differently in each. In development it checks its inputs and its own arithmetic
and stops loudly when something is wrong. In production it skips those checks so that a visitor
never sees an error from them.

It reads the answer from the build tool when there is one, falls back to the Node environment
setting, and otherwise assumes production. The exact way the check is written matters: it is shaped
so the build tool can replace it with a constant and delete all the development-only code, which
keeps the published bundle small.

It is not part of the pipeline itself. It is a switch that load, generate and draw consult.

## In detail

### Purpose

`dev.ts` exports one boolean, `DEV`. The header describes it as a **provisional** answer to a
question the archived spec left open (how the component knows which build it is in): a bundler flag
ties the package to one toolchain, a prop invites a host to lie, and always throwing loses the
production posture. This reads the two signals mainstream toolchains set and defaults to off.

### Public surface

| Symbol | Type | Exported from `index.ts`? |
| --- | --- | --- |
| `DEV` | `boolean` | **no**, internal to the package |

`fromBundler` is a private `const`.

### Inputs → outputs

Evaluated once, at module load:

1. `fromBundler = import.meta.env && import.meta.env?.DEV`. Under Vite this becomes a literal.
2. If `fromBundler` is a boolean, `DEV` is that boolean.
3. Otherwise (no bundler, or a host defined `DEV` as a non-boolean): inside a `try`, read
   `globalThis.process?.env.NODE_ENV`. If defined, `DEV = NODE_ENV !== "production"`.
4. Otherwise, or if reading `process` throws, `DEV = false`.

### Invariants

- **Default is production.** A host that sets neither signal never throws in front of a visitor.
- **The bundler read must fold.** Vite substitutes `import.meta.env` with an object literal, after
  which the expression collapses to `false` and the `DEV` branches, and the modules only they
  reach, are dropped.
- **Both reads of `import.meta.env` stay inline**, with no `?.` on `import.meta` and no `try`
  around them. Each constraint was measured, per the comment:
  - hoisting the read into a `const` costs about 10 kB back, because esbuild does not propagate a
    literal through a binding;
  - a `try` block is opaque to dead-code elimination;
  - an optional chain on `import.meta` itself is text the substitution does not match.
- **None of those three is needed for safety.** `&&` short-circuits, and `import.meta` always
  exists because the package is ESM-only.

### Callers / callees

| Caller | Use |
| --- | --- |
| `registry/sources.ts:326` | `evalSource` throws if a Source returns outside `[0, 1]` (or non-finite). |
| `render/Tileset.svelte:158`, `:218`, `:260`, `:319`, `:329`, `:916`, `:934` | `DEV`-only checks and warnings, including the `assertValidFile` assertion (`:218`) and `rulesReshapeErrors` for host rules (`:260`). |
| `render/TileDecoration.svelte:83` | `reshapeErrors` check. |
| `registry/registry.test.ts:473` | Asserts a Source-range throw only when `DEV`. |

No caller in `apps/editor/src` or `apps/demo/src` (only a comment in
`apps/demo/src/Decorations.svelte:20`).

### Tests

No test file. Its folding behaviour is not testable in Vitest; the comment gives a manual gate:
build `apps/demo` and grep the output for a `validate.ts` string such as `SCHEMA_VERSION_MISSING`.
If it is present, the fold broke.

### Gotchas & rejected alternatives

- **Rejected: a `try`/`catch` IIFE around the bundler read.** No bundler folds it. With it,
  `apps/demo` built to 68.77 kB; with the current expression, 58.56 kB. The comment describes the
  difference as "3.2 kB of it gzipped, entirely unreachable". The old comment had claimed both branches were "statically analysable";
  the comment says they were not. These figures are the comment's own; they were not re-measured
  for this page.
- **The `NODE_ENV` fallback keeps its `try`.** It is only reached when the bundler signal is
  absent, so it costs nothing to fold, and `globalThis.process` is the one access that can be
  hostile.
- **If you edit this expression, re-measure.**

### Review notes

- The header says development builds "assert `0 <= t < 1` after every Source evaluation". The
  assertion it describes (`registry/sources.ts:326`) checks `t >= 0 && t <= 1`, and
  `generate.ts` and `mapping.ts` describe the bound as `[0, 1]` closed. The header is stale.
- The header says the re-measure gate "is in the plan and in `CHANGELOG.md`". Not checked here
  (Markdown files were out of scope for this page).
