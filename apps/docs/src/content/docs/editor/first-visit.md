---
title: first-visit.ts
description: On a first visit, opens Mosaic before the editor mounts, and decides whether the tour runs as a first visit or as a replay.
sidebar:
  order: 95
---

**Written from:** `apps/editor/src/first-visit.ts`, `first-visit.test.ts`, and its caller `main.ts`.

## Overview

On a first visit (nothing kept, tour not seen: `isFirstVisit` in [tour.ts](/editor/tour/)),
`main.ts` opens Mosaic before it mounts the editor (B-017, O0). Mosaic opens the way New → From
template opens it, through `loadTemplate` → `prepareArchive` → `adopt` ([adopt.ts](/editor/adopt/)).
So it opens exactly as an import of it would, and `session.open` starts a fresh history: Undo
cannot go back to the empty skeleton.

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `FIRST_VISIT_TEMPLATE` | const | `"mosaic"`. |
| `FirstVisitDeps` | interface | `{ manifest, loadTemplate, prepare, adopt, push }`. The real ones are bound in `main.ts`. |
| `firstVisitFailedNotice(data)` | function | The failure notice "The example tileset couldn't be opened", with the reasons as data. |
| `openFirstVisit(deps)` | async function | Opens Mosaic. Returns `"first"` if it opened. Otherwise it pushes the notice and returns `"replay"`. Never throws. |

### Behaviour

- **By id.** The template is found by its id, not by its place in the manifest, because step 6 of
  the tour describes Mosaic.
- **Any failure is one notice.** That covers the manifest failing, no Mosaic listed, a picture
  failing, a newer or invalid file, and `adopt` throwing. The editor stays empty and the tour runs
  as a replay. New → From template reports the same refusals in a Popup, because there the author
  asked for the template. On a first visit nobody asked, and a Popup would stand in front of the
  tour.

### Callers / callees

| Caller | Use |
| --- | --- |
| `main.ts` | After `keeping.restore()`, when `isFirstVisit`. The run it returns goes to `App` as the `tourRun` mount prop. |

### Tests

`first-visit.test.ts`: it opens Mosaic by id and runs as a first visit; each failure pushes one
notice with its reason and runs as a replay; the notice's signature follows its reasons.
