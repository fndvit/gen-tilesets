<!--
  The "+" control that adds something: a breakpoint, a tile group, an
  operation, a variant.

  Two shapes. `bar` spans its container at `--add-h` and shows its `label` as
  text after the plus ("+ Add breakpoint"), so what it adds is read, not
  guessed. It is a tertiary action: text on the panel, a grey wash under the
  pointer. `square` is a grey `--thumb` square with the plus alone, lined up
  with a tile group's thumbnails; its `label` is then its accessible name.

  `haspopup` marks one that opens a dialog first (B-016 S3c: Tiles' bars open
  the Tile gallery), so a screen reader announces it before it is pressed.
-->
<script lang="ts">
  import Icon from "./Icon.svelte";

  interface Props {
    label: string;
    onclick: (event: MouseEvent) => void;
    variant?: "bar" | "square";
    disabled?: boolean;
    /** Set when it opens a dialog rather than adding at once: Tiles' bars open the Tile gallery. */
    haspopup?: "dialog" | undefined;
  }

  let { label, onclick, variant = "bar", disabled = false, haspopup }: Props = $props();
</script>

{#if variant === "bar"}
  <button type="button" class="add bar t-xs" aria-haspopup={haspopup} {disabled} {onclick}>
    <Icon name="plus" />
    <span>{label}</span>
  </button>
{:else}
  <button
    type="button"
    class="add square"
    aria-label={label}
    aria-haspopup={haspopup}
    title={label}
    {disabled}
    {onclick}
  >
    <Icon name="plus" />
  </button>
{/if}

<style>
  .add {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .bar {
    gap: var(--space-4);
    width: 100%;
    height: var(--add-h);
    padding: 0 var(--space-5);
    background: transparent;
    line-height: normal;
    text-box: none;
  }

  .square {
    justify-content: center;
    width: var(--thumb);
    height: var(--thumb);
    background: var(--color-secondary);
  }

  .bar:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .square:hover:not(:disabled) {
    background: var(--color-secondary-hover);
  }

  .bar:active:not(:disabled) {
    background: var(--color-pressed);
  }

  .square:active:not(:disabled) {
    background: var(--color-secondary-pressed);
  }

  .add:focus-visible {
    outline-offset: 0;
  }

  .add:disabled {
    color: var(--color-disabled);
    cursor: default;
  }
</style>
