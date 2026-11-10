---
title: keeping.svelte.ts
description: Reopens the kept tileset before the editor mounts, and saves the open tileset each time it changes, one write at a time.
sidebar:
  order: 92
---

**Written from:** `apps/editor/src/keeping.svelte.ts`, and its call sites in `main.ts` and
`App.svelte`. No test file.

## Overview

The stateful half of [keep.ts](/editor/keep/). It holds the store, what was last written, and one
rune: the "Changes won't be kept across reloads" condition.

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `keeping.restore()` | async method, `Promise<boolean>` | Opens the store and reopens what it kept. Never throws. Returns whether the store **held** a tileset, opened or refused. |
| `keeping.schedule(file)` | method | Saves `file` now, or as soon as the write in flight ends. |
| `keeping.notice` | getter, `Notice \| null` | The "won't be kept" condition, or `null`. |

### Behaviour

- **Reopened before mount.** `main.ts` awaits `restore()` and then mounts `App`, so the empty
  skeleton never flashes and never reaches undo. `restore` runs `prepareArchive`, then
  `adopt(prepared)` ([adopt.ts](/editor/adopt/)), which calls `session.open`: a fresh
  history ([session](/editor/session/)).
- **A refusal** (newer, invalid, unreadable) leaves the empty document and pushes
  `refusedNotice`.
- **The return value is for the first visit** ([tour.ts](/editor/tour/) `isFirstVisit`). It is
  `true` for a refused tileset too, so that Collage does not open over it. Opening Collage would
  clear the refusal's notice, and its first save would overwrite the kept file.
- **Saved at once, one write at a time.** `App.svelte` calls `schedule(session.file)` from an
  effect. With no write in flight it writes at once; otherwise it keeps only the newest document
  and writes it next. A slider drag costs a few writes, and writes never overlap.
- **Storage blocked or a save refused:** `notice` is set and shown as a condition, so New and
  Import (which clear pushed notices) do not hide it. A later successful save clears it.
- **The document is a `$state` proxy**, which IndexedDB cannot clone, so it is written as
  `$state.snapshot(file)`.

### Callers / callees

| Caller | Use |
| --- | --- |
| `main.ts` | `keeping.restore()`, then the first visit ([first-visit.ts](/editor/first-visit/)) if nothing was held, then `mount(App)` |
| `App.svelte` | `$effect(() => keeping.schedule(session.file))`; `keeping.notice` joins the conditions |

Callees: `openStore`, `savePlan`, `afterSave`, `isNoop`, `archiveOf`, `refusedNotice`,
`notKeptNotice` ([keep.ts](/editor/keep/)), `prepareArchive`, `adopt`, `stored`, `notices.push`.

### Tests

None here, for the reason [drafting](/editor/drafting/) gives. The rules are in `keep.test.ts`.
Checked in the browser (S4a): a template, an upload group and a New all survive a reload; Tab then
an instant reload keeps the edit; a deleted variant's picture leaves the store; Export before and
after a reload are byte-identical; a newer kept file gives the notice and an empty tileset; blocked
storage gives the condition and editing still works.

### Gotchas & rejected alternatives

- **Rejected: a 400 ms debounce with a save on `pagehide`.** A reload inside the wait depends on a
  write begun while the page unloads. In the browser, Tab then an instant reload lost the edit until
  `keep.ts` committed each transaction explicitly; writing at once removes the wait as well.
