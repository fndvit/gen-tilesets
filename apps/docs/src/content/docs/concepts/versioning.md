---
title: Versioning and invariant E2
description: The two version numbers a tileset file carries, how each is written, and why the editor can never stamp one it does not preview with.
sidebar:
  order: 6
---

**Written from:** `packages/tileset/src/validate.ts`, `packages/tileset/src/migrate.ts`,
`packages/tileset/src/types.ts`, `apps/editor/src/document.ts`, `apps/editor/src/export.ts`,
`apps/editor/vite.config.ts`, `packages/tileset/package.json`, `.github/workflows/publish.yml`,
`.github/workflows/ci.yml`. Concept page: it names no module of its own.

## Overview

Every tileset file carries two version numbers, and they answer different questions. The
**schema version** says which shape of file this is: which fields exist and what they may hold.
The **engine version** records which release of the package wrote the file. It is a note for
people, and nothing checks it.

The schema version is the one that matters when a file is opened. A file from an older release is
upgraded step by step to the current shape before it is checked. A file from a newer release is
refused with a message telling you to upgrade, because this build cannot know what the new fields
mean.

The engine version is only useful if it is true. The editor previews a file with one copy of the
package and stamps that same copy's version into everything it saves. The build reads the number
from the package itself, so there is nowhere a second copy could be typed in and fall out of step.
That rule is called invariant E2 throughout the source.

## In detail

### The two numbers

| Field | Type | Who writes it | Who reads it |
| --- | --- | --- | --- |
| `schemaVersion` | the literal `4` (`types.ts:319`) | the editor's `newDocument()` and every migration step | [`migrate()`](/api/index/functions/migrate/), then [`validate()`](/api/index/functions/validate/), which require it to equal [`SCHEMA_VERSION`](/api/index/variables/schema_version/) |
| `engineVersion` | `string` | the editor, from `ENGINE_VERSION` (`document.ts:131`, and again on export at `export.ts:75`) | nobody. `validate.ts:919–923` requires it to be present and a string, and checks nothing else |

`SCHEMA_VERSION` is declared once, at `validate.ts:96`, with its history in the comment: 4 since
0.8.0 (`translateX`/`translateY`), 3 since 0.7.0 (`responsive`), 2 from ADR-005 (`scale`).

### Migration

`MIGRATIONS` (`migrate.ts:80`) is an ordered table of adjacent steps, `1→2`, `2→3` and `3→4`. Each
of the three steps only rewrites the number. Each note says why: every change so far has *widened*
what a file may contain (a new target, a new optional array) and renamed nothing. The comments give
the reason for bumping anyway: an older engine meeting a file that *uses* the new feature should
refuse it **by version**, not with a confusing `OUT_OF_RANGE` error on a target it has never heard
of.

`migrate()` walks the table rather than indexing it, so a missing row is a refusal
(`"unrecognized"`) and never a silent skip. It reads the declared number strictly: `"1"` is not `1`.
See [migrate.ts](/engine/migrate/) and, for the order in which hosts must call it,
[load.ts](/engine/load/).

### Invariant E2: one pinned version

The comment in `apps/editor/vite.config.ts` defines it: *the editor's preview component and its
`engineVersion` writer come from a single pinned version of the engine and renderer package*. The
reason is quoted there and in `document.ts:84`: "An editor previewing with engine 1.5 while
stamping 1.4 shows the author a picture no consumer of that file will get."

How it is enforced:

1. `vite.config.ts` reads `packages/tileset/package.json` at config time and defines
   `__ENGINE_VERSION__` as its `version`.
2. `document.ts:90–91` declares that global and exports it as `ENGINE_VERSION`.
3. `newDocument()` writes it into `engineVersion` (`document.ts:131`). `serialize` stamps it
   again at export (`export.ts:75`), over the existing key so the key keeps its place, and leaves
   the in-memory document as imported. Its comment (`export.ts:57`) calls the stamp "truthful by
   construction rather than by being remembered".
4. `App.svelte:346` shows `ENGINE_VERSION` and the file's `schemaVersion` in the editor's footer.

No file contains the version number written out by hand. Adding one would be the second source of
truth that E2 exists to prevent.

**Review note: an imported file keeps its old stamp.** Construction only covers new documents. An
imported file is opened as it is (`session.svelte.ts:128`, `replaced(history, file)`). Nothing in
`apps/editor/src` writes `engineVersion` except `newDocument()`. So a file written by 0.6.0,
imported into the 0.8.0 editor, edited and exported, still says `"0.6.0"`. That is the case E2's
own quotation warns about. Also listed in [Review findings](/review-findings/). **Fixed in
0.8.1:** `serialize` stamps the current `ENGINE_VERSION` on every export.

### Releasing

`packages/tileset/package.json` is the only published package (`@fndvit/gen-tilesets`), and its
`version` field is the only place the release number is written. `.github/workflows/publish.yml` runs on any `v*` tag: it installs, runs `pnpm test` and
`pnpm typecheck`, then `pnpm --filter @fndvit/gen-tilesets publish` to GitHub Packages, with the
repository's own `GITHUB_TOKEN`. The tag does not set the version. The workflow publishes whatever
`package.json` says.

The workspace consumes the package's `src/` (its `exports`), and the tarball carries `dist/` (its
`publishConfig.exports`, built by `svelte-package`, with `files: ["dist"]`). So `pnpm dev` exercises
source, and a packaging mistake does not show there. `prepublishOnly` runs test, typecheck and build
for a local publish. `.github/workflows/ci.yml` builds the package on every push, which proves
`dist/` still builds. It does not prove that it installs.

### Gotchas

- **`engineVersion` is advisory on purpose.** Validation never compares it with anything, so a
  file written by 0.6.0 loads in 0.8.0 on the strength of its `schemaVersion` alone.
- **Changing output is not a schema change.** `schemaVersion` describes the file's *shape*. A
  release that changes what `generate()` draws for an unchanged file leaves it untouched. See
  [Determinism and positional hashing](/concepts/determinism/).
