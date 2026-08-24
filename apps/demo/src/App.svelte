<!--
  The demo host.

  `08` §3.2 splits the two roles: `<Tileset>` is the **caller** (it invokes
  `generate()`), and whatever mounts it is the **host**. The host supplies a valid
  file and a provider, owns the render box's width, and decides the seed.

  This host also serves as the end-to-end check: three viewport widths with no
  layout shift, a fixed `loadSalt` reproducing one picture, and a fresh one moving
  only the flagged Operation.
-->
<script lang="ts">
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import type { AssetRef } from "@fndvit/gen-tilesets/render";
  import { fixture } from "./fixture.js";

  let seed = $state(fixture.config.defaultSeed);

  /**
   * `07` **R12** — `loadSalt` is a `uint32` drawn **once per render session** and
   * held for its duration. Every regeneration within a session reuses it.
   *
   * `07` §9.3: `Math.random() * 2**32 | 0` is wrong — `|` coerces to int32 and
   * yields a negative number for half of all draws.
   */
  const drawLoadSalt = (): number => Math.floor(Math.random() * 2 ** 32);

  // Drawn here in the host, deliberately. `08` §5.1: sealing the draw inside the
  // component would make it build a payload channel the framework already owns,
  // and drawing it in component initialization or a module-level constant is the
  // mistake -- both run twice under SSR and produce two pictures for one page.
  let loadSalt = $state(0);

  let width = $state(100);
  let failures = $state<string[]>([]);

  /**
   * ADR-006. The demo carries the toggle because this is where the two are
   * comparable: a near-black backdrop, a continuous width slider, and no display
   * zoom in the way. Sweep the slider on each and the difference is the point.
   */
  let substrate = $state<"canvas" | "dom">("canvas");

  function onAssetError(ref: AssetRef, cause: unknown): void {
    // `08` **S6** — the host owns the error channel. A host that ignores this
    // gets a silently incomplete background in production.
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }
</script>

<main>
  <h1>@fndvit/gen-tilesets — first drawn output</h1>

  <div class="controls">
    <label>
      Seed
      <input bind:value={seed} spellcheck="false" />
    </label>

    <label>
      loadSalt <code>{loadSalt}</code>
      <button onclick={() => (loadSalt = drawLoadSalt())}>New load salt</button>
      <button onclick={() => (loadSalt = 0)}>Reset to 0</button>
    </label>

    <label>
      Render box width <code>{width}%</code>
      <input type="range" min="30" max="100" bind:value={width} />
    </label>

    <label>
      Substrate
      <select bind:value={substrate}>
        <option value="canvas">canvas — seamless</option>
        <option value="dom">dom — one img per cell, SSR-able</option>
      </select>
    </label>
  </div>

  <p class="note">
    Only <code>breathe</code> carries <code>reseedOnLoad</code>, so a new load salt moves the
    vertical scale and nothing else. Changing the seed moves everything. The first and last
    columns run off the edges — that is the 80&nbsp;design&nbsp;px of intentional bleed
    (<code>02</code>&nbsp;§7.2), and the top of row&nbsp;0 is clipped by
    <code>yOffset</code>.
  </p>

  <!--
    The host owns the render box's width, through ordinary CSS. There is no width
    prop: `07` §5.3 makes every quantity a fixed fraction of Wpx (`08` §4).
  -->
  <div class="frame" style="width: {width}%;">
    <Tileset file={fixture} {seed} {loadSalt} {substrate} {onAssetError} />
  </div>

  {#if failures.length > 0}
    <ul class="failures">
      {#each failures as failure (failure)}
        <li>{failure}</li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font: 15px/1.5 ui-sans-serif, system-ui, sans-serif;
    background: #11151c;
    color: #e2e8f0;
  }

  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  h1 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
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

  input:not([type]) {
    background: #1a202c;
    border: 1px solid #2d3748;
    color: inherit;
    border-radius: 4px;
    padding: 0.3rem 0.5rem;
    font: inherit;
    width: 9rem;
  }

  button {
    background: #2d3748;
    border: 1px solid #4a5568;
    color: inherit;
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  button:hover {
    background: #4a5568;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    color: #90cdf4;
  }

  .note {
    font-size: 0.85rem;
    color: #718096;
    max-width: 62ch;
    margin: 0 0 1.5rem;
  }

  /*
    A plain block that gives the component its width. The component declares its
    own aspect ratio and no height (**S8**), so nothing here sets one, and there
    is no layout shift at any width.
  */
  .frame {
    background: #0b0e13;
    transition: width 120ms ease;
  }

  .failures {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #fc8181;
  }
</style>
