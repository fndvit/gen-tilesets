---
title: advisories.ts
description: The editor's notices. Spec 09 §12.2's advisories and §12.3's asset failures, each detected by a pure function and written as a Notice.
sidebar:
  order: 16
---

**Written from:** `apps/editor/src/advisories.ts` and `advisories.test.ts`, and the call sites in
`App.svelte`, `lib/ImportPanel.svelte` and `lib/sections/SidebarTopBar.svelte`.

## Overview

The editor tells the author about things that are legal but worth knowing (spec `09` §12.2's
advisories), and about pictures that did not load (§12.3). This module works out each of them and
writes it as a notice (`notices.ts`) for the stack at the preview's top-right.

Every function here is pure. An advisory never blocks, never changes the file, and is never
styled as an error (**E16**). The package has no diagnostics helper, so these detections are the
editor's own.

Advisories 6 and 9 are not here. Each is about one control, so it is shown inline under that
control (`ui/Advisory.svelte`). Advisory 8 (a palette reordered under `random`) is retired: under
Random the palette list has no order to change (T0).

## In detail

### Public surface

| Export | Spec | Fires when |
| --- | --- | --- |
| `parityMismatch(file)` | advisory 1 | `columns` is even under `"column"` alignment, or odd under `"gutter"` |
| `narrowGrid(file)` | advisory 4 | `columns × cellSize < referenceWidth` |
| `inertReseed(file)` | advisory 2 | an Operation has `reseedOnLoad` over a Source that is not random (`reseed.ts` `inertFlags`) |
| `nonSquare(file)` | advisory 7 | an asset's `meta.width` and `meta.height` are both numbers and differ. An unmeasured asset is skipped |
| `orphanedNotice(orphans, { onOpen?, onRemove?, cameWithFile? })` | advisory 3, §9.4 | `orphans.ts` found Operations reaching fewer cells than authored. With `onOpen`, one "Open op-2" action per Operation, at most `MAX_OPEN_ACTIONS` (3). With `onRemove`, one "Remove N cells outside the grid" per painted list that has some (with "from op2" when two lists could be meant), at most 3 (batch 01, T-05). Operations in `cameWithFile` were already like this in the opened file: the title becomes "…has cells outside the grid" and the body does not mention Undo; when only some are, those are marked "(as opened)" and the body says where Undo helps |
| `assetFailures(failures)` | §12.3 | a picture failed to resolve or load. All failures go into one notice |
| `attachFailures(failures)` | §12.3 | files dropped or picked in Tiles did not attach. Pushed, one notice for the drop |
| `documentNotices(file, orphans, failures, orphanOptions?)` | | all of the above, failures first; `orphanOptions` (`OrphanOptions`) goes to `orphanedNotice` |
| `exportedEmpty` | advisory 5 | a constant notice, pushed after an export of a document that draws nothing |
| `importNotices({ upgrades, failed })` | §12.4 | an upgraded file (advisory), and pictures that could not be read (failure) |

Each notice's `signature` holds its details (the column count, the list of files, the orphan
counts), so a dismissed notice comes back when they change.

### Conditions and events

`documentNotices` is derived from the document every time it changes, so its notices go away by
themselves. `exportedEmpty` and `importNotices` follow an event that leaves no trace in the
document, so their callers push them. So does `attachFailures`: a file that never attached leaves
nothing in the document to derive it from.

Advisories 1, 2 and 4 can only arrive by import. Every edit to the cell size, design width or
alignment counts the columns again (`derive.ts`), and the editor only offers reseed on load over a
random Source. Advisory 1's and 4's text names those three fields. Rows and Y offset never change
the count (Stage 2 W5 corrected the earlier "any change in Grid & size").

### Callers / callees

Callers:
- `App.svelte` calls `documentNotices`;
- `lib/ImportPanel.svelte` calls `importNotices`;
- `lib/sections/SidebarTopBar.svelte` pushes `exportedEmpty`;
- `lib/sections/TilesSection.svelte` pushes `attachFailures`.

Callees: `reseed.ts` (`inertFlags`); the `Notice` type from `notices.ts` and the `Orphan` type from
`orphans.ts`.

### Tests

`advisories.test.ts`:
- a new document, and every derived column count, raise nothing;
- each detection fires on its condition and stays silent otherwise, including an unmeasured or
  string-sized asset for 7;
- the orphan wording and a signature that changes with the counts;
- no action without `onOpen`, and with it one "Open" per orphan, at most three;
- cells outside the grid (batch 01, T-05): after a resize here, today's title and Undo text plus
  "Remove N cells outside the grid"; after opening a file that holds them, no Undo and a title
  that says so; no Remove for a `rect`; "from op2" when two lists could be meant; the mixed case
  marks "(as opened)"; the signature changes with where the loss came from;
- `attachFailures`: nothing for no failures, one notice for many, singular and plural titles;
- failures collapse into one notice and come first;
- import notes, and a clean import that pushes nothing.

### Gotchas & rejected alternatives

- **A missing picture is reported once.** An import used to list "not in the archive" paths as
  well, but such an asset has no file, so it also fails to draw and §12.3 reports it. The import
  note was dropped. A zero-weight asset is never drawn, so a missing one goes unreported until
  export, which refuses with "no attached file".
- **Advisory 2 left the fresh-load hint.** It was a clause in a hover hint, which a keyboard user
  never saw. It is a notice now.
