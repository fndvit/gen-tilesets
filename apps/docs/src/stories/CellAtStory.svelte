<!--
  The pointer → cell path an editor takes: `metricsOf(box)` and `toRenderSpace`
  turn a client point into render space, `cellAt` turns that into grid
  coordinates, and `cellBox` gives the cell's rect back to draw the highlight.
  The `TileState` shown is read from `generate()`'s grid with `tileStateAt`.
-->
<script lang="ts">
  import { generate, loadTilesetFile, tileStateAt } from "@fndvit/gen-tilesets";
  import {
    cellAt,
    cellBox,
    metricsOf,
    prefixedProvider,
    toRenderSpace,
    type GridGeometry,
  } from "@fndvit/gen-tilesets/render";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import raw from "../fixtures/basic.json";

  const file = loadTilesetFile(raw, "fixtures/basic.json");
  const provider = prefixedProvider(import.meta.env.BASE_URL);
  const seed = "opal-ridge-80";
  const grid = generate(file.config, seed, 0);

  let box = $state<HTMLElement | null>(null);
  let hit = $state<{ px: number; py: number; x: number; y: number; g: GridGeometry } | null>(null);

  function onmove(e: PointerEvent) {
    if (!box) return;
    const m = metricsOf(box);
    const { px, py } = toRenderSpace(m, e.clientX, e.clientY);
    const g: GridGeometry = {
      layout: file.layout,
      rows: file.config.rows,
      columns: file.config.columns,
      Wpx: m.layoutWidth,
    };
    hit = { px, py, ...cellAt(g, px, py), g };
  }

  const rect = $derived(hit ? cellBox(hit.g, hit.x, hit.y) : null);
  const tile = $derived(hit ? tileStateAt(grid, hit.x, hit.y) : undefined);
</script>

<div class="not-content">
  <p class="readout">
    {#if hit}
      render space ({hit.px.toFixed(1)}, {hit.py.toFixed(1)}) → cell ({hit.x}, {hit.y})
      {#if tile}· <code>{JSON.stringify(tile)}</code>{:else}· outside the grid{/if}
    {:else}
      Move the pointer over the tileset.
    {/if}
  </p>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="stage" onpointermove={onmove} onpointerleave={() => (hit = null)}>
    <Tileset {file} options={{ seed, provider }} bind:box />
    {#if rect}
      <div
        class="hl"
        style:left="{rect.left}px"
        style:top="{rect.top}px"
        style:width="{rect.right - rect.left}px"
        style:height="{rect.bottom - rect.top}px"
      ></div>
    {/if}
  </div>
</div>

<style>
  .readout { font-size: 0.8rem; min-height: 3em; overflow-wrap: anywhere; }
  .stage { position: relative; outline: 1px dashed var(--sl-color-gray-4); }
  .hl {
    position: absolute;
    pointer-events: none;
    outline: 2px solid var(--sl-color-accent);
    background: color-mix(in srgb, var(--sl-color-accent) 20%, transparent);
  }
</style>
