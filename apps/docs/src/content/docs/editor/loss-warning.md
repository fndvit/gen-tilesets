---
title: LossWarning.svelte
description: The line that says the current tileset will be lost for good. Shared by the New tileset popup and Import's question.
sidebar:
  order: 87
---

**Written from:** `apps/editor/src/lib/LossWarning.svelte`, and the call sites in
`lib/ImportPanel.svelte` and `lib/sections/NewTileset.svelte`.

## Overview

New tileset and Import both replace the open tileset. Neither can be undone (`session.reset`,
`session.open`), so both warn in the same words: **"Everything in the current tileset is lost, and
it can't be undone."** Export it first to keep it.

## In detail

- No props. It is one `.t-body` paragraph in ink: an `alert` icon, then the bold first sentence
  and the second sentence.
- The red is only on the icon, and the words carry the danger, as `ui/Dialog.svelte` asks.
- It is sized to fit on one line in a `wide` Popup (592px, [Dialog](/editor/ui-dialog/)), so the
  two sentences are read together. A narrow window wraps it (`overflow-wrap: anywhere`).
- **Why a component:** the alert icon and the bold sentence were added at Pol's request
  (2026-11-09), because the plain body line was easy to read past. Two copies of the markup could
  drift apart.
