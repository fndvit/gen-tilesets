<!--
  Text that becomes an input when clicked: the editable tile group title.

  At rest it is a button showing `value` in the surrounding colour and the
  given text style. Clicking it (or Enter/Space on it) swaps in an input with
  the text selected. Enter or leaving the field commits. Escape cancels.

  **Only a real change is committed.** The new text is trimmed, and an empty or
  unchanged result commits nothing, so a name can never be blanked by accident
  and an idle click leaves no undo entry. Like every control here, it shows
  `value` and never holds the file's state.
-->
<script lang="ts">
  import { tick } from "svelte";

  interface Props {
    value: string;
    /** Accessible name of the control, e.g. "Rename tile group". */
    label: string;
    onCommit: (value: string) => void;
    /** Text style class, so the field matches what it replaces. */
    textClass?: string;
    /** Id of a hint describing the text, for `aria-describedby`. */
    describedby?: string | undefined;
  }

  let { value, label, onCommit, textClass = "t-label", describedby }: Props = $props();

  let editing = $state(false);
  let draft = $state("");
  let input: HTMLInputElement | undefined = $state();
  let trigger: HTMLButtonElement | undefined = $state();

  async function start(): Promise<void> {
    draft = value;
    editing = true;
    await tick();
    input?.focus();
    input?.select();
  }

  async function finish(save: boolean): Promise<void> {
    if (!editing) return;
    editing = false;
    const next = draft.trim();
    if (save && next !== "" && next !== value) onCommit(next);
    await tick();
    trigger?.focus();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      void finish(false);
    }
  }
</script>

{#if editing}
  <input
    bind:this={input}
    bind:value={draft}
    class="field {textClass}"
    aria-label={label}
    size={Math.max(draft.length, 1)}
    spellcheck="false"
    onkeydown={onKeydown}
    onblur={() => void finish(true)}
  />
{:else}
  <button
    bind:this={trigger}
    type="button"
    class="text {textClass}"
    aria-label="{label}: {value}"
    aria-describedby={describedby}
    title={describedby ? undefined : label}
    onclick={start}
  >
    {value}
  </button>
{/if}

<style>
  .text,
  .field {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
  }

  /* A 24px target (WCAG 2.2, 2.5.8): the bar's height, not the trimmed text's. */
  .text {
    min-height: var(--target-min);
    line-height: var(--leading-title);
    text-box: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: text;
  }

  /* A dotted underline says "click to type here" without looking like a link. */
  .text:hover {
    text-decoration: underline dotted;
    text-decoration-thickness: var(--rule-w);
    text-underline-offset: var(--space-1);
  }

  /* While typing it becomes a field like every other: paper, an ink edge. */
  .field {
    field-sizing: content;
    box-sizing: border-box;
    max-width: 100%;
    height: var(--target-min);
    padding: 0 var(--space-2);
    border: var(--rule-w) solid var(--color-ink);
    border-radius: var(--radius-xs);
    background: var(--color-paper);
    box-shadow: inset 0 0 0 var(--rule-w) var(--color-ink);
    outline: none;
  }
</style>
