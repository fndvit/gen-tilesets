<!--
  One cell of a glyph grid: a `.t-console` label above a 43px artwork slot.

  The cell frame and its states are fixed; **the artwork is not**. A step can
  pass an image (`src`, for the SVG files exported from Figma) or any markup
  (`artwork`), and assumes nothing about pixel grids. With neither, the cell is
  label-only, which is how Attribute, Source and Blend show until their glyphs
  are designed.

  It is a radio, and is meant to live in `GlyphGrid`, which owns the keyboard.

  States: selected and hover look the same, a `--color-inactive` fill with a
  1px ink frame (Figma node 2034:658). Hover does not invert as chips do,
  because inverting would sink the ink artwork into an ink fill.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    selected?: boolean;
    disabled?: boolean;
    onclick: () => void;
    /** URL of the artwork image. Its label is the visible text, so the image is decorative. */
    src?: string;
    artwork?: Snippet;
    tabindex?: number;
    onkeydown?: (event: KeyboardEvent) => void;
    /** For the grid's roving focus. */
    element?: HTMLButtonElement | undefined;
  }

  let {
    label,
    selected = false,
    disabled = false,
    onclick,
    src,
    artwork,
    tabindex = 0,
    onkeydown,
    element = $bindable(),
  }: Props = $props();
</script>

<button
  bind:this={element}
  type="button"
  role="radio"
  class="glyph"
  class:label-only={!src && !artwork}
  aria-checked={selected}
  {tabindex}
  {disabled}
  {onclick}
  {onkeydown}
>
  <span class="label t-console">{label}</span>
  {#if src || artwork}
    <span class="slot">
      {#if artwork}
        {@render artwork()}
      {:else}
        <img {src} alt="" width="43" height="43" />
      {/if}
    </span>
  {/if}
</button>

<style>
  .glyph {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-1) var(--glyph-gap);
    /* Always framed, transparent when idle, so selecting never shifts the layout. */
    border: var(--rule-w) solid transparent;
    border-radius: var(--radius-xs);
    background: var(--color-paper);
    color: var(--color-ink);
    cursor: pointer;
  }

  .label-only {
    justify-content: center;
    min-height: var(--glyph-h);
  }

  /*
    No `overflow: hidden` here: `.t-console` trims the box to cap height, so
    clipping would cut the descenders off "Every Nth" and "Handpick".
  */
  .label {
    white-space: nowrap;
  }

  /* With no artwork the label is the whole cell, so a long one wraps rather than running into the next cell. */
  .label-only .label {
    white-space: normal;
    text-align: center;
  }

  .slot {
    display: flex;
    padding: var(--space-1);
  }

  .slot > :global(*) {
    display: block;
    width: var(--glyph-slot);
    height: var(--glyph-slot);
  }

  .glyph:hover:not(:disabled),
  .glyph[aria-checked="true"] {
    border-color: var(--color-ink);
    background: var(--color-inactive);
  }

  .glyph:disabled {
    color: var(--color-inactive);
    cursor: default;
  }
</style>
