---
title: NumericInput.svelte
description: A numeric field that commits only text its parser accepts, keeps half-typed text locally, and reverts on blur.
sidebar:
  order: 42
---

**Written from:** `apps/editor/src/lib/NumericInput.svelte`, and the call sites in `App.svelte` and
`lib/TileLibrary.svelte`. The parsers it is given are in [fields.ts](/editor/fields/).

## Overview

`NumericInput` is the labelled number box used for the document's numeric settings. In the
sidebar it is the rows and y-offset fields in Grid, design width and cell size in Design, every
field of every breakpoint rule, and the weight beside each picture in the tile library.

The author types, and the field writes to the document only once the text is a legal value.
While the text is incomplete, such as `1.` on the way to `1.5`, or out of range, the field keeps
showing what the author typed, marks itself as pending, and leaves the document alone. Leaving
the field puts the document's real value back in the box.

In the editor's pipeline (import → document → draft/history → preview → export), it is one of
the gates in front of the document. Nothing partial reaches it, so the preview never stops
drawing.

## In detail

### Purpose

The component is the editor's implementation of **E5**: in-flight input lives in the control and
reaches the file only when it parses. The text is local state and is never bound to the file.
Binding it would let a keystroke reach the document, and would also rewrite the author's `"1."`
to `"1"` under the cursor.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | required | Text beside the input. |
| `value` | `number` | required | The file's current value. The component never writes it. |
| `parse` | `(text: string) => ParseResult` | required | The field's rule. `ParseResult` is `number \| null` (`fields.ts:39`); `null` means *do not commit*. |
| `onCommit` | `(text: string) => void` | required | Called with the **text**, and only when `parse(text)` is not `null`. |
| `note` | `string` | `undefined` | Shown in `<em>` beside the label. |
| `step` | `string` | `"any"` | Passed to `<input type="number">`. |

No events, no bindings, no snippets. The callback receives text, not the parsed number, because
the transitions in `document.ts` parse again on their own terms.

### Inputs → outputs

- `draft: string | null` is local state. `null` means the author is not editing, so the box shows
  `format(value)`. Non-null means the box is showing the author's characters.
- **On `input`:** `draft = text`; if `parse(text) !== null`, call `onCommit(text)`. So the preview
  follows the typing on every parseable keystroke.
- **On `blur`:** `draft = null`. Refused text reverts to the last legal value, and accepted text is
  normalised (`"1."` becomes `"1"`, `"007"` becomes `"7"`).
- `pending` is `parse(text) === null`. It adds the `pending` class to the `<label>`. It is
  advisory only.

### Invariants

- **The file is the single source of truth.** Modelling the draft as `string | null` rather than a
  mirrored string means there is nothing to re-sync when the value changes underneath, for
  example after a reset or an undo. A `null` draft follows the file automatically.
- **Refusal, never coercion.** An out-of-range value is not clamped. The comment gives the
  failure clamping produces: a loader that silently rewrites a value "produces a picture the file
  does not describe, and the author's next save writes the rewritten value back over their own".
- **No debouncing.** The comment says committing on every successful parse is "correct and
  cheap", and that debouncing would be an editor decision "with no correctness content".

### Callers / callees

| Caller | Field | `parse` |
| --- | --- | --- |
| `App.svelte:434` | rows | `parseRows` |
| `App.svelte:441` | y offset (`note="[0, 1) — clips row 0"`) | `parseYOffset` |
| `App.svelte:454` | design width | `parseReferenceWidth` |
| `App.svelte:460` | cell size | `parseCellSize` |
| `App.svelte:534` | each breakpoint rule field | `RULE_PARSERS[field]` |
| `lib/TileLibrary.svelte:294` | asset weight | `parseWeight` |

Callees: `format` and the `ParseResult` type from `fields.ts:27`.

### Tests

No test file for the component. The parsers it is handed come from `fields.ts`, which has no
test file of its own; `document.test.ts` is the test that imports them.

### Gotchas & rejected alternatives

- **Commit on every parse, not on blur only.** The preview updates as the author types.
- **A value that parses but is then refused by the transition** (for example a weight that
  would zero the last non-zero weight) still calls `onCommit`. The refusal happens in the
  transition, so the box keeps showing the typed text until blur. `TileLibrary` reports that case
  itself.

### Review notes

- The `note` prop's doc comment (line 37) says it is "Used for the destructive three of §9.3". The
  only caller that passes `note` is the **y offset** field (`App.svelte:444`), which is not one of
  the destructive three. The comment is stale.
- Line 54 refers to "an undo at Step 10". Undo exists. The reference to a build step is stale.
