---
title: sections/randomness-explainer.ts
description: The text of the "How randomness works" popover in the Randomness footer.
sidebar:
  order: 47
---

**Written from:** `apps/editor/src/lib/sections/randomness-explainer.ts`, `randomness-explainer.test.ts`, and its call site
in `SidebarFooter.svelte`.

## Overview

`RANDOMNESS_EXPLAINER` is an `ExplainerContent` (`lib/ui/explainer.ts`): the text the
[Explainer](/editor/ui-explainer/) popover shows. Data, so the popover stays a frame that knows
nothing about what it explains; [noise-explainer.ts](/editor/ui-explainer/) is the pattern.

Batch 01, T-07 (B-019). The text is exactly what Pol approved in D-04 (A). Each part is a `params`
row (a name over a muted explanation). There are no measured figures, so `shares` is empty and the
popover draws no bars.

Each control that draws again is a row, named as the editor labels it: Seed, Re-seed (on an
operation's card), Reroll assets, and Assets on load / Reseed on load.

### Tests

`randomness-explainer.test.ts`: the rows' names, in order; no bars.
