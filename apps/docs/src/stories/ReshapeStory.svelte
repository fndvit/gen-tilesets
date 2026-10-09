<!--
  `reshape(file, override)`: one design, another shape. Left is the fixture as
  authored, right is the same file reshaped. Same seed, so wherever the two grids
  share a cell they draw the same tile — positional hashing, not a sequence.
-->
<script lang="ts">
  import { loadTilesetFile, reshape, reshapeErrors, shapeOf } from "@fndvit/gen-tilesets";
  import { prefixedProvider } from "@fndvit/gen-tilesets/render";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import raw from "../fixtures/basic.json";

  const base = loadTilesetFile(raw, "fixtures/basic.json");
  const provider = prefixedProvider(import.meta.env.BASE_URL);

  let rows = $state(5);
  let columns = $state(14);
  let useBleed = $state(false);
  let bleed = $state(0);

  const override = $derived(useBleed ? { rows, columns, bleed } : { rows, columns });
  const errors = $derived(reshapeErrors(base, override));
  const shaped = $derived(errors.length === 0 ? reshape(base, override) : base);
  const options = { seed: "opal-ridge-80", provider };
</script>

<div class="not-content">
  <div class="controls">
    <label>rows <input type="number" min="1" max="20" bind:value={rows} /></label>
    <label>columns <input type="number" min="1" max="40" bind:value={columns} /></label>
    <label><input type="checkbox" bind:checked={useBleed} /> set bleed</label>
    {#if useBleed}<label>bleed <input type="number" step="0.5" bind:value={bleed} /></label>{/if}
  </div>

  {#if errors.length > 0}
    <ul class="errors">{#each errors as e (e)}<li>{e}</li>{/each}</ul>
  {/if}

  <div class="pair">
    <figure>
      <figcaption>base: <code>{JSON.stringify(shapeOf(base))}</code></figcaption>
      <div class="stage"><Tileset file={base} {options} /></div>
    </figure>
    <figure>
      <figcaption>reshaped: <code>{JSON.stringify(shapeOf(shaped))}</code></figcaption>
      <div class="stage"><Tileset file={shaped} {options} /></div>
    </figure>
  </div>
</div>

<style>
  .controls { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; font-size: 0.875rem; }
  .controls input[type="number"] { width: 4.5rem; }
  .errors { color: var(--sl-color-red); font-size: 0.8rem; }
  .pair { display: grid; grid-template-columns: 1fr; gap: 1rem; }
  figure { margin: 0; }
  figcaption { font-size: 0.75rem; margin-bottom: 0.25rem; overflow-wrap: anywhere; }
  .stage { outline: 1px dashed var(--sl-color-gray-4); }
</style>
