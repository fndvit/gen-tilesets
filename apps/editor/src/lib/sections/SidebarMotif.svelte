<!--
  The tile motif in the sidebar's free space (batch 01, T-06, B-004): below
  the last section, a quiet checkered field that fills whatever room the
  sections leave and goes away when they take it all.

  It is the flex remainder of the sidebar's `ScrollArea fill` column: it takes
  the height left under `.sections`, and none when the sections are taller
  than the area. The decoration inside is absolutely placed, so it never adds
  to the height it measures: drawing it cannot grow the column, change the
  measurement and draw again, and cannot add a scrollbar.

  Whole tiles only, centred across the width and sitting on the bottom edge,
  so the cut-off part of the pattern is at the top, against the sections.
  `motif.ts` holds the style, the size rule and the look's constants.

  Decorative: `aria-hidden`, never focusable, and the pointer goes through it.
-->
<script lang="ts">
  import TileDecoration from "@vit-foundation/gen-tilesets/TileDecoration.svelte";
  import { MOTIF_CELL, motifShape, motifStyle } from "./motif.js";

  const style = motifStyle();

  let width = $state(0);
  let height = $state(0);

  const shape = $derived(motifShape(width, height));
</script>

<div class="motif" aria-hidden="true" bind:clientWidth={width} bind:clientHeight={height}>
  {#if shape}
    <div class="field">
      <TileDecoration {style} rows={shape.rows} columns={shape.columns} cellSize={MOTIF_CELL} />
    </div>
  {/if}
</div>

<style>
  /* The column's remainder; 0 when the sections fill the area. */
  .motif {
    position: relative;
    flex: 1 1 0;
    min-height: 0;
    margin: 0 var(--space-4) var(--space-4);
    overflow: hidden;
    pointer-events: none;
    user-select: none;
  }

  .field {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
  }
</style>
