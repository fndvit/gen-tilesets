---
title: adopt.ts
description: Swaps a prepared document into the editor, with its pictures, an empty draft and fresh notices. The side-effecting half of opening, shared by Import and templates.
sidebar:
  order: 83
---

**Written from:** `apps/editor/src/adopt.ts`, and the call sites in `lib/ImportPanel.svelte` and
`lib/sections/NewTileset.svelte`. No test file.

## Overview

Opening a tileset happens in two halves. The first half checks the tileset and changes nothing.
This module is the second half. Once a tileset has passed every check, it puts it on screen: it
loads its pictures, makes it the open document, closes any half-edited operation and replaces
the notices.

Import uses it, and so does the New tileset popup for templates (B-016), so a template opens
exactly the way an exported zip of it would. Since S4a the tileset kept from the last visit
reopens through it too ([keeping](/editor/keeping/)).

In the editor's pipeline (**import** → document → draft/history → preview → export), it is the
last step of import.

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `adopt(prepared, how?)` | async function | Takes the `"ready"` case of [`Prepared`](/editor/import/) and swaps it in. Resolves when the pictures are attached and the document is open. `how` is `"open"` (default, undoable) or `"resume"` (a fresh history, for the kept tileset). |

### Inputs → outputs

1. `replaceAll(prepared.incoming)` ([assets.ts](/editor/assets/)) measures every picture and
   swaps the whole asset store. A picture that fails is reported, not fatal.
2. `session.open(prepared.file)`, or `session.resume` when `how` is `"resume"`
   ([session](/editor/session/)).
3. `drafting.discard()` ([drafting](/editor/drafting/)): a draft built against the outgoing
   document names ids the incoming one does not have.
4. `notices.clear()`, then each notice from `importNotices({ upgrades, failed })`
   ([advisories.ts](/editor/advisories/)): the upgrade advisory and the unreadable-pictures
   failure.

### Invariants

- **Only a `"ready"` result gets here.** The type takes `Extract<Prepared, { kind: "ready" }>`,
  so a refused file cannot reach the swap.
- **Missing or unreadable pictures are not a refusal.** The document opens. A picture that would
  not decode becomes a notice; one the archive did not carry is reported by the preview.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/ImportPanel.svelte` `open()` | after `prepareArchive` returns `"ready"` |
| `lib/sections/NewTileset.svelte` `confirm()` | after `loadTemplate` and `prepareArchive` return `"ready"` |
| `keeping.svelte.ts` `restore()` | `adopt(prepared, "resume")`, after `archiveOf` and `prepareArchive` |

Callees: `replaceAll`, `importNotices`, `session.open`, `session.resume`, `drafting.discard`, `notices.clear`,
`notices.push`.

### Tests

None. Every line calls a module that holds a rune, and Vitest runs without the Svelte plugin
(see `vitest.config.ts`). The pure half, `prepareArchive`, is tested in `import.test.ts`. The
Playwright probe in S3a imported Collage through this path.

### Gotchas & rejected alternatives

- **Plain `.ts`, not `.svelte.ts`.** It holds no rune of its own. The S3a plan named it
  `adopt.svelte.ts`, and that was changed when the code was written.
- **Undo after an open** has the gap [ImportPanel](/editor/import-panel/)'s review notes describe:
  `replaceAll` has already swapped the asset store.
