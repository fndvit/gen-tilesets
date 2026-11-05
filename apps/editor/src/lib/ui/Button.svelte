<!--
  A text button for an action: Undo, Import, Download, Save, Cancel.

  Three weights, by fill, never by border:
  - `primary`: ink with white text. One per area, for the action the area
    exists for (Download in the footer, Save in an operation body).
  - `secondary` (default): a grey fill one step darker than the panel.
  - `tertiary`: text only; a wash appears under the pointer (Discard, Reset).

  Each darkens a step on hover and another while pressed. `wide` stretches it to
  its container.
-->
<script lang="ts">
  interface Props {
    label: string;
    onclick: (event: MouseEvent) => void;
    disabled?: boolean;
    wide?: boolean;
    variant?: "primary" | "secondary" | "tertiary";
  }

  let { label, onclick, disabled = false, wide = false, variant = "secondary" }: Props = $props();
</script>

<button type="button" class="button t-xs {variant}" class:wide {disabled} {onclick}>{label}</button>

<style>
  /* `--control-h` tall: above the 24px target floor (WCAG 2.2, 2.5.8). */
  .button {
    box-sizing: border-box;
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

  .wide {
    width: 100%;
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
