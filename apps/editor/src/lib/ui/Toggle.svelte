<!--
  A segmented control where exactly one segment is chosen: Alignment
  (Column / Gutter), Assets on load, and any short enum.

  A grey track, one step off its surface, holding equal segments. The chosen
  one is ink with white text, the selected state everywhere in the editor.
  The others are text on the track and wash darker under the pointer.

  It is a radio group, so Tab enters it once, on the chosen chip, and the arrow
  keys move the choice. Every move commits through `onChange`; there is no
  separate confirm, because each chip is a complete value. Choosing the chip
  that is already chosen is not a change and calls nothing, as with a native
  radio; otherwise a gated caller (Alignment) would ask to confirm a no-op.

  Name it with `label`, or put it in a `FieldRow` (which names its group) and
  pass the same text.
-->
<script lang="ts" generics="T extends string | number | boolean">
  import { rovingIndex } from "./keys.js";

  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    options: Option[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    disabled?: boolean;
  }

  let { options, value, onChange, label, disabled = false }: Props = $props();

  let chips: HTMLButtonElement[] = $state([]);

  const selected = $derived(options.findIndex((o) => o.value === value));

  function choose(next: T): void {
    if (next !== value) onChange(next);
  }

  function onKeydown(event: KeyboardEvent, i: number): void {
    const next = rovingIndex(event.key, i, options.length);
    if (next === null) return;
    event.preventDefault();
    const option = options[next];
    if (!option) return;
    choose(option.value);
    chips[next]?.focus();
  }
</script>

<div class="track" role="radiogroup" aria-label={label} aria-disabled={disabled || undefined}>
  {#each options as option, i (option.value)}
    <button
      bind:this={chips[i]}
      type="button"
      role="radio"
      class="segment t-xs"
      aria-checked={i === selected}
      tabindex={i === selected || (selected < 0 && i === 0) ? 0 : -1}
      {disabled}
      onclick={() => choose(option.value)}
      onkeydown={(event) => onKeydown(event, i)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  /* Fills its row, so segments of every control in a panel share one width. */
  .track {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    min-height: var(--control-h);
    padding: var(--space-1);
    gap: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--color-field);
  }

  /* `--control-h` less the track's padding: 26px, above the 24px target floor (2.5.8). */
  .segment {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 var(--space-3);
    border: 0;
    border-radius: calc(var(--radius-sm) - var(--space-1));
    background: transparent;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: normal;
    text-box: none;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .segment:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .segment:active:not(:disabled) {
    background: var(--color-pressed);
  }

  .segment[aria-checked="true"] {
    background: var(--color-selected);
    color: var(--color-on-selected);
    cursor: default;
  }

  .segment:focus-visible {
    outline-offset: 0;
  }

  .segment:disabled {
    color: var(--color-disabled);
    cursor: default;
  }

  .segment[aria-checked="true"]:disabled {
    background: var(--color-disabled);
    color: var(--color-paper);
  }
</style>
