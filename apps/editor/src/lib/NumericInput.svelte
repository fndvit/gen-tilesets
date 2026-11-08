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

  **Commit on blur** (`commit="blur"`, Stage 2 W4). A field whose edit asks
  first (Grid & size's cell size and design width, **E12**) must ask once, for
  the value the author meant, never after the first digit of "54" (Pol, W1:
  confirmations come only once a value is committed). In this mode the draft is
  held while typing and committed once, on blur or Enter, and only when it
  parses to a value other than the file's. Esc drops the draft. The cost: the
  preview does not follow the typing in these fields.
-->
<script lang="ts">
  import { format, type ParseResult } from "../fields.js";
  import FieldRow from "./ui/FieldRow.svelte";

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
    /**
     * `"parse"` (the default) commits on every keystroke that parses, so the
     * preview follows the typing. `"blur"` commits once, on blur or Enter.
     */
    commit?: "parse" | "blur";
  }

  let { label, value, parse, onCommit, hint, step = "any", commit = "parse" }: Props = $props();

  const inputId = $props.id();

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

  /**
   * `commit="blur"` only: the draft parses to a value the file does not hold,
   * so Enter (or leaving) would apply it. The field says so, because the
   * preview no longer follows the typing and nothing else shows that the value
   * is waiting (Pol, W4 review).
   */
  const waiting = $derived.by(() => {
    if (commit !== "blur" || draft === null) return false;
    const parsed = parse(draft);
    return parsed !== null && parsed !== value;
  });

  const waitingId = `${inputId}-waiting`;

  function onInput(event: Event): void {
    const next = (event.currentTarget as HTMLInputElement).value;
    draft = next;
    // Commit on every successful parse, so the preview follows the author's
    // typing. `09` §5: "a weight slider dragged across a frame changes `file` on
    // every frame and recomputes the grid on every frame, which is correct and
    // cheap". Whether the editor debounces "is an editor decision with no
    // correctness content".
    if (commit === "parse" && parse(next) !== null) onCommit(next);
  }

  /**
   * The one commit of `commit="blur"`: the draft, if it parses to a value the
   * file does not already hold. Dropping the draft first means a re-entrant
   * blur (the dialog `onCommit` may open takes focus) finds nothing to commit.
   *
   * Focus goes back to the field before committing. A dialog opened by the
   * commit returns focus to whatever held it when it opened, and between a
   * blur and the next element's focus that is `<body>`. The question is about
   * this field, so Cancel and the verb both bring the author back here.
   */
  function commitDraft(input: HTMLInputElement): void {
    const text = draft;
    draft = null;
    if (commit !== "blur" || text === null) return;
    const parsed = parse(text);
    if (parsed === null || parsed === value) return;
    if (document.activeElement !== input) input.focus();
    onCommit(text);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (commit !== "blur") return;
    if (event.key === "Enter") {
      // Otherwise the same Enter, arriving as a keypress, activates the
      // dialog's Cancel the moment focus lands on it.
      event.preventDefault();
      commitDraft(event.currentTarget as HTMLInputElement);
    } else if (event.key === "Escape") draft = null;
  }

  /**
   * Blur is the reversion point named in §4.2, and it is one assignment:
   * dropping the draft shows the file again.
   *
   * That covers both cases at once. Text the file refused reverts to the last
   * legal value; text it accepted is normalized, so a committed `"1."` becomes
   * `"1"` and `"007"` becomes `"7"` — the file always held the number, and the
   * draft was the only thing still showing the keystrokes. In `commit="blur"`
   * mode it is also the commit.
   */
  function onBlur(event: FocusEvent): void {
    commitDraft(event.currentTarget as HTMLInputElement);
  }
</script>

<!--
  The row is `ui/FieldRow`; this component adds only the field: a filled box one
  step darker than the panel, with the value in ink, left-aligned so it sits
  next to its label.
-->
<FieldRow {label} for={inputId} {...hint ? { hint } : {}}>
  {#snippet children(describedBy)}
    <div class="box">
      <input
        id={inputId}
        class="field t-value"
        class:waiting
        aria-describedby={[describedBy, waiting ? waitingId : undefined].filter(Boolean).join(" ") || undefined}
        type="number"
        {step}
        value={text}
        oninput={onInput}
        onblur={onBlur}
        onkeydown={onKeydown}
        spellcheck="false"
      />
      {#if waiting}
        <span class="waiting-cue t-console" id={waitingId}><span aria-hidden="true">↵</span> Enter to apply</span>
      {/if}
    </div>
  {/snippet}
</FieldRow>

<style>
  /* `FieldRow`'s control is a flex row: grow to fill it, as the bare input did. */
  .box {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  /*
    "↵ Enter to apply", inside the field at its right edge, muted: a state of
    the field, not a message about it. The field keeps room for it so the
    digits never run under it.
  */
  .waiting-cue {
    position: absolute;
    top: 50%;
    right: var(--space-4);
    translate: 0 -50%;
    color: var(--color-muted);
    white-space: nowrap;
    pointer-events: none;
    text-box: none;
  }

  .field.waiting {
    padding-right: 120px;
  }

  /*
    A filled box. Its 1px bottom edge (`--color-edge`, 3:1 or more on every
    surface) is the boundary that says "type here" (WCAG 1.4.11); the fill alone
    would be too faint to carry it.
  */
  .field {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: var(--control-h);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--color-field);
    box-shadow: inset 0 calc(-1 * var(--rule-w)) 0 var(--color-edge);
    color: var(--color-ink);
    line-height: normal;
    text-box: none;
    appearance: textfield;
    cursor: text;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .field:hover {
    background: var(--color-field-hover);
  }

  /* Focus: the ink ring, drawn tight so it reads as the box itself. */
  .field:focus-visible {
    outline-offset: 0;
  }

  /* No spinners: the field is a typed value. */
  .field::-webkit-inner-spin-button,
  .field::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
</style>
