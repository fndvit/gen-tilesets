---
title: notices.ts
description: Which notices to show, keyed by condition. Dismissing a notice hides it until its details change; the state lives in notices.svelte.ts.
sidebar:
  order: 15
---

**Written from:** `apps/editor/src/notices.ts`, `apps/editor/src/notices.svelte.ts` and
`notices.test.ts`.

## Overview

Notices are how the editor tells the author something without stopping them (spec `09` §12).
These two modules decide which notices to show. `ui/Notice.svelte` draws one.

A notice comes from one of two places:
- A **condition** is worked out from the document every time it changes, for example an
  operation left outside the grid. It goes away by itself when the document no longer has it.
- A **pushed** notice follows an event that leaves no trace in the document, such as an import's
  notes. It stays until it is dismissed or the document is replaced.

Notices are **keyed by condition, not by text**. Dismissing one hides it while its condition
holds unchanged. If the details change (more cells are outside the grid), or the condition goes
away and later returns, it shows again. Nothing counts or badges dismissed notices (Pol, W0).

## In detail

### `notices.ts` (logic, tested)

| Export | Meaning |
| --- | --- |
| `Notice` | `key` (which condition), `signature` (its details, default `""`), `kind`, `title`, and optionally `data`, `body`, `actions`. |
| `NoticeKind` | `"advisory"` (§12.2, never an error, **E16**) or `"failure"` (§12.3). |
| `NoticeAction` | `{ label, run }`, a tertiary button on the notice. |
| `dismissalId(notice)` | What a dismissal records: the key and the signature. |
| `upsert(list, notice)` | Adds a notice, or replaces the one with its key in place. |
| `visible(all, dismissed)` | One notice per key (the first), dismissed ones left out. Failures come first, then advisories, each in the order given. |
| `prune(all, dismissed)` | Drops the dismissals whose condition no longer holds exactly. It returns the same set when nothing changes. |

### `notices.svelte.ts` (state, no logic)

`export const notices`, over two `$state` variables (the pushed list and the dismissed set):

| Member | Meaning |
| --- | --- |
| `push(notice)` | Shows a notice after an event. A notice with the same key is replaced. |
| `dismiss(notice)` | Removes a pushed notice, or records a condition's dismissal. |
| `shown(conditions)` | What to show: `visible` over the conditions, then the pushed notices. |
| `forget(conditions)` | `prune`, for the caller to run from an effect whenever the conditions change. |
| `clear()` | Called on New and on import: no pushed notices, no dismissals. |

It is split in two for the same reason as `drafting.svelte.ts`: Vitest runs without the Svelte
plugin, so a test cannot import a module that holds a rune.

### Callers / callees

Callers of `notices.svelte.ts`: `App.svelte` (`shown`, `forget`, `dismiss`, `clear`),
`lib/ImportPanel.svelte` (`clear`, `push`), `lib/sections/SidebarTopBar.svelte` (`push`).
Callees: none.

### Tests

`notices.test.ts`:
- `upsert` appends, and replaces a key in place.
- `visible` orders failures first, keeps one notice per key, hides a dismissed notice, and brings
  it back when its signature changes.
- `prune` forgets a dismissal once its condition is gone, and returns the same set when nothing
  changes.

### Gotchas & rejected alternatives

- **Conditions are not stored.** Keeping them in state would mean clearing each one by hand when
  the document changes. Deriving them means they can never go stale.
- **Keyed by text was rejected.** Rewording a message would bring back notices the author had
  dismissed, and two different conditions with the same words would hide each other.
