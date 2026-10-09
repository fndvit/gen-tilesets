<!--
  `hash(effectiveSeed, channel, x, y, salt)` is a pure function of its five
  inputs. Each cell below is hashed independently from its own coordinates, so
  no cell's value depends on the order cells are visited in or on how many
  there are, which is what keeps a resize stable.
-->
<script lang="ts">
  import { effectiveSeeds, generate, hash, loadTilesetFile } from "@fndvit/gen-tilesets";
  import raw from "../fixtures/basic.json";

  const file = loadTilesetFile(raw, "fixtures/basic.json");

  let seed = $state("opal-ridge-80");
  let loadSalt = $state(0);
  let channel = $state("fill");
  let salt = $state(0);
  let cols = $state(16);
  const rows = 6;

  const seeds = $derived(effectiveSeeds(seed, loadSalt));
  const cells = $derived(
    Array.from({ length: rows * cols }, (_, i) => {
      const x = i % cols;
      const y = Math.floor(i / cols);
      return { x, y, v: hash(seeds.plain, channel, x, y, salt) };
    }),
  );

  // Determinism, checked rather than asserted: two independent runs, compared.
  const same = $derived(
    JSON.stringify(generate(file.config, seed, loadSalt)) ===
      JSON.stringify(generate(file.config, seed, loadSalt)),
  );
</script>

<div class="not-content">
  <div class="controls">
    <label>seed <input bind:value={seed} /></label>
    <label>loadSalt <input type="number" bind:value={loadSalt} /></label>
    <label>channel <input bind:value={channel} /></label>
    <label>salt <input type="number" bind:value={salt} /></label>
    <label>columns {cols} <input type="range" min="4" max="24" bind:value={cols} /></label>
  </div>

  <p class="readout">
    <code>effectiveSeeds</code>: plain = {seeds.plain}, onLoad = {seeds.onLoad} ·
    <code>generate()</code> twice with these inputs: {same ? "identical" : "DIFFERENT"}
  </p>

  <div class="grid" style:grid-template-columns="repeat({cols}, 1fr)">
    {#each cells as c (c.x + "," + c.y)}
      <div
        class="cell"
        style:background="hsl(0 0% {Math.round(c.v * 100)}%)"
        title="({c.x}, {c.y}) → {c.v}"
      ></div>
    {/each}
  </div>
  <p class="readout">Widen or narrow the grid: the cells that remain keep their shade.</p>
</div>

<style>
  .controls { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; font-size: 0.875rem; }
  .controls input[type="number"] { width: 5rem; }
  .readout { font-size: 0.8rem; overflow-wrap: anywhere; }
  .grid { display: grid; gap: 1px; max-width: 40rem; }
  .cell { aspect-ratio: 1; }
</style>
