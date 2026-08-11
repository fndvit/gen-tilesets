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

  interface Props {
    label: string;
    /** The file's current value. The single source of truth; this never writes it. */
    value: number;
    /** `06`'s rule for this field. `null` means *do not commit* — see `fields.ts`. */
    parse: (text: string) => ParseResult;
    /** Called only with a value `parse` accepted. */
    onCommit: (text: string) => void;
    /** Shown beside the label. Used for the destructive three of §9.3. */
    note?: string;
    step?: string;
  }

  let { label, value, parse, onCommit, note, step = "any" }: Props = $props();

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
   * the value changes underneath it — a reset, or an undo at Step 10 — and the
   * re-sync has to know not to fire while the author is typing. Here that falls
   * out: a `null` draft follows the file automatically, and a non-null one is
   * the author's and is left alone.
   */
  let draft = $state<string | null>(null);

  const text = $derived(draft ?? format(value));

  /** `true` while the text denotes nothing the file may hold. Advisory only. */
  const pending = $derived(parse(text) === null);

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

<label class="field" class:pending>
  <span class="label">
    {label}
    {#if note}<em>{note}</em>{/if}
  </span>
  <input
    type="number"
    {step}
    value={text}
    oninput={onInput}
    onblur={onBlur}
    spellcheck="false"
  />
</label>

<style>
  .field {
    display: grid;
    grid-template-columns: 1fr 5.5rem;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .label {
    color: #4a5568;
  }

  .label em {
    display: block;
    font-size: 0.7rem;
    font-style: normal;
    color: #5a6b80;
  }

  input {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: inherit;
    border-radius: 4px;
    padding: 0.3rem 0.4rem;
    font: inherit;
    font-size: 0.85rem;
    width: 100%;
  }

  input:focus {
    outline: none;
    border-color: #a0aec0;
  }

  /*
    The control is holding text the file has not taken. Not an error state — the
    author is mid-keystroke, and the file is still drawing its last legal value.
  */
  .pending input {
    border-color: #b7791f;
  }
</style>
