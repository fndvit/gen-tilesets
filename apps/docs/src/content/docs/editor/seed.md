---
title: seed.ts
description: The generated memorable seed. A word-word-number string such as slate-lagoon-7.
sidebar:
  order: 7
---

**Written from:** `apps/editor/src/seed.ts`, `document.test.ts` (seed assertions), and the call
sites in `document.ts`.

## Overview

The seed module invents seeds people can remember. A seed is the text that decides which of the
many possible pictures a tileset draws. The author can type any seed they like. When they want a
new one, the editor offers something like `slate-lagoon-7` rather than a string of random
characters, because a seed is only useful if it can be written down and come back to.

The module picks words and a number at random. That randomness is fine here. It happens once,
when the author asks for a seed, and the result is stored in the file as ordinary text. Drawing
from that text is still fully predictable.

In the editor's pipeline, import → document → draft/history → preview → export, the document uses
this when it creates a new file and when the author asks for a new seed.

## In detail

### Purpose

`seed.ts` exports one function that returns `adjective-noun-n`. It picks from two fixed lists of
24 words each, and `n` is in `0…99`.

### Public surface

| Function | Signature | Returns |
| --- | --- | --- |
| `memorableSeed` | `() → string` | e.g. `"slate-lagoon-7"` |

### Inputs → outputs

There is no input. `pick(list)` uses `list[Math.floor(Math.random() * list.length)]`. The number is
`Math.floor(Math.random() * 100)`, so it is one or two digits, never zero-padded. The output always
has length `>= 1`, which `config.defaultSeed` requires.

### Invariants

- **Random is correct here.** `Math.random()` is forbidden inside the *engine*. This is the editor
  choosing an authoring value, which then travels into the file as a string and is hashed
  deterministically like any other.
- **The word lists are UI constants with no authority anywhere.** No output depends on which words
  are in them. Adding or removing one moves no picture, because a seed is a string and every string
  hashes. The words were chosen to be short, unambiguous aloud, and free of characters that need
  escaping. The seed itself has no charset constraint.
- **Two digits** keep it short enough to say out loud and write down.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `document.ts:142` | `newDocument()` gives every fresh document a memorable seed |
| `document.ts:341` | `rerollSeed()`, behind the *New seed* button (`App.svelte:681`) |

Callees: `Math.random`.

### Tests

There is no `seed.test.ts`. `document.test.ts` reaches it through `newDocument` and `rerollSeed`.
Forty fresh documents produce more than one distinct seed, each matching
`/^[a-z]+-[a-z]+-\d{1,2}$/`, and `rerollSeed` *generates a memorable seed, not hex*.

### Gotchas & rejected alternatives

- **Rejected: random hex.** *"Random hex defeats"* the point of a seed, which is that it can be
  written down and returned to.
- **Not the load salt.** The warning about `| 0` producing negative numbers applies to drawing a
  `uint32` load salt ([reseed.ts](/editor/reseed/)'s `drawLoadSalt`), not to this.

### Review notes

- The docstring on `pick` (`seed.ts:37`) says *"Exclusive of `n`. `Math.random()` returns
  `[0, 1)`, so this never reaches it."* `pick` has no `n`. The sentence appears to describe the
  list length (or the `n` in `memorableSeed`) and was left on the wrong function. (stale comment)
