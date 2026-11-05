<!--
  One cell of a glyph grid: a `.t-console` label above a 43px artwork slot.

  The cell frame and its states are fixed; **the artwork is not**. A step can
  pass an image (`src`, for the SVG files exported from Figma) or any markup
  (`artwork`), and assumes nothing about pixel grids. With neither, the cell is
  label-only, which is how Attribute, Source and Blend show until their glyphs
  are designed.

  It is a radio, and is meant to live in `GlyphGrid`, which owns the keyboard.

  States, by surface: idle is the well itself; hover washes one step darker;
  selected is a white tile raised off the well with a 2px ink ring, the
  selected state of a control that cannot be filled with ink (the artwork is
  ink, so an ink fill would sink it).
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
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-3) var(--glyph-gap) var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-ink);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      box-shadow var(--dur-fast) var(--ease);
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

  .glyph:hover:not(:disabled):not([aria-checked="true"]) {
    background: var(--color-hover);
  }

  .glyph:active:not(:disabled):not([aria-checked="true"]) {
    background: var(--color-pressed);
  }

  .glyph[aria-checked="true"] {
    background: var(--color-panel);
    box-shadow:
      inset 0 0 0 var(--focus-w) var(--color-selected),
      var(--shadow-raised);
    cursor: default;
  }

  .glyph:focus-visible {
    outline-offset: var(--rule-w);
  }

  .glyph:disabled {
    color: var(--color-disabled);
    cursor: default;
  }
</style>
