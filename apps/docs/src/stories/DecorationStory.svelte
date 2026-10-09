<!--
  `<TileDecoration>`: one style, placed at a block size the page chooses. The
  box is `columns * cellSize` CSS px wide, so the tile size shown here is the one
  asked for until the column is narrower than that (then `max-width: 100%` wins).
-->
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import { prefixedProvider } from "@fndvit/gen-tilesets/render";
  import TileDecoration from "@fndvit/gen-tilesets/TileDecoration.svelte";
  import raw from "../fixtures/basic.json";

  const style = loadTilesetFile(raw, "fixtures/basic.json");
  const provider = prefixedProvider(import.meta.env.BASE_URL);

  let rows = $state(2);
  let columns = $state(3);
  let cellSize = $state(48);
  let seed = $state("corner-1");
</script>

<div class="not-content">
  <div class="controls">
    <label>rows <input type="number" min="1" max="8" bind:value={rows} /></label>
    <label>columns <input type="number" min="1" max="12" bind:value={columns} /></label>
    <label>cellSize <input type="number" min="8" max="120" bind:value={cellSize} /></label>
    <label>seed <input bind:value={seed} /></label>
  </div>

  <p class="note">Box width: {columns} × {cellSize} = {columns * cellSize}px</p>
  <div class="stage">
    <TileDecoration {style} {rows} {columns} {cellSize} options={{ seed, provider }} />
  </div>
</div>

<style>
  .controls { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; font-size: 0.875rem; }
  .controls input[type="number"] { width: 4.5rem; }
  .note { font-size: 0.8rem; color: var(--sl-color-gray-3); }
  .stage { outline: 1px dashed var(--sl-color-gray-4); display: inline-block; max-width: 100%; }
</style>
