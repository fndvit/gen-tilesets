<!--
  The grid behind the picture (Figma *Grid*): dashed lines (2 on, 2 off, black at
  10%) at the tileset's cell pitch, across the whole picture area, meeting the rendered cells' edges.

  It is drawn **inside the frame, in the frame's own px**, from the same
  `GridGeometry` the overlays use (`scaleFactor`, `originX`, `originY`), so a
  line lands on a cell edge by construction rather than by a second
  measurement (`07` **R1**, **R6**). It scrolls and zooms with the picture for
  the same reason. The layer reaches far past the frame on every side and the
  picture area clips it (`App.svelte`'s `.preview-body`), which is what makes
  it read as the whole viewport's grid.

  Under the tiles (`z-index: -1` in the frame's stacking context), decorative,
  hidden from assistive technology, and never a pointer target. Preview state
  only (`preview.showGrid`); writes no field.
-->
<script lang="ts">
  import { originX, originY, scaleFactor, type GridGeometry } from "@vit-foundation/gen-tilesets/render";

  interface Props {
    g: GridGeometry;
    /** The display zoom, so the dashes stay the same on screen however far the frame is scaled. */
    zoom: number;
  }

  let { g, zoom }: Props = $props();

  /** How far the layer reaches past the frame, in screen px: more than any column is wide or tall. */
  const REACH = 4000;

  const pitch = $derived(scaleFactor(g) * g.layout.cellSize);
  const x0 = $derived(originX(g));
  const y0 = $derived(originY(g));
  const reach = $derived(REACH / zoom);
  const px = $derived(1 / zoom);
  const id = $props.id();
</script>

{#if pitch > 0}
  <svg
    class="preview-grid"
    aria-hidden="true"
    style="--reach: {reach}px;"
    viewBox="{-reach} {-reach} {g.Wpx + 2 * reach} {2 * reach}"
    preserveAspectRatio="xMinYMin slice"
  >
    <defs>
      <pattern id="{id}-cell" patternUnits="userSpaceOnUse" x={x0} y={y0} width={pitch} height={pitch}>
        <path
          d="M0 {px / 2}H{pitch}M{px / 2} 0V{pitch}"
          style="stroke: var(--color-grid);"
          stroke-width={px}
          stroke-dasharray="{2 * px} {2 * px}"
          fill="none"
        />
      </pattern>
    </defs>
    <rect x={-reach} y={-reach} width={g.Wpx + 2 * reach} height={2 * reach} fill="url(#{id}-cell)" />
  </svg>
{/if}

<style>
  .preview-grid {
    position: absolute;
    top: calc(-1 * var(--reach));
    left: calc(-1 * var(--reach));
    width: calc(100% + 2 * var(--reach));
    height: calc(2 * var(--reach));
    z-index: -1;
    pointer-events: none;
  }
</style>
