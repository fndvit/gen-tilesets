<!--
  The editor's `PaletteBar`, rendered alone with the docs fixture's tiles. It
  holds no state of its own: the story keeps the palette and shows what
  `onChange` hands back. Switch the Source to `random` to see its advisory.
-->
<script lang="ts">
  import { loadTilesetFile, type PaletteEntry } from "@fndvit/gen-tilesets";
  import PaletteBar from "../../../editor/src/controls/PaletteBar.svelte";
  import raw from "../fixtures/basic.json";

  const { tiles } = loadTilesetFile(raw, "fixtures/basic.json").config;
  let palette = $state<PaletteEntry[]>([
    { tileId: "solid", weight: 2 },
    { tileId: "wedge", weight: 1 },
    { tileId: null, weight: 3 },
  ]);
  let sourceType = $state<string>("valueNoise");
</script>

<div class="not-content">
  <label class="src">
    sourceType
    <select bind:value={sourceType}>
      <option>valueNoise</option><option>random</option><option>gradient</option><option>constant</option>
    </select>
  </label>
  <PaletteBar {palette} {tiles} {sourceType} onChange={(p) => (palette = p)} />
  <pre>{JSON.stringify(palette)}</pre>
</div>

<style>
  .src { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; }
  pre { font-size: 0.75rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
