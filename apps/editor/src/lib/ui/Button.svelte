<!--
  A text button for an action: Undo, Import, Download, Save, Cancel.

  It borrows the chip from `Toggle` (1px border, 4px padding, `.t-xs`, hover
  inverts), so an action and a choice read as the same family. The difference
  is that a chip stays filled when chosen and a button never does: pressing it
  does something, it does not select anything.

  `wide` stretches it to its container, for an action that closes a column.
-->
<script lang="ts">
  interface Props {
    label: string;
    onclick: (event: MouseEvent) => void;
    disabled?: boolean;
    wide?: boolean;
  }

  let { label, onclick, disabled = false, wide = false }: Props = $props();
</script>

<button type="button" class="button t-xs" class:wide {disabled} {onclick}>{label}</button>

<style>
  /* `--control-h` tall: above the 24px target floor (WCAG 2.2, 2.5.8). */
  .button {
    box-sizing: border-box;
    min-height: var(--control-h);
    padding: 0 var(--space-4);
    border: var(--rule);
    background: var(--color-paper);
    color: var(--color-ink);
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }

  .wide {
    width: 100%;
  }

  .button:hover:not(:disabled) {
    background: var(--color-ink);
    color: var(--color-paper);
  }

  .button:active:not(:disabled) {
    background: var(--color-pressed);
    color: var(--color-on-pressed);
  }

  .button:disabled {
    border-color: var(--color-inactive);
    color: var(--color-inactive);
    cursor: default;
  }
</style>
