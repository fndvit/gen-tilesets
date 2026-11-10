---
title: sections/tiles-explainer.ts
description: The text of the "How tiles work" popover in the Tiles header.
sidebar:
  order: 47
---

**Written from:** `apps/editor/src/lib/sections/tiles-explainer.ts`, `tiles-explainer.test.ts`, and its call site
in `TilesSection.svelte`.

## Overview

`TILES_EXPLAINER` is an `ExplainerContent` (`lib/ui/explainer.ts`): the text the
[Explainer](/editor/ui-explainer/) popover shows when the (i) in the Tiles header is pressed. Data,
so the popover stays a frame that knows nothing about what it explains;
[operations-explainer.ts](/editor/operations-explainer/) is the pattern, and the Tiles section wires
it the same way.

Batch 03, T-03 (B-025). The text is what Pol approved in D-01: the triage draft with "picture"
replaced by "asset" throughout, and the formats and a recommended size added to *Adding tiles*.
Three `params` rows: *Adding tiles*, *Tile groups*, *Weights*. There are no measured figures, so
`shares` is empty, and no note, so `note` is `""` and the popover draws no hairline for it.

- **Formats:** PNG, JPEG, WebP, AVIF, GIF and SVG, the ones the editor knows by name when it reads
  a tileset zip back (`mimeOf` in [import.ts](/editor/import/)). Upload… accepts any `image/*`, but
  only these are named.
- **Size:** square, at least twice the largest cell size, so an asset stays sharp at a device pixel
  ratio of 2; SVG at any size. Nothing in the editor recommended a size before this.
- **Advice:** Reroll assets only swaps assets within a group, in the same words as the
  [randomness explainer](/editor/randomness-explainer/) and the tour.

### Tests

`tiles-explainer.test.ts`: the three params in order; no bars; the advice names Reroll assets and
says it never changes a cell's group; the six formats are named; the word "picture" is not used.
