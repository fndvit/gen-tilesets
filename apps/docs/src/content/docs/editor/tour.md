---
title: tour.ts
description: The onboarding tour's model. Its steps and text for a first visit and a replay, moving through them, the count, and the seen flag in localStorage.
sidebar:
  order: 94
---

**Written from:** `apps/editor/src/tour.ts`, `tour.test.ts`, and its caller `main.ts`.

## Overview

The tour (B-017) is drawn by `lib/Tour.svelte` (O3b). This module is its pure half: which steps a
run has, where a tour is, and whether it has been seen. It holds no Svelte and touches no DOM.

The steps and their text come from DESIGN_SYSTEM.md § "Onboarding: the tour", which is the source.
They are copied into the code, and no test pins the two together. To change the text, change the
doc first, then the code.

A **first visit** opens Collage and runs eight steps. A **replay** ("?") runs seven, because it
leaves out "An operation", which describes Collage's operation 4. A first visit whose Collage
failed to open runs as a replay ([first-visit.ts](/editor/first-visit/)).

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `TargetKey` | type | The `data-tour` value a step cuts out: `grid`, `tiles-add`, `tiles-header`, `tile-group`, `ops-add`, `op-example`, `preview`, `breakpoints`, `footer`. |
| `TourRun` | type | `"first"` or `"replay"`. |
| `TourStep` | interface | `{ id, title, text, targets, firstVisitOnly?, fallback? }`. `text` holds one string per paragraph. |
| `stepsFor(run)` | function | The run's steps, Welcome first: 8 or 7. |
| `TourState` | interface | `{ run, steps, index }`. Index 0 is Welcome. |
| `start(run)`, `current(state)` | functions | A tour on Welcome, and the step it is on. |
| `next(state)`, `back(state)` | functions | `next` returns `null` past the last step. `back` from Grid & size goes to Welcome, and from Welcome it stays put. |
| `count(state)` | function | "3 of 8". Welcome counts. |
| `isLast`, `primaryLabel`, `showsSkip` | functions | "Start tour" on Welcome, "Done" on the last step, "Next" otherwise. Skip tour is shown on every step but the last. |
| `SEEN_KEY` | const | `gen-tilesets.editor.tourSeen`. |
| `seenStore(storage?)` | function | `get()` and `set()` on `localStorage`, each behind a try/catch. |
| `end(seen)` | function | Ends a tour by Done, Skip tour or Esc alike. It sets the flag and returns `null`. |
| `isFirstVisit(kept, seen)` | function | `!kept && !seen`. |

### Behaviour

- **Welcome** has no target. Its text is the paragraph every run shares, then the run's own
  paragraph ("…The next seven steps…" or "The next six steps…").
- **Tile group** falls back to `tiles-header` when there are no groups (O0).
- **An operation** cuts out two targets: the opened card (`op-example`) and the picture (`preview`).
- **The seen flag never breaks the editor.** A missing or blocked `localStorage`, or one that throws
  on a read, reads as "not seen". A failed write is ignored, and the tour shows again on the next
  visit. `storage` is passed as a function, so that reaching `localStorage` at all is inside the try.

### Tests

`tour.test.ts`: both runs' step ids; Welcome's paragraphs; step 6's two targets and step 4's
fallback; the counts (Breakpoints is 7 of 8, or 6 of 7 on a replay); Back from Grid & size; the
labels and Skip on the last step; `end` sets the flag; a throwing store reads as not seen and never
throws; `isFirstVisit`'s four cases.

### Gotchas & rejected alternatives

- **Rejected: keeping the flag in IndexedDB** beside the kept tileset. It is one boolean read
  before mount, and a synchronous read keeps the boot path short.
- **Rejected: a test that checks the text against DESIGN_SYSTEM.md** (Pol, O3a plan).
