<!--
  A segmented control where exactly one segment is chosen: Alignment (Column /
  Gutter), Assets on load, and any short enum.

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

<div class="toggle" role="radiogroup" aria-label={label} aria-disabled={disabled || undefined}>
  {#each options as option, i (option.value)}
    <button
      bind:this={chips[i]}
      type="button"
      role="radio"
      class="chip t-xs"
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
  /*
    A segmented control: one 28px box with a 3:1 edge, its segments sharing
    the width. The chosen segment is black, the one place black means
    "selected" in a field.
  */
  .toggle {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    min-width: 0;
    height: var(--control-h);
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-field);
    overflow: hidden;
  }

  .chip {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 var(--space-4);
    border: 0;
    background: transparent;
    color: var(--color-label);
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .chip + .chip {
    border-left: var(--rule);
  }

  .chip:hover:not(:disabled):not([aria-checked="true"]) {
    background: var(--color-hover);
    color: var(--color-ink);
  }

  .chip:active:not(:disabled):not([aria-checked="true"]) {
    background: var(--color-pressed);
  }

  .chip[aria-checked="true"] {
    background: var(--color-selected);
    color: var(--color-on-selected);
    cursor: default;
  }

  /* Inside the box, so the edge and the neighbours cannot cover the ring. */
  .chip:focus-visible {
    outline-offset: calc(-1 * var(--focus-w) - var(--focus-offset));
  }

  .chip[aria-checked="true"]:focus-visible {
    outline-color: var(--color-on-selected);
  }

  .chip:disabled {
    color: var(--color-disabled);
    cursor: default;
  }

  .chip[aria-checked="true"]:disabled {
    background: var(--color-disabled);
    color: var(--color-paper);
  }
</style>
