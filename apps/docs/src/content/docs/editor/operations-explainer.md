---
title: sections/operations-explainer.ts
description: The text of the "How operations work" popover in the Operations header.
sidebar:
  order: 47
---

**Written from:** `apps/editor/src/lib/sections/operations-explainer.ts`, `operations-explainer.test.ts`, and its call site
in `OperationsSection.svelte`.

## Overview

`OPERATIONS_EXPLAINER` is an `ExplainerContent` (`lib/ui/explainer.ts`): the text the
[Explainer](/editor/ui-explainer/) popover shows. Data, so the popover stays a frame that knows
nothing about what it explains; [noise-explainer.ts](/editor/ui-explainer/) is the pattern.

Batch 01, T-07 (B-018, B-010). The text is exactly what Pol approved in D-04 (A). Each part is a `params`
row (a name over a muted explanation). There are no measured figures, so `shares` is empty and the
popover draws no bars.

The advice ("A cell keeps everything earlier operations gave it…") is B-010's answer: a rotation
carrying into a later tile operation is how the engine composes (`generate.ts`), so it is
explained rather than changed (T-12 decides whether it ever changes).

### Tests

`operations-explainer.test.ts`: the params are the four steps, in order, named by `STEP_LABELS`
as the card names them; no bars; the advice says a later tile is drawn rotated.
