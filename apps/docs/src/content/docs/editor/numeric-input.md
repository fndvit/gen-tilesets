---
title: NumericInput.svelte
description: A numeric field that commits only text its parser accepts, keeps half-typed text locally, and reverts on blur. A blur mode commits once, for fields whose edit asks first.
sidebar:
  order: 42
---

**Written from:** `apps/editor/src/lib/NumericInput.svelte`, and the call sites in `App.svelte` and
the section components. The parsers it is given are in [fields.ts](/editor/fields/).

## Overview

`NumericInput` is the labelled number box used for the document's numeric settings. In the
sidebar it is the rows and y-offset fields in Grid, design width and cell size in Design, every
field of every breakpoint rule, and the weight beside each picture in the tile library.

The author types, and the field writes to the document only once the text is a legal value.
While the text is incomplete, such as `1.` on the way to `1.5`, or out of range, the field keeps
showing what the author typed and leaves the document alone. Leaving
the field puts the document's real value back in the box.

Two Grid & size fields, cell size and design width, ask before they change the column count. For
them, and for rows, the field holds the typed text until the author leaves it or presses Enter, then commits
once, and only if the value changed, so the question is asked about "54" and not about "5". Esc
puts the document's value back without asking. While such a field holds a changed value, it says
"↵ Enter to apply" at its right edge, muted, because the preview no longer shows the change.

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
| `hint` | `string` | `undefined` | Explanation shown on hovering the label (`FieldRow`'s `hint`), and the input's `aria-describedby`. |
| `step` | `string` | `"any"` | Passed to `<input type="number">`. |
| `commit` | `"parse" \| "blur"` | `"parse"` | `"parse"` commits on every keystroke that parses. `"blur"` commits once, on blur or Enter (Stage 2 W4). |

No events, no bindings, no snippets. The callback receives text, not the parsed number, because
the transitions in `document.ts` parse again on their own terms.

### Inputs → outputs

- `draft: string | null` is local state. `null` means the author is not editing, so the box shows
  `format(value)`. Non-null means the box is showing the author's characters.
- **On `input`:** `draft = text`; in `"parse"` mode, if `parse(text) !== null`, call
  `onCommit(text)`. So the preview follows the typing on every parseable keystroke.
- **On `blur`:** `commitDraft`, which sets `draft = null`. Refused text reverts to the last legal
  value, and accepted text is normalised (`"1."` becomes `"1"`, `"007"` becomes `"7"`). In
  `"blur"` mode it also calls `onCommit(text)` once, if `parse(text)` is a number other than
  `value`.
- **On Enter** (`"blur"` mode only): `preventDefault`, then `commitDraft`.
- **On Esc** (`"blur"` mode only): `draft = null`, with no commit.
- **`waiting`** (`"blur"` mode only) is true while the draft parses to a value other than `value`.
  It shows "↵ Enter to apply" (`.waiting-cue`, `t-console`, muted) inside the field at its right
  edge, widens the field's right padding so the digits never run under it, and adds the cue's id
  to `aria-describedby`. The input is wrapped in a `.box` (`position: relative`) to place it; the
  box has `flex: 1`, because `FieldRow`'s control is a flex row and the box would otherwise shrink
  to its content.

### Invariants

- **The file is the single source of truth.** Modelling the draft as `string | null` rather than a
  mirrored string means there is nothing to re-sync when the value changes underneath, for
  example after a reset or an undo. A `null` draft follows the file automatically.
- **Refusal, never coercion.** An out-of-range value is not clamped. The comment gives the
  failure clamping produces: a loader that silently rewrites a value "produces a picture the file
  does not describe, and the author's next save writes the rewritten value back over their own".
- **No debouncing.** The comment says committing on every successful parse is "correct and
  cheap", and that debouncing would be an editor decision "with no correctness content".
- **`"blur"` mode commits at most once per entry.** `commitDraft` drops the draft before calling
  `onCommit`, so a second blur (the dialog the commit opens takes focus) finds nothing to commit.

### Callers / callees

| Caller | Field | `parse` |
| --- | --- | --- |
| `lib/sections/GridSection.svelte` | cell size (with a `hint`, `commit="blur"`) | `parseCellSize` |
| `lib/sections/GridSection.svelte` | rows (`commit="blur"`) | `parseRows` |
| `lib/sections/GridSection.svelte` | y offset (with a `hint` explaining the fraction) | `parseYOffset` |
| `lib/sections/GridSection.svelte` | design width (with a `hint`, `commit="blur"`) | `parseReferenceWidth` |
| `lib/sections/BreakpointsSection.svelte` | each breakpoint rule field | `RULE_PARSERS[field]` |
| `controls/ParamControl.svelte` | a `number` parameter (with the range as `hint`) | `admits(spec, n)` |
| `controls/NumericMapping.svelte` | From, To (or Value when collapsed), Steps | `admitsTyped(target, n)`; an integer `≥ MIN_STEPS` |

Callees: `format` and the `ParseResult` type from `fields.ts:27`, and
[`ui/FieldRow`](/editor/ui-field-row/) for the row (label on the left, field on the right, with
`for` pointing at the input's `$props.id()`).

### Look

The Figma *Numeric input*: the label in `.t-label`, the field a `--field-w` underline (`--rule`
along the bottom) with right-aligned `.t-label` text, `--space-2` side padding and no number
spinners. Focus thickens the underline to `--focus-w` instead of drawing the editor's focus ring,
because a box around an underline field reads as a different control. The input's line height
is `1`, not `normal`, so a row is about 21px tall instead of 25: the digits keep their full height
and sit just above the rule. Figma's rows are 14px only because its fields are empty; a field that
shows a value needs room for the digits. Every value is a token from `styles/tokens.css`.

### Tests

No test file for the component. The parsers it is handed come from `fields.ts`, which has no
test file of its own; `document.test.ts` is the test that imports them.

### Gotchas & rejected alternatives

- **Commit on every parse, not on blur only,** by default. The preview updates as the author
  types. `"blur"` mode is for a field whose commit asks a question (Pol, W1: confirmations come
  only once a value is committed). Its cost is that the preview does not follow the typing.
- **`"blur"` mode puts focus back on the field before committing.** A dialog returns focus to
  whatever held it when it opened. Between a blur and the next element's focus that is `<body>`,
  so after Cancel, focus was lost. The question is about this field, so both answers return here.
- **Enter's `preventDefault` is needed.** Without it, the same Enter arrives as a keypress after
  the dialog has moved focus to Cancel, and cancels the dialog at once.
- **A value that parses but is then refused by the transition** (for example a weight that
  would zero the last non-zero weight) still calls `onCommit`. The refusal happens in the
  transition, so the box keeps showing the typed text until blur. The asset weight, the case this was
  written for, is now a `ui/Slider` in [TileAsset](/editor/tile-asset/), not a `NumericInput`.

### Review notes

- In the default mode there is no visual pending state. Half-typed text looks the same as
  committed text, by decision in the Block B review. `"blur"` mode has the Enter cue (Pol, W4
  review), because there the preview does not follow the typing.
