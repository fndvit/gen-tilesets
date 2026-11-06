<!--
  The Pattern well's field preview — `DESIGN_SYSTEM.md` *Operation stepper*,
  the Pattern well (item 12, Pol N0–N1).

  The whole grid the preview is showing, one canvas pixel per cell, scaled up
  with `image-rendering: pixelated` to the well's width, keeping the grid's
  ratio; a tall grid is capped at `--field-preview-max-h` and drawn narrower.
  The pixels are `fieldPixels`' (tested there); this only puts them on a
  canvas. Under it, a 0–1 scale from paper to ink.

  Hidden from assistive tech: the fields beside it carry the values, and a
  picture of 7,000 cells has no useful text equivalent.
-->
<script lang="ts">
  import { fieldPixels } from "./field-preview.js";
  import type { FieldCell } from "./palette.js";

  interface Props {
    columns: number;
    rows: number;
    /** The selected cells and the pattern's value at each (`fieldCells`). */
    cells: readonly FieldCell[];
  }

  let { columns, rows, cells }: Props = $props();

  let canvas = $state<HTMLCanvasElement | undefined>(undefined);

  $effect(() => {
    const context = canvas?.getContext("2d");
    if (!context || columns <= 0 || rows <= 0) return;
    context.putImageData(new ImageData(fieldPixels(columns, rows, cells), columns, rows), 0, 0);
  });
</script>

<div class="field-preview" aria-hidden="true">
  <canvas bind:this={canvas} width={columns} height={rows} style="--ratio: {columns / rows}; aspect-ratio: {columns} / {rows}"></canvas>
  <div class="scale t-console"><span>0</span><i></i><span>1</span></div>
</div>

<style>
  .field-preview {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }

  /*
    Full well width, unless the grid is so tall that would push the fields out
    of view: then no taller than --field-preview-max-h, narrower, centred.
  */
  canvas {
    display: block;
    justify-self: center;
    width: min(100%, var(--field-preview-max-h) * var(--ratio));
    height: auto;
    border-radius: var(--radius-xs);
    box-shadow: 0 0 0 var(--rule-w) var(--black-12);
    image-rendering: pixelated;
  }

  .scale {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-muted);
  }

  .scale i {
    flex: 1;
    height: var(--field-scale-h);
    border-radius: calc(var(--field-scale-h) / 2);
    background: linear-gradient(to right, var(--color-paper), var(--color-ink));
    box-shadow: 0 0 0 var(--rule-w) var(--black-12);
  }
</style>
