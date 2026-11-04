---
title: ui/icons.ts
description: The editor's icon set as path data copied from Figma, with no colour baked in.
sidebar:
  order: 60
---

**Written from:** `apps/editor/src/lib/ui/icons.ts` and `lib/ui/icons.test.ts`.

## Overview

`icons.ts` is the list of icons the redesigned editor can draw, kept as path data copied from
the Figma file. `Icon.svelte` draws them. There are six: `fold` (the section chevron), `up` and
`down`, `plus`, `trash`, and `reseed`.

## In detail

### Public surface

| Export | Type | Meaning |
| --- | --- | --- |
| `IconDef` | interface | `w`, `h` (px), `d` (path), `mode` (`"stroke"` \| `"fill"`), and optionally `strokeWidth`, `round`, `origin`. |
| `ICONS` | `Record<IconName, IconDef>` (`as const satisfies`) | The set. |
| `IconName` | type | `keyof typeof ICONS`. |

| Name | Size | Drawn as | Figma source |
| --- | --- | --- | --- |
| `fold` | 12×6 | 2px stroke chevron, pointing down | Section Header fold icon |
| `up` / `down` | 12×6 | filled triangles | Operation header move column |
| `plus` | 18×18 | 1px stroke cross | Add tile group / Add tile |
| `trash` | 12×12 | 1px stroke, round caps (`origin` 0.5, 0.5) | Operation header delete |
| `reseed` | 12×10 | filled shuffle | Operation header re-seed |

### Invariants

- **No colour.** Entries hold geometry only. The test checks that `d` is path syntax only.
- **Every stroke icon states its width, and no fill icon has one.** Also tested.

### Callers / callees

Caller: `lib/ui/Icon.svelte`, and `IconName` in `lib/ui/IconButton.svelte`. No callees.

### Tests

`lib/ui/icons.test.ts`: stroke icons have `strokeWidth` and fill icons do not; every `d` is path
data with no colour; every size is positive.

### Gotchas & rejected alternatives

- **The Handpick cursor is not here.** It is part of the Handpick glyph's SVG artwork
  (`assets/glyphs/selection/handpick.svg`), not an icon.
- **The trash path is Figma's export unchanged.** Rather than shifting its coordinates by hand,
  `origin` moves the viewBox.
