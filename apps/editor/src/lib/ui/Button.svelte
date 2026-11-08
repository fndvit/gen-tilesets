<!--
  A text button for an action: Undo, Import, Download, Save, Cancel.

  Three weights, by fill, never by border:
  - `primary`: ink with white text. One per area, for the action the area
    exists for (Download in the footer, Save in an operation body).
  - `secondary` (default): a grey fill one step darker than the panel.
  - `tertiary`: text only; a wash appears under the pointer (Discard, Reset).

  Each darkens a step on hover and another while pressed. `wide` stretches it to
  its container. `squared` flattens one side's corners, for a Button that is one
  part of a larger control (a Split button's main part), so that control can
  reuse these states instead of copying them.
-->
<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons.js";

  interface Props {
    label: string;
    /** An icon before the label, for actions people look for by shape (Undo, Import, Export). */
    icon?: IconName | undefined;
    onclick: (event: MouseEvent) => void;
    disabled?: boolean;
    wide?: boolean;
    variant?: "primary" | "secondary" | "tertiary";
    /** The id of a hint that explains it. */
    describedby?: string | undefined;
    /** For a popover trigger ("How noise works"), as on `IconButton`. */
    expanded?: boolean | undefined;
    /** The side whose corners are square, where it joins another part. */
    squared?: "left" | "right" | undefined;
    element?: HTMLButtonElement | undefined;
  }

  let {
    label,
    icon,
    onclick,
    disabled = false,
    wide = false,
    variant = "secondary",
    describedby,
    expanded,
    squared,
    element = $bindable(),
  }: Props = $props();
</script>

<button
  bind:this={element}
  type="button"
  class="button t-xs {variant}"
  class:wide
  class:with-icon={icon}
  class:squared-left={squared === "left"}
  class:squared-right={squared === "right"}
  aria-describedby={describedby}
  aria-expanded={expanded}
  {disabled}
  {onclick}
>
  {#if icon}<Icon name={icon} />{/if}{label}
</button>

<style>
  /* `--control-h` tall: above the 24px target floor (WCAG 2.2, 2.5.8). */
  .button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    min-height: var(--control-h);
    padding: 0 var(--space-6);
    border: 0;
    border-radius: var(--radius-sm);
    white-space: nowrap;
    line-height: normal;
    text-box: none;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .with-icon {
    padding-left: var(--space-5);
  }

  .wide {
    width: 100%;
  }

  .squared-left {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .squared-right {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .primary {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .primary:active:not(:disabled) {
    background: var(--color-ink);
    box-shadow: inset 0 0 0 var(--focus-w) var(--color-primary-hover);
  }

  .secondary {
    background: var(--color-secondary);
    color: var(--color-ink);
  }

  .secondary:hover:not(:disabled) {
    background: var(--color-secondary-hover);
  }

  .secondary:active:not(:disabled) {
    background: var(--color-secondary-pressed);
  }

  .tertiary {
    padding: 0 var(--space-4);
    background: transparent;
    color: var(--color-ink);
  }

  .tertiary:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .tertiary:active:not(:disabled) {
    background: var(--color-pressed);
  }

  .button:disabled {
    color: var(--color-disabled);
    cursor: default;
  }

  .primary:disabled {
    background: var(--color-secondary);
  }
</style>
