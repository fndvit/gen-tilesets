<!--
  A live `<Tileset>` with the options a contributor most often needs to poke.
  The file goes through `loadTilesetFile`, the plain consumer's door, so a
  fixture that stops validating fails here loudly rather than rendering wrong.
-->
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import { prefixedProvider } from "@fndvit/gen-tilesets/render";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import raw from "../fixtures/basic.json";

  const file = loadTilesetFile(raw, "fixtures/basic.json");
  const provider = prefixedProvider(import.meta.env.BASE_URL);

  let seed = $state("opal-ridge-80");
  let loadSalt = $state(0);
  let substrate = $state<"canvas" | "dom">("canvas");
  let width = $state(100);
</script>

<div class="not-content">
  <div class="controls">
    <label>seed <input bind:value={seed} /></label>
    <label>loadSalt <input type="number" bind:value={loadSalt} /></label>
    <label>
      substrate
      <select bind:value={substrate}>
        <option value="canvas">canvas</option>
        <option value="dom">dom</option>
      </select>
    </label>
    <label>width {width}% <input type="range" min="20" max="100" bind:value={width} /></label>
  </div>

  <div class="stage" style:width="{width}%">
    <Tileset {file} options={{ seed, loadSalt, substrate, provider }} />
  </div>
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }
  .stage {
    border: 1px dashed var(--sl-color-gray-4);
  }
</style>
