<!--
  A set of chips where exactly one is chosen: the Figma *Boolean input*
  (Alignment: Column / Gutter), and any short enum.

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
  .toggle {
    display: flex;
    align-items: center;
    gap: var(--chip-gap);
  }

  /* `--control-h` tall: above the 24px target floor (WCAG 2.2, 2.5.8). */
  .chip {
    box-sizing: border-box;
    min-height: var(--control-h);
    padding: 0 var(--space-4);
    border: var(--rule);
    background: var(--color-paper);
    color: var(--color-ink);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .chip:hover:not(:disabled),
  .chip[aria-checked="true"] {
    background: var(--color-ink);
    color: var(--color-paper);
  }

  /* Choosing it again does nothing, and the pointer says so. */
  .chip[aria-checked="true"] {
    cursor: default;
  }

  .chip:active:not(:disabled):not([aria-checked="true"]) {
    background: var(--color-pressed);
    color: var(--color-on-pressed);
  }

  .chip:disabled {
    border-color: var(--color-inactive);
    color: var(--color-inactive);
    cursor: default;
  }

  .chip[aria-checked="true"]:disabled {
    background: var(--color-inactive);
    color: var(--color-paper);
  }
</style>
