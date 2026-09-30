<!--
  **Responsive rules** — one file, a different shape per width, and the same
  design at every one (0.7.0).

  The hero carries its breakpoints **in the file**: 24 x 6 on a wide box, 15
  columns at or below 900px, and 9 x 10 at or below 500px, where both rules hold
  and the later wins `columns`. Things to judge, each of which the package must
  get right without help from this page:

  - drag the width across 900 and 500, on both substrates — the grid changes at
    exactly the bound (both are inclusive), and every cell present on both sides
    keeps its tile (positional hashing), so the picture extends or trims rather
    than reshuffling;
  - drag inside a band — nothing regenerates, the picture only scales;
  - reload the page with the width below 500 — the box reserves the 9 x 10 height
    on the first frame, by container query, so nothing jumps;
  - "host rules" replaces the file's rules wholesale with one of the page's own:
    fixed 40px cells, left-aligned, below 700px.

  The decorations below the hero are the second use: a `<TileDecoration>` shrinks
  its tiles when its slot is narrower than `columns * cellSize`; one host rule
  switching it to `sizing: "fixed"` keeps the tile size and crops instead.
-->
<script lang="ts">
  import { activeKey, loadTilesetFile, type TilesetFile } from "@fndvit/gen-tilesets";
  import TileDecoration from "@fndvit/gen-tilesets/TileDecoration.svelte";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import { prefixedProvider, type HostRule, type Substrate } from "@fndvit/gen-tilesets/render";

  const provider = prefixedProvider("/atlas");

  const asset = (tile: string, ids: string[]) =>
    ids.map((id) => ({ id, weight: 1, meta: { src: `tiles/${tile}/${id}.svg`, width: 12, height: 12 } }));
  const beige = ["a1", "a3", "a4", "a5", "a6"];

  /** Module scope and passed through `loadTilesetFile`, for Square2x2's reasons (**S3**). */
  const FILE: TilesetFile = loadTilesetFile(
    {
      schemaVersion: 3,
      engineVersion: "0.0.0",
      config: {
        rows: 6,
        columns: 24,
        defaultSeed: "responsive",
        tiles: [
          { id: "t1", name: "circle2Beige", assets: asset("t1", beige) },
          { id: "t2", name: "circle4Beige", assets: asset("t2", beige) },
          { id: "t4", name: "circleSolidBeige", assets: asset("t4", beige) },
          { id: "t5", name: "solidPink", assets: asset("t5", ["a1", "a2", "a3", "a4", "a5"]) },
        ],
        operations: [
          {
            id: "tiles",
            selection: { type: "all" },
            source: { type: "random" },
            target: "tileId",
            mapping: {
              palette: [
                { tileId: "t1", weight: 1 },
                { tileId: "t2", weight: 1 },
                { tileId: "t4", weight: 2 },
                { tileId: "t5", weight: 0.6 },
                { tileId: null, weight: 1.5 },
              ],
            },
            blend: "set",
          },
          {
            id: "turns",
            selection: { type: "all" },
            source: { type: "random" },
            target: "rotation",
            mapping: { range: [0, 270], steps: 4 },
            blend: "set",
          },
        ],
      },
      layout: { cellSize: 60, referenceWidth: 1440, yOffset: 0, horizontalAlignment: "gutter" },
      responsive: [
        { maxWidth: 900, columns: 15 },
        { maxWidth: 500, columns: 9, rows: 10 },
      ],
    },
    "responsive (built in code)",
  );

  const HOST_RULES: HostRule[] = [{ maxWidth: 700, sizing: "fixed", cellSize: 40, align: { x: "left" } }];

  /** A decoration's tile size, and the rule that keeps it below the slot's width. */
  const CELL = 44;
  const keepTiles = (columns: number): HostRule[] => [{ maxWidth: columns * CELL - 0.01, sizing: "fixed", align: { x: "left" } }];

  let substrate = $state<Substrate>("dom");
  let width = $state(1100);
  let hostRules = $state(false);
  let slot = $state(300);

  /**
   * The hero's own width, not the slider's: `max-width: 100%` caps it on a narrow
   * page, and rules follow the render box. `contentRect` is fractional, as the
   * package's measurement is, so the readout agrees with it at the bounds.
   */
  let heroRect = $state<DOMRectReadOnly | undefined>(undefined);
  const rules = $derived(hostRules ? HOST_RULES : (FILE.responsive ?? []));
  const holding = $derived(activeKey(rules, heroRect?.width ?? 0));
</script>

<section class="fixture">
  <h2>Responsive rules &mdash; <code>responsive</code>, in the file and in <code>options</code></h2>

  <div class="controls">
    <label>
      Substrate
      <select bind:value={substrate}>
        <option value="canvas">canvas</option>
        <option value="dom">dom</option>
      </select>
    </label>
    <label>
      Width <input type="range" min="240" max="1440" step="1" bind:value={width} />
      <code>{width}px</code>
    </label>
    <label><input type="checkbox" bind:checked={hostRules} /> host rules</label>
    <span>
      box <code>{Math.round(heroRect?.width ?? 0)}px</code> · holding:
      <code>{holding === "" ? "base" : `rules ${holding}`}</code>
    </span>
  </div>

  <div class="hero" style="width: {width}px;" bind:contentRect={heroRect}>
    <Tileset
      file={FILE}
      options={{ substrate, provider, ...(hostRules ? { responsive: HOST_RULES } : {}) }}
    />
  </div>

  <h3>Decorations in a slot</h3>
  <div class="controls">
    <label>
      Slot <input type="range" min="80" max="400" step="1" bind:value={slot} />
      <code>{slot}px</code>
    </label>
  </div>
  <div class="slots">
    <figure>
      <div class="slot" style="width: {slot}px;">
        <TileDecoration style={FILE} rows={3} columns={6} cellSize={CELL} options={{ substrate, provider, seed: "shrinks" }} />
      </div>
      <figcaption>fluid — shrinks with the slot</figcaption>
    </figure>
    <figure>
      <div class="slot" style="width: {slot}px;">
        <TileDecoration
          style={FILE}
          rows={3}
          columns={6}
          cellSize={CELL}
          options={{ substrate, provider, seed: "shrinks", responsive: keepTiles(6) }}
        />
      </div>
      <figcaption>fixed below its width — keeps {CELL}px tiles, crops</figcaption>
    </figure>
  </div>
</section>

<style>
  .fixture {
    max-width: 1500px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }

  h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .hero {
    max-width: 100%;
    background: #f4efe6;
  }

  .slots {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
  }

  figure {
    margin: 0;
  }

  .slot {
    background: #f4efe6;
    outline: 1px dashed #c9bfae;
  }

  figcaption {
    font-size: 0.8rem;
    margin-top: 0.4rem;
  }
</style>
