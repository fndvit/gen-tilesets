<!--
  A text button for an action: Undo, Import, Download, Save, Cancel.

  A 28px box with the fields' 3:1 edge, so an action and a value sit on the
  same line height. Secondary is the default: paper, hover tints it grey.
  `primary` is black, and there is one per area (Download, Save): black means
  "selected" in a field and "the main thing to do" in a row of buttons, and
  nothing else.

  `wide` stretches it to its container.
-->
<script lang="ts">
  interface Props {
    label: string;
    onclick: (event: MouseEvent) => void;
    disabled?: boolean;
    wide?: boolean;
    variant?: "secondary" | "primary";
  }

  let { label, onclick, disabled = false, wide = false, variant = "secondary" }: Props = $props();
</script>

<button type="button" class="button t-xs" class:wide class:primary={variant === "primary"} {disabled} {onclick}>{label}</button>

<style>
  /* `--control-h` tall: above the 24px target floor (WCAG 2.2, 2.5.8). */
  .button {
    box-sizing: border-box;
    min-height: var(--control-h);
    padding: 0 var(--space-5);
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-paper);
    color: var(--color-ink);
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .wide {
    width: 100%;
  }

  .button:hover:not(:disabled) {
    border-color: var(--color-rule-hover);
    background: var(--color-hover);
  }

  .button:active:not(:disabled) {
    background: var(--color-pressed);
  }

  /* The one primary action of its area: black, the only filled button. */
  .primary {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .primary:hover:not(:disabled) {
    border-color: var(--color-primary-hover);
    background: var(--color-primary-hover);
  }

  .primary:active:not(:disabled) {
    border-color: var(--color-primary-pressed);
    background: var(--color-primary-pressed);
  }

  .button:disabled {
    border-color: var(--color-disabled);
    background: var(--color-paper);
    color: var(--color-disabled);
    cursor: default;
  }
</style>
