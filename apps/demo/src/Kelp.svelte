<!--
  **kelp.zip** — an editor export dropped in as-is, on the DOM substrate.

  `public/kelp/` is the unzipped archive, untouched: 34x22, 30px cells on a
  1000px reference width, so the grid overhangs the box by a fraction of a cell
  on each side (`horizontalAlignment: "gutter"`). It is a schema 4 file and the
  first fixture to exercise `translateX` / `translateY` (op4, op5) — per-cell
  offsets driven by value noise, layered on a noise-driven `scale` (op2).

  It is also the `options.overflow` fixture. Under `"visible"`, the moved tiles on
  the bottom row show whole below the box instead of cut, and so do the side bleed
  and the culled spill columns. The section's padding is the room they paint into.

  Loaded by fetch rather than inlined, for the reason `App.svelte` gives: a served
  archive is what a consumer has.
-->
<script lang="ts">
  import { loadTilesetFile, type TilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import { prefixedProvider, type AssetRef, type Overflow } from "@fndvit/gen-tilesets/render";

  const ARCHIVE = "/kelp";
  const provider = prefixedProvider(ARCHIVE);

  let file = $state<TilesetFile | null>(null);
  let loadError = $state<string | null>(null);
  let seed = $state("");
  let failures = $state<string[]>([]);
  let overflow = $state<Overflow>("visible");

  void fetch(`${ARCHIVE}/tileset.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<unknown>;
    })
    .then((raw) => {
      const loaded = loadTilesetFile(raw, "kelp.zip");
      seed = loaded.config.defaultSeed;
      // Assigned last: a stable reference (**S3**), keyed on under DEV.
      file = loaded;
    })
    .catch((cause: unknown) => {
      loadError = String(cause);
    });

  function onAssetError(ref: AssetRef, cause: unknown): void {
    // Deduplicated for `App.svelte`'s reason: it fires once per cell.
    const line = `${ref.tileId}/${ref.assetId}: ${String(cause)}`;
    if (!failures.includes(line)) failures = [...failures, line];
  }
</script>

  <h2>kelp.zip &mdash; 34&times;22, 30px cells, translate + scale, dom substrate</h2>

  <div class="controls">
    <label>
      Seed
      <input bind:value={seed} spellcheck="false" />
    </label>

    <label>
      Overflow
      <select bind:value={overflow}>
        <option value="visible">visible — tiles past the edge drawn whole</option>
        <option value="hidden">hidden — the box clips (R9)</option>
      </select>
    </label>
  </div>

    {#if file !== null}
      <Tileset {file} options={{ seed, substrate: "dom", overflow, provider, onAssetError }} />
    {/if}

  {#if loadError !== null}
    <p class="failures">kelp.zip failed to load: {loadError}</p>
  {/if}

  {#if failures.length > 0}
    <ul class="failures">
      {#each failures as failure (failure)}
        <li>{failure}</li>
      {/each}
    </ul>
  {/if}

<style>
  section {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }

  .controls {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  label {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.85rem;
    color: #a0aec0;
  }

  select {
    background: #2d3748;
    border: 1px solid #4a5568;
    color: inherit;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font: inherit;
    font-size: 0.8rem;
  }

  input {
    background: #1a202c;
    border: 1px solid #2d3748;
    color: inherit;
    border-radius: 4px;
    padding: 0.3rem 0.5rem;
    font: inherit;
    width: 9rem;
  }

  .failures {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #fc8181;
  }
</style>
