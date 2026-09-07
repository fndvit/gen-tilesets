<!--
  The demo host, and a **seam and softness instrument**.

  `08` §3.2 splits the two roles: `<Tileset>` is the **caller** (it invokes
  `generate()`), and whatever mounts it is the **host**. The host supplies a valid
  file and a provider, owns the render box's width, and decides the seed.

  It draws `public/atlas/` — a committed export of the footer preset
  `SUBPIXEL-GEOMETRY.md` was written about: 76x10, zero bleed, 12px assets, full
  bleed here, so the cell lands at roughly 15 device px. That is a real design and
  the small-cell end of the range, which is where a hairline between two cells and
  a soft upscaled edge are visible and where the substrate toggle is worth reading.
  It is loaded rather than inlined because a served archive is what a consumer has
  (`README.md`, *How to use it*), so this page exercises that path.

  The other fixture in this app, `Square2x2.svelte`, is the opposite regime: a
  ~350 device px cell, where geometry shows instead.
-->
<script lang="ts">
  import { loadTilesetFile, type TilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import { prefixedProvider, type AssetRef } from "@fndvit/gen-tilesets/render";
  import Square2x2 from "./Square2x2.svelte";

  /**
   * The archive root, served statically. `meta.src` is written relative to it
   * with no leading slash (`07` §4.4), so the provider is what anchors it — the
   * file itself is handed to `<Tileset>` unrewritten.
   */
  const ARCHIVE = "/atlas";
  const provider = prefixedProvider(ARCHIVE);

  let file = $state<TilesetFile | null>(null);
  let loadError = $state<string | null>(null);
  let seed = $state("");

  // One call, and it throws: `migrate()` before `validate()`, because rewriting a
  // version is a coercion and `validate()` never coerces. A load failure is loud.
  void fetch(`${ARCHIVE}/tileset.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<unknown>;
    })
    .then((raw) => {
      const loaded = loadTilesetFile(raw, "atlas.zip");
      seed = loaded.config.defaultSeed;
      // Assigned last: the `file` prop must be a stable reference (**S3**), and
      // `<Tileset>` is keyed on it under DEV.
      file = loaded;
    })
    .catch((cause: unknown) => {
      loadError = String(cause);
    });

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
   * ADR-006, and now three of them. The demo carries the toggle because this is
   * where they are comparable: a near-black backdrop, a continuous width slider,
   * and no display zoom in the way. Sweep the slider on each and the difference
   * is the point.
   *
   * The initial value is read from `?substrate=`, so a headless capture can
   * select one without clicking. The `<select>` still drives it thereafter.
   */
  const fromQuery = new URLSearchParams(location.search).get("substrate");
  let substrate = $state<"canvas" | "dom" | "svg">(
    fromQuery === "dom" || fromQuery === "svg" ? fromQuery : "canvas",
  );

  function onAssetError(ref: AssetRef, cause: unknown): void {
    // `08` **S6** — the host owns the error channel. A host that ignores this
    // gets a silently incomplete background in production.
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }
</script>

<main>
  <h1>atlas.zip — 76&times;10, 12px assets, full bleed</h1>

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
      Render box width <code>{width}vw</code>
      <input type="range" min="30" max="100" bind:value={width} />
    </label>

    <label>
      Substrate
      <select bind:value={substrate}>
        <option value="canvas">canvas — seamless</option>
        <option value="dom">dom — one img per cell, SSR-able</option>
        <option value="svg">svg — crispest, seams at every edge</option>
      </select>
    </label>
  </div>
</main>

<!--
  Full bleed: the host owns the render box's width through ordinary CSS, and here
  that width is the viewport. There is no width prop — `07` §5.3 makes every
  quantity a fixed fraction of Wpx (`08` §4).
-->
<div class="frame" style="width: {width}vw;">
  {#if file !== null}
    <Tileset {file} {seed} {loadSalt} {substrate} {provider} {onAssetError} />
  {/if}
</div>

<!--
  A second fixture, and the opposite regime: 2x2 at a ~350 device px cell in an
  absolutely-positioned box, where one device pixel of misplacement is largest. The
  footer preset above is where softness and seams show; this is where geometry does.
-->
<Square2x2 />

<main>
  {#if loadError !== null}
    <p class="failures">atlas.zip failed to load: {loadError}</p>
  {/if}

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
    padding: 1.5rem 1.5rem 1rem;
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

  /*
    A plain block that gives the component its width, centred in the viewport so
    a sub-100vw reading is still symmetric. The component declares its own aspect
    ratio and no height (**S8**), so nothing here sets one.
  */
  .frame {
    background: #0b0e13;
    margin: 0 auto;
  }

  .failures {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #fc8181;
  }
</style>
