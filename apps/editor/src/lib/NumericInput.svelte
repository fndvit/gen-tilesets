<!--
  A numeric field that commits on parse — `09-editor.md` §4.2, **E5**.

  **Invariant E5** — *in-flight input lives in the input control and reaches the
  file only when it parses.*

  §4.2 states the behaviour exactly, and it is worth quoting because it is the
  whole of this component:

  > An author typing `1.` into `cellSize` has a control holding `"1."` and a file
  > still holding its last legal number. The control commits on a successful
  > parse, or on blur, or is reverted. Nothing partial reaches the file, and the
  > preview never stops drawing.

  So the text is **local state**, never bound to the file. Binding it would let a
  keystroke reach the document, which `08` §3.4 forbids — "a host must never hold
  an invalid file, not even between keystrokes" — and would also rewrite the
  author's `"1."` to `"1"` under their cursor as they typed the next character.

  **Refusal, never coercion.** A value outside what `06` admits is not clamped
  into range; the control holds the text, the file keeps its last legal value,
  and blur reverts. `02` §7.4 gives the failure clamping produces: "a loader that
  silently rewrites a value produces a picture the file does not describe, and
  the author's next save writes the rewritten value back over their own."
-->
<script lang="ts">
  import { format, type ParseResult } from "../fields.js";
  import Hint from "./ui/Hint.svelte";

  interface Props {
    label: string;
    /** The file's current value. The single source of truth; this never writes it. */
    value: number;
    /** `06`'s rule for this field. `null` means *do not commit* — see `fields.ts`. */
    parse: (text: string) => ParseResult;
    /** Called only with a value `parse` accepted. */
    onCommit: (text: string) => void;
    /** Explanation shown on hovering the label (`FieldRow`'s `hint`). */
    hint?: string;
    step?: string;
    /** A unit after the value ("px"). Display only. */
    unit?: string;
  }

  let { label, value, parse, onCommit, hint, step = "any", unit }: Props = $props();

  const inputId = $props.id();
  const hintId = $derived(hint ? `${inputId}-hint` : undefined);

  /**
   * **The in-flight text of E5, and nothing else.**
   *
   * `null` means *the author is not editing* — the control simply shows the
   * file. Non-null means the control is holding characters the file has not
   * necessarily taken, which is exactly the state §4.2 describes: "a control
   * holding `"1."` and a file still holding its last legal number".
   *
   * Modelling it as `string | null` rather than as a mirrored string is what
   * keeps the file the single source of truth. A mirror has to be re-synced when
   * the value changes underneath it — a reset, or an undo — and the
   * re-sync has to know not to fire while the author is typing. Here that falls
   * out: a `null` draft follows the file automatically, and a non-null one is
   * the author's and is left alone.
   */
  let draft = $state<string | null>(null);

  const text = $derived(draft ?? format(value));

  function onInput(event: Event): void {
    const next = (event.currentTarget as HTMLInputElement).value;
    draft = next;
    // Commit on every successful parse, so the preview follows the author's
    // typing. `09` §5: "a weight slider dragged across a frame changes `file` on
    // every frame and recomputes the grid on every frame, which is correct and
    // cheap". Whether the editor debounces "is an editor decision with no
    // correctness content".
    if (parse(next) !== null) onCommit(next);
  }

  /**
   * Blur is the reversion point named in §4.2, and it is one assignment:
   * dropping the draft shows the file again.
   *
   * That covers both cases at once. Text the file refused reverts to the last
   * legal value; text it accepted is normalized, so a committed `"1."` becomes
   * `"1"` and `"007"` becomes `"7"` — the file always held the number, and the
   * draft was the only thing still showing the keystrokes.
   */
  function onBlur(): void {
    draft = null;
  }
</script>

<!--
  The Inspector field: one 28px box holding the label as a prefix, the value
  and an optional unit ("Cell size  25 px"). The label is a real `<label>`, so
  clicking anywhere on the box's text puts the caret in the value. Its hint
  opens from the label, and the input is described by it. The box fills its
  grid cell; the caller decides the columns.
-->
<div class="field">
  <Hint text={hint} id={hintId}>
    {#snippet children()}
      <label class="name t-label" for={inputId}>{label}</label>
    {/snippet}
  </Hint>
  <input
    id={inputId}
    class="t-console"
    aria-describedby={hintId}
    type="number"
    {step}
    value={text}
    oninput={onInput}
    onblur={onBlur}
    spellcheck="false"
  />
  {#if unit}<span class="unit t-label" aria-hidden="true">{unit}</span>{/if}
</div>

<style>
  /*
    Fill, a 3:1 edge (the edge is what says "you can type here"), and the label
    inside in the 600 role so the value in 900 is what the eye lands on.
  */
  .field {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    height: var(--control-h);
    padding: 0 var(--space-3) 0 var(--space-4);
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-field);
    color: var(--color-ink);
    cursor: text;
    transition:
      background-color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease);
  }

  .field:hover {
    border-color: var(--color-rule-hover);
    background: var(--color-paper);
  }

  /* Focus: the edge turns ink and doubles, drawn inside so nothing moves. */
  .field:focus-within {
    background: var(--color-paper);
    border-color: var(--color-ink);
    box-shadow: inset 0 0 0 var(--rule-w) var(--color-ink);
  }

  .name {
    flex: none;
    color: var(--color-label);
    white-space: nowrap;
    cursor: inherit;
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    line-height: 1;
    text-align: right;
    appearance: textfield;
  }

  /* The box draws the focus; a second ring inside it would be noise. */
  input:focus-visible {
    outline: none;
  }

  .unit {
    flex: none;
    color: var(--color-placeholder);
  }

  /* No spinners: the field is a typed value. */
  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
</style>
