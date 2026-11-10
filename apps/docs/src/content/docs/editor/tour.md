---
title: tour.ts
description: The onboarding tour's model. Its steps and text for a first visit and a replay, moving through them, the count, and the seen flag in localStorage.
sidebar:
  order: 94
---

**Written from:** `apps/editor/src/tour.ts`, `tour.test.ts`, and its caller `main.ts`.

## Overview

The tour (B-017) is drawn by [Tour.svelte](/editor/tour-dialog/), with its geometry in
[tour-layout.ts](/editor/tour-layout/). This module is its pure half: which steps a
run has, where a tour is, and whether it has been seen. It holds no Svelte and touches no DOM.

The steps and their text come from DESIGN_SYSTEM.md § "Onboarding: the tour", which is the source.
They are copied into the code, and no test pins the two together. To change the text, change the
doc first, then the code.

A **first visit** opens Collage and runs nine steps. A **replay** ("?") runs eight, because it
leaves out "An operation", which describes Collage's operation 4. Both end on "Your own tileset",
which points at New. A first visit whose Collage
failed to open runs as a replay ([first-visit.ts](/editor/first-visit/)).

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `TargetKey` | type | The `data-tour` value a step cuts out: `grid`, `tiles-add`, `tiles-header`, `tile-group`, `ops-add`, `op-example`, `preview`, `breakpoints`, `footer`, `new`. |
| `TourRun` | type | `"first"` or `"replay"`. |
| `TourStep` | interface | `{ id, title, text, aside?, targets, firstVisitOnly?, fallback? }`. `text` holds one string per paragraph, with `**…**` marking a bold term. `aside` is a closing line, drawn muted. |
| `Span` | interface | `{ text, strong }`: one piece of a paragraph. |
| `spans(paragraph)` | function | The paragraph cut at its `**` marks, empty pieces left out. An odd number of marks throws. |
| `plain(step)` | function | The step's text without marks, the aside last: what the live region says. |
| `stepsFor(run)` | function | The run's steps, Welcome first: 9 or 8. |
| `TourState` | interface | `{ run, steps, index }`. Index 0 is Welcome. |
| `start(run)`, `current(state)` | functions | A tour on Welcome, and the step it is on. |
| `next(state)`, `back(state)` | functions | `next` returns `null` past the last step. `back` from Grid & size goes to Welcome, and from Welcome it stays put. |
| `count(state)` | function | "3 of 9". Welcome counts. |
| `isLast`, `primaryLabel`, `showsSkip` | functions | "Start tour" on Welcome, "Done" on the last step, "Next" otherwise. Skip tour is shown on every step but the last. |
| `SEEN_KEY` | const | `gen-tilesets.editor.tourSeen`. |
| `seenStore(storage?)` | function | `get()` and `set()` on `localStorage`, each behind a try/catch. |
| `end(seen)` | function | Ends a tour by Done, Skip tour or Esc alike. It sets the flag and returns `null`. |
| `isFirstVisit(kept, seen)` | function | `!kept && !seen`. |
| `exampleOperation(operations)` | function | The id "An operation" opens: the 4th operation, if it is `op6` with a rectangle Selection, as in Collage. Otherwise `null`. |

### Behaviour

- **Welcome** has no target. Its text is the two paragraphs every run shares, then the run's own
  line as its aside ("…The next eight steps…" or "The next seven steps…").
- **Bold** (Pol, O3c): the text is split into a lead and short paragraphs, each opening with the
  control it is about in `**…**`. The strings stay plain so they read beside the doc's table, and
  a term can sit mid-sentence, which a `{ term, text }` record could not hold. Rejected: HTML in the
  strings and `{@html}`, an injection path for two tags.
- **Your own tileset** is the last step in both runs, and points at the top bar's New. Its text
  names Collage on the first visit ("…or close this and keep exploring Collage."). On a replay it
  says "…keep working on this one.", because a replay runs over whatever is open (Pol, after O3a).
- **Tile group** falls back to `tiles-header` when there are no groups (O0). **An operation** falls
  back to `ops-add` when Collage's operation 4 isn't there (`exampleOperation` is `null`), so a
  Collage edited later can't have the tour open a card its text doesn't describe.
- **An operation** cuts out two targets: the opened card (`op-example`) and the picture (`preview`).
- **The seen flag never breaks the editor.** A missing or blocked `localStorage`, or one that throws
  on a read, reads as "not seen". A failed write is ignored, and the tour shows again on the next
  visit. `storage` is passed as a function, so that reaching `localStorage` at all is inside the try.

### Tests

`tour.test.ts`: both runs' step ids; Welcome's paragraphs and aside; every step's marks balanced;
`spans` (no marks, a term mid-sentence, a leading term, a term left open throws); `plain` with and
without an aside; step 6's two targets and the two
fallbacks; the last step's target and its two texts; the counts (Breakpoints is 7 of 9, or 6 of 8 on a replay); Back from Grid & size; the
labels and Skip on the last step; `end` sets the flag; a throwing store reads as not seen and never
throws; `isFirstVisit`'s four cases; `exampleOperation` on Collage, and `null` for a reordered stack, a
non-rectangle op6, or too few operations.

### Gotchas & rejected alternatives

- **Rejected: keeping the flag in IndexedDB** beside the kept tileset. It is one boolean read
  before mount, and a synchronous read keeps the boot path short.
- **Rejected: a test that checks the text against DESIGN_SYSTEM.md** (Pol, O3a plan).
