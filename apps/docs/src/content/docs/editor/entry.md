---
title: entry.svelte.ts
description: Whether the author is in the middle of entering a value, so warnings wait until it is committed.
sidebar:
  order: 17
---

**Written from:** `apps/editor/src/entry.svelte.ts`, and the call sites in `App.svelte` and
`lib/ui/Advisory.svelte`. No test file.

## Overview

A numeric field commits on every keystroke that parses (**E5**), and a range input on every step
of a drag. So the document, and everything worked out from it, changes while the author is still
typing or dragging.

Warnings must wait until the value is committed, so the author is not interrupted twice (Pol,
Stage 2 W1, 2026-11-06). This module knows when an entry is under way. While it is, the notice
stack and the inline advisories keep their last state.

## In detail

### Public surface

`export const entry`:

| Member | Meaning |
| --- | --- |
| `active` | True from the first `input` until the value is committed. |
| `input(event)` | Starts an entry when the target is an `<input>`, a `<textarea>` or a contenteditable. |
| `done()` | Ends it. Wired to `change` and `focusout`. |
| `keydown(event)` | Ends it on Enter or Escape. |

### Inputs → outputs

`App.svelte` wires it on `<svelte:window oninputcapture onchange onfocusout onkeydown>`.
- `App.svelte` copies `documentNotices` into `conditions` only while `active` is false.
- `ui/Advisory` copies its `when` into `shown` only while `active` is false.

### Callers / callees

Callers: `App.svelte`, `lib/ui/Advisory.svelte`. No callees.

### Tests

None: it holds a rune, and the vitest config cannot load one. It was checked in the editor:
- typing a cell size that clears advisory 4 leaves the notice in place until Tab;
- typing 270 into a rotation range leaves advisory 9 until Enter.

### Gotchas & rejected alternatives

- **`input` is captured, not bubbled.** The field's own handler commits the value, and Svelte's
  delegated handler runs before a bubbling listener on `window`. With a bubbling listener, the
  document had already changed by the time `active` was set, so the stack updated mid-typing.
- **Not a debounce.** Waiting a fixed time after the last keystroke would still interrupt a slow
  typist, and would delay a warning after a click for no reason.
