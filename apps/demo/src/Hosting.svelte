<!--
  **Hosting over content** — a tileset behind a hero's copy, with every 0.6.0
  hosting option on a control.

  This is the fixture `options.avoid`, `sizing` and `align` are judged on. The copy
  is real flowing text in a box that rewraps as the section narrows; the tileset
  is told to keep clear of it by selector, and every tile whose cell touches a
  heading, the paragraph or the button disappears. Things to try, each of which
  the tracker must follow without help:

  - drag the width, in both sizings and both substrates — the copy rewraps and the
    hole follows it, a cell at a time;
  - type into the paragraph (it is `contenteditable`);
  - add and remove a paragraph — the selector is re-resolved;
  - shift the heading, which toggles a class and moves it without resizing it;
  - give the section a fixed height, to see `align.y` choose which rows to crop.

  "Outline targets" draws each target's box with `outline`, which changes no
  layout, so what is outlined is exactly what is measured.

  Built in code over the atlas's tiles, at a 60 px cell so the lattice is legible:
  24 x 6 at a 1440 px reference, zero bleed.
-->
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import {
    prefixedProvider,
    type AlignX,
    type AlignY,
    type Sizing,
    type Substrate,
    type TilesetOptions,
  } from "@fndvit/gen-tilesets/render";

  const provider = prefixedProvider("/atlas");

  const asset = (tile: string, ids: string[]) =>
    ids.map((id) => ({ id, weight: 1, meta: { src: `tiles/${tile}/${id}.svg`, width: 12, height: 12 } }));
  const beige = ["a1", "a3", "a4", "a5", "a6"];

  /** Module scope and passed through `loadTilesetFile`, for Square2x2's reasons (**S3**). */
  const FILE = loadTilesetFile(
    {
      schemaVersion: 2,
      engineVersion: "0.0.0",
      config: {
        rows: 6,
        columns: 24,
        defaultSeed: "hosting",
        tiles: [
          { id: "t1", name: "circle2Beige", assets: asset("t1", beige) },
          { id: "t2", name: "circle4Beige", assets: asset("t2", beige) },
          { id: "t3", name: "circle05Beige", assets: asset("t3", beige) },
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
                { tileId: "t3", weight: 1 },
                { tileId: "t4", weight: 2 },
                { tileId: "t5", weight: 0.6 },
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
      layout: { cellSize: 60, referenceWidth: 1440, yOffset: 0, horizontalAlignment: "column" },
    },
    "hosting (built in code)",
  );

  let substrate = $state<Substrate>("dom");
  let sizing = $state<Sizing>("fluid");
  let alignX = $state<AlignX>("center");
  let alignY = $state<AlignY>("top");
  let avoiding = $state(true);
  let padding = $state(0);
  let width = $state(1100);
  let fixedHeight = $state(false);
  let outline = $state(false);
  let shifted = $state(false);
  let extra = $state(0);

  const options = $derived<TilesetOptions>({
    substrate,
    sizing,
    align: { x: alignX, y: alignY },
    provider,
    ...(avoiding ? { avoid: { targets: ".copy h2, .copy p, .copy button", padding } } : {}),
  });
</script>

<section class="fixture">
  <h2>Hosting over content &mdash; <code>options.avoid</code>, <code>sizing</code>, <code>align</code></h2>

  <div class="controls">
    <label>
      Substrate
      <select bind:value={substrate}>
        <option value="canvas">canvas</option>
        <option value="dom">dom</option>
      </select>
    </label>
    <label>
      Sizing
      <select bind:value={sizing}>
        <option value="fluid">fluid</option>
        <option value="fixed">fixed</option>
      </select>
    </label>
    <label>
      align.x
      <select bind:value={alignX}>
        <option value="left">left</option>
        <option value="center">center</option>
        <option value="right">right</option>
      </select>
    </label>
    <label>
      align.y
      <select bind:value={alignY}>
        <option value="top">top</option>
        <option value="center">center</option>
        <option value="bottom">bottom</option>
      </select>
    </label>
    <label><input type="checkbox" bind:checked={avoiding} /> avoid the copy</label>
    <label>
      padding <code>{padding}px</code>
      <input type="range" min="0" max="40" bind:value={padding} />
    </label>
    <label>
      Section width <code>{width}px</code>
      <input type="range" min="280" max="1440" bind:value={width} />
    </label>
    <label><input type="checkbox" bind:checked={fixedHeight} /> section height 260px</label>
    <label><input type="checkbox" bind:checked={outline} /> outline targets</label>
    <button onclick={() => (shifted = !shifted)}>Shift heading</button>
    <button onclick={() => extra++}>Add paragraph</button>
    <button onclick={() => (extra = Math.max(0, extra - 1))} disabled={extra === 0}>Remove paragraph</button>
  </div>

  <div class="hero" class:outline style="width: {width}px;{fixedHeight ? ' height: 260px;' : ''}">
    <Tileset file={FILE} {options} />
    <div class="copy">
      <h2 class:shifted>Short text, long consequences</h2>
      <p contenteditable="true">
        Every tile whose cell touches this paragraph is hidden, and stays hidden as the text
        rewraps. Type here to make it longer.
      </p>
      {#each Array.from({ length: extra }, (_, i) => i) as i (i)}
        <p>An added paragraph ({i + 1}). The selector is re-resolved when it appears.</p>
      {/each}
      <button type="button">A call to action</button>
    </div>
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

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  /* The host: a section the tileset sits in, sized by the host, with the copy laid
     over it. The tileset is in flow and gives the section its height unless the
     checkbox imposes one; the copy is positioned over it. */
  .hero {
    position: relative;
    max-width: 100%;
    background: #f4efe6;
    color: #1b1b3a;
    overflow: hidden;
  }

  .copy {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 12%;
    pointer-events: none;
  }

  .copy > * {
    pointer-events: auto;
    max-width: 30rem;
    margin: 0;
  }

  .copy h2 {
    font-size: clamp(1.4rem, 4vw, 2.6rem);
    line-height: 1.1;
  }

  .copy h2.shifted {
    margin-left: 18%;
  }

  .copy p {
    font-size: 1rem;
    line-height: 1.45;
  }

  .copy button {
    font: inherit;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    border: 1px solid #1b1b3a;
    background: #1b1b3a;
    color: #f4efe6;
  }

  .outline .copy h2,
  .outline .copy p,
  .outline .copy button {
    outline: 1px dashed #e0245e;
  }
</style>
