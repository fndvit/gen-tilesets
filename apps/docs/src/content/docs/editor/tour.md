---
title: tour.ts
description: The onboarding tour's model. Its steps and text for a first visit and a replay, the steps that rebuild Mosaic, moving through them, the count, and the seen flag in localStorage.
sidebar:
  order: 94
---

**Written from:** `apps/editor/src/tour.ts`, `tour.test.ts`, and its callers `main.ts`, `App.svelte`
(`stagedFile`), `lib/Tour.svelte` and `lib/sections/OperationsSection.svelte` (`mosaicOperations`).

## Overview

The tour (B-017) is drawn by [Tour.svelte](/editor/tour-dialog/), with its geometry in
[tour-layout.ts](/editor/tour-layout/). This module is its pure half: which steps a
run has, where a tour is, and whether it has been seen. It holds no Svelte and touches no DOM.

The steps and their text come from DESIGN_SYSTEM.md § "Onboarding: the tour", which is the source.
They are copied into the code, and no test pins the two together. To change the text, change the
doc first, then the code.

A **first visit** opens Mosaic and runs fourteen steps. Steps 5 to 11 (the **build**) empty the
preview and draw Mosaic again one operation at a time, with operation 1's card open at each of
its four steps (B-036, Pol 2026-11-12, after a novice user's test). A **replay** ("?") runs eight:
one short Operations step in place of the build, because it runs over whatever is open. Both end
on "Your own tileset", which points at New. A first visit whose Mosaic failed to open runs as a
replay ([first-visit.ts](/editor/first-visit/)), and so does one whose operations are not
Mosaic's three as the text describes them (`runFor`).

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `TargetKey` | type | The `data-tour` value a step cuts out: `grid`, `tiles-add`, `tiles-header`, `tile-group`, `ops-add`, `op-1`, `op-2`, `op-3`, `preview`, `breakpoints`, `footer`, `new`. |
| `TourRun` | type | `"first"` or `"replay"`. |
| `TourStep` | interface | `{ id, title, text, aside?, targets, build?, ops?, open?, fallback?, alone? }`. `build` marks steps 5 to 11; `ops` is how many operations the preview draws (absent: all); `open` is `{ op, stage }`, the card to open by its position among Mosaic's three and the step of it to show. `alone` is cut out by itself where the targets can't share the window (`oneWindow`). `text` holds one string per paragraph, with `**…**` marking a bold term. `aside` is a closing line, drawn in ink like the rest (no grey text in the tour, Pol 2026-11-10). |
| `Span` | interface | `{ text, strong, icon? }`: one piece of a paragraph. `icon: "info"` marks an `INFO` mark; `text` is then what a screen reader says ("information"). |
| `INFO` | const | `"ⓘ"`: where the text shows the (i) buttons' icon. `Tour.svelte` draws the editor's `info` icon in its place, not the font's glyph (Pol, 2026-11-10). |
| `spans(paragraph)` | function | The paragraph cut at its `**` marks, empty pieces left out, each `INFO` mark its own icon span. An odd number of `**` throws. |
| `plain(step)` | function | The step's text without marks, the aside last: what the live region says. |
| `stepsFor(run)` | function | The run's steps, Welcome first: 14 or 8. |
| `TourState` | interface | `{ run, steps, index }`. Index 0 is Welcome. |
| `start(run)`, `current(state)` | functions | A tour on Welcome, and the step it is on. |
| `next(state)`, `back(state)` | functions | `next` returns `null` past the last step. `back` from Grid & size goes to Welcome, and from Welcome it stays put. |
| `count(state)` | function | "3 of 14". Welcome counts. |
| `isLast`, `primaryLabel`, `showsSkip` | functions | "Start tour" on Welcome, "Done" on the last step, "Next" otherwise. Skip tour is shown on every step but the last. |
| `showsSkipOperations(state)`, `skipOperations(state)` | functions | Skip operations is shown on the build steps only. It goes to the first step past the build, Breakpoints; Back from there goes to Operation 3, as after Next. Off the build it does nothing. |
| `SEEN_KEY` | const | `gen-tilesets.editor.tourSeen`. |
| `seenStore(storage?)` | function | `get()` and `set()` on `localStorage`, each behind a try/catch. |
| `end(seen)` | function | Ends a tour by Done, Skip tour or Esc alike. It sets the flag and returns `null`. |
| `isFirstVisit(kept, seen)` | function | `!kept && !seen`. |
| `mosaicOperations(operations)` | function | Mosaic's three ids in order (`op1`, `op4`, `op5`) when the file's operations are exactly those three, each with one selection layer of the kind, and the Source and Attribute, the build steps' text describes. Otherwise `null`. |
| `runFor(run, operations)` | function | The run a tour starts as: `"first"` with no Mosaic (`mosaicOperations` is `null`) becomes `"replay"`. |
| `stagedFile(file, kept)` | function | The file with only its first `kept` operations, as a build step's preview draws it. The same object when nothing is cut. |

### Behaviour

- **Welcome** has no target. Its text is the two paragraphs every run shares, then the run's own
  line as its aside ("…The next thirteen steps…" or "The next seven steps…").
- **Bold** (Pol, O3c): the text is split into a lead and short paragraphs, each opening with the
  control it is about in `**…**`. The strings stay plain so they read beside the doc's table, and
  a term can sit mid-sentence, which a `{ term, text }` record could not hold. Rejected: HTML in the
  strings and `{@html}`, an injection path for two tags.
- **Your own tileset** is the last step in both runs, and points at the top bar's New. Its text
  names Mosaic on the first visit ("…or close this and keep exploring Mosaic."). On a replay it
  says "…keep working on this one.", because a replay runs over whatever is open (Pol, after O3a).
- **Tile group** falls back to `tiles-header` when there are no groups (O0). A build step falls
  back to `ops-add` when its card isn't drawn.
- **The build** (steps 5 to 11): step 5 points at the Operations "+" and empties the picture
  (`ops: 0`); steps 6 to 9 open operation 1 at Selection, Pattern, Attribute and Blend, drawing it
  from Attribute on (`ops: 1`); steps 10 and 11 point at operations 2 and 3's closed cards and add
  each (`ops: 2`, `ops: 3`). Each picture is exactly the finished one's first layers, because the
  engine hashes by position and each operation has its own salt (tested against the real Mosaic).
  The stage is a function of the step, so Back rewinds it with no state of its own. Rejected: a
  sub-tour with its own index, which would need its own Back and count.
- **Every build step cuts out two targets**, what it is about and the picture (`preview`).
  Stacked, where the two can't be seen in one window, it cuts out the picture alone
  (`alone: "preview"`, Pol, O4): it shows what the text is about, and an open card, still open, is
  what draws the selection marking.
- **`mosaicOperations` checks position and kind, not ids alone,** so a Mosaic edited later can't
  have the tour describe operations it no longer has. Rejected: by id alone, which survives a
  reorder that makes "operation 2" wrong.
- **The seen flag never breaks the editor.** A missing or blocked `localStorage`, or one that throws
  on a read, reads as "not seen". A failed write is ignored, and the tour shows again on the next
  visit. `storage` is passed as a function, so that reaching `localStorage` at all is inside the try.

### Tests

`tour.test.ts`: both runs' step ids (fourteen and eight); Welcome's paragraphs and aside; every
step's marks balanced; the fallbacks; the build: steps 5 to 11 of the first visit only, the
picture's stages, operation 1 open at each of its four steps, the two targets and the picture
alone, everything drawn off the build; Skip operations shown on the build only, landing on
Breakpoints from every build step with Back to Operation 3, and doing nothing off it; the counts
(Breakpoints is 12 of 14, or 6 of 8 on a replay); Back from Grid & size; the labels and Skip on the
last step; `end` sets the flag; a throwing store reads as not seen and never throws;
`isFirstVisit`'s four cases; `mosaicOperations` on Mosaic, and `null` for a reordered, missing,
added or changed operation; `runFor`; `stagedFile`, and the real Mosaic drawn one operation at a
time equal to the finished picture's first layers; `spans` (no marks, a term mid-sentence, a
leading term, an info mark as an icon span, a term left open throws); `plain` with and without an
aside.

### Gotchas & rejected alternatives

- **Rejected: keeping the flag in IndexedDB** beside the kept tileset. It is one boolean read
  before mount, and a synchronous read keeps the boot path short.
- **Rejected: a test that checks the text against DESIGN_SYSTEM.md** (Pol, O3a plan).
