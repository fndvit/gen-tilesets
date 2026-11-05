<!--
  A dashed "+" that adds something inside a list: variants to a tile group.
  (Adding a rule, a group or an operation is a "+" in the section's header.)

  `bar` spans its container at `--control-h` and can show `text` after the
  plus; `square` is a `--thumb` square that lines up with the thumbnails. The
  accessible name is always `label`, which can say more than the visible text
  ("Add variants to grass").
-->
<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    label: string;
    onclick: (event: MouseEvent) => void;
    variant?: "bar" | "square";
    disabled?: boolean;
    /** Visible words after the plus (bar only). */
    text?: string;
  }

  let { label, onclick, variant = "bar", disabled = false, text }: Props = $props();
</script>

<span class="wrap" class:wide={variant === "bar"}>
  <button
    type="button"
    class="add {variant}"
    aria-label={label}
    title={label}
    {disabled}
    {onclick}
  >
    <Icon name="plus" />
    {#if text && variant === "bar"}<span class="t-xs">{text}</span>{/if}
  </button>
</span>

<style>
  .wrap {
    display: inline-flex;
  }

  .wide {
    display: flex;
    flex: 1;
    min-width: 0;
  }

  /* A dashed edge: a place where something can go, not a thing that is there. */
  .add {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-3);
    padding: 0 var(--space-4);
    border: var(--rule-w) dashed var(--color-rule);
    border-radius: var(--radius);
    background: transparent;
    color: var(--color-label);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .bar {
    width: 100%;
    height: var(--control-h);
  }

  .square {
    justify-content: center;
    width: var(--thumb);
    height: var(--thumb);
    padding: 0;
  }

  .add:hover:not(:disabled) {
    border-style: solid;
    border-color: var(--color-rule-hover);
    background: var(--color-hover);
    color: var(--color-ink);
  }

  .add:active:not(:disabled) {
    background: var(--color-pressed);
  }

  .add:disabled {
    border-color: var(--color-disabled);
    color: var(--color-disabled);
    cursor: default;
  }
</style>
