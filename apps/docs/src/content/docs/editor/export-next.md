---
title: export-next.ts
description: What "Your tileset is downloading" says after a zip export, its "Don't show again" flag, and the copy of the install command.
sidebar:
  order: 16
---

**Written from:** `apps/editor/src/export-next.ts`, `export-next.test.ts`, and its caller
`lib/sections/SidebarTopBar.svelte`.

## Overview

After **Export** writes `tileset.zip`, the [sidebar top bar](/editor/sidebar-top-bar/) opens a
window, "Your tileset is downloading", that says in general terms how to put the file on a
website (batch 03, T-08, B-030). This module holds the parts of it that may change or that need
testing: the install command, the guide's address, the copy, and the "Don't show again" flag.

It shows on every zip export until the user presses **Don't show again** (Pol, D-06 B): someone
exporting over and over shouldn't close it forever, but it shouldn't vanish before they chose to
stop it.

## In detail

### Public surface

| Export | What |
| --- | --- |
| `GETTING_STARTED_URL` | The getting-started guide's source on GitHub. No docs site is deployed, so it links the way the package README does; one constant, so a docs site changes it in one place. |
| `INSTALL_COMMAND` | `npm install @vit-foundation/gen-tilesets`. The name, no version: npm writes the current one into the user's `package.json`, and consumers pin it from there. |
| `HIDE_KEY` | `gen-tilesets.editor.exportNextHidden`, namespaced like the tour's `SEEN_KEY`. |
| `hideStore(storage?)` | `{ get(), set() }`: `get()` is true once Don't show again was pressed; `set()` records it. |
| `CopyState`, `COPY_LABELS` | `"idle" \| "copied" \| "failed"` and the button's words: Copy, Copied, Couldn't copy. |
| `copyText(text, clipboard?)` | Writes `text` to the clipboard and resolves to the `CopyState`. Never rejects. |

### Invariants

- **Storage never breaks an export.** Every access to `localStorage`, reaching it included, is
  inside a try, as in `seenStore` ([tour.ts](/editor/tour/)). A blocked store reads as "not
  hidden", so the window keeps showing; a failed write is ignored.
- **A refused clipboard is a state, not an error.** The Clipboard API is missing outside a secure
  context and rejects without permission; `copyText` says "failed" instead, and the command stays
  on screen as selectable text.

### Tests

`export-next.test.ts`: the flag is off until set and survives a second store on the same storage
(a reload); its key differs from the tour's; a blocked or throwing store reads as not hidden and
never throws. `copyText` writes and says Copied, and says failed with no clipboard, a refusal, or
a throw. `INSTALL_COMMAND` names the package in `packages/tileset/package.json`, and
`GETTING_STARTED_URL` points at a file that exists in the repository.

### Gotchas

- 0.12.0 is the first version of the package on npm, so the command works from 0.12.0 on. Before
  that release the window showed a command that failed.
