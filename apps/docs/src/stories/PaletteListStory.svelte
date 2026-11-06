<!--
  The editor's `PaletteList`, rendered alone with the docs fixture's tiles. The
  story keeps the palette, measures the coverage the way `OperationBody` does
  (`fieldOf` over a shadow config, then `coverageOf`), and shows what
  `onChange` hands back. Switch the Pattern to see the list's three shapes.
-->
<script lang="ts">
  import { loadTilesetFile, sources, type Operation, type PaletteEntry } from "@vit-foundation/gen-tilesets";
  import PaletteList from "../../../editor/src/controls/PaletteList.svelte";
  import { coverageOf, fieldOf } from "../../../editor/src/controls/palette.js";
  import { defaultParams } from "../../../editor/src/draft.svelte.js";
  import raw from "../fixtures/basic.json";

  const config = loadTilesetFile(raw, "fixtures/basic.json").config;
  const { tiles } = config;
  let palette = $state<PaletteEntry[]>([
    { tileId: "solid", weight: 2 },
    { tileId: "wedge", weight: 1 },
    { tileId: null, weight: 3 },
  ]);
  let sourceType = $state<string>("valueNoise");

  /** The pattern's `t` over a 20×10 grid, every cell selected. Does not read the palette. */
  const field = $derived.by(() => {
    const op: Operation = {
      id: "story",
      selection: { type: "all" },
      source: { type: sourceType, ...defaultParams(sources.get(sourceType).params) },
      target: "tileId",
      mapping: { palette: [{ tileId: null, weight: 1 }] },
      blend: "set",
    };
    return fieldOf({ ...config, rows: 10, columns: 20, operations: [op] }, "story", "docs", 0);
  });
  const coverage = $derived(coverageOf(field, palette));
</script>

<div class="not-content">
  <label class="src">
    Pattern (sourceType)
    <select bind:value={sourceType}>
      <option>valueNoise</option><option>random</option><option>gradient</option><option>constant</option>
    </select>
  </label>
  <PaletteList {palette} {tiles} {sourceType} {coverage} onChange={(p) => (palette = p)} />
  <pre>{JSON.stringify(palette)}</pre>
</div>

<style>
  .src { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; }
  pre { font-size: 0.75rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
