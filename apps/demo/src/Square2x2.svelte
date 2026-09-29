<!--
  A **geometry instrument**: 2x2 square tiles, one absolutely-positioned box, one
  large cell, and a fine width control.

  The other fixture in this app is the footer preset — 76x10 at a ~15 device px
  cell — which is where softness and seams show. This one is the opposite regime.
  `SUBPIXEL-GEOMETRY.md`'s *Why a crop screams and a stretch does not* records that
  a sub-pixel error costs *more* as cells grow (a half-pixel crop on a 190 px cell
  is a 19.5 px chord, a 39x amplification), so a 350 px cell is where one device
  pixel of misplacement is easiest to see and hardest to explain away.

  **Two things are deliberate about the tiles.** `t5`'s five assets are 12x12 solid
  single-colour rects, so (a) in a flat one-colour field any boundary line is an
  artefact by construction — the method every seam reading in that document used —
  and (b) a flat fill has no curve to antialias, so attempt 13's confound is absent
  and the ~29x upscale costs nothing visible. `render/warn.ts` will still log the
  asset-too-small warning in a development build; that is the warning working, not
  a defect in the picture.

  **The layout has zero bleed on purpose**: `columns * cellSize = 2 * 100 = 200 =
  referenceWidth`, so `originX` is exactly 0 and the quantisation residual is the
  only thing that can move an edge. A design with bleed absorbs it and hides the
  very thing this page is for.

  **The readout restates no arithmetic** — attempt 12's lesson is that the last
  instrument was itself wrong in half its panels while it was being trusted, and
  `07` **R1** forbids a second copy of the mapping. So every predicted number below
  comes from the package's own exports, and each sits beside the **measured** rect
  of the render box, which the component hands over through `bind:box` (`07` §8.2
  assigns that measurement to the caller). A disagreement between the two columns is
  then visible rather than invisible.
-->
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import {
    domGeometry,
    naturalHeight,
    prefixedProvider,
    scaleFactor,
    uniformGeometry,
    type AssetRef,
    type GridGeometry,
  } from "@fndvit/gen-tilesets/render";

  /** The same served archive the footer fixture reads, so no asset is duplicated. */
  const ARCHIVE = "/atlas";
  const provider = prefixedProvider(ARCHIVE);

  /**
   * Built in code and passed through `loadTilesetFile`, not hand-shaped into the
   * prop: **S3** says a host must never hold an invalid file, and this is the one
   * call that migrates then validates. It also means `<Tileset>`'s development
   * assertion is covering this fixture rather than being skipped by it.
   *
   * Module scope, so the reference is stable — the component is keyed on it under
   * DEV. Nothing here draws a random number (**S7**, `07` **R12**): the seed is
   * fixed, so this page is the same picture on every reload and a change in it is a
   * change in the renderer.
   */
  const FILE = loadTilesetFile(
    {
      schemaVersion: 2,
      engineVersion: "0.0.0",
      config: {
        rows: 2,
        columns: 2,
        defaultSeed: "square-2x2",
        tiles: [
          {
            id: "t5",
            name: "solidPink",
            assets: [1, 2, 3, 4, 5].map((n) => ({
              id: `a${n}`,
              weight: 1,
              meta: { src: `tiles/t5/a${n}.svg`, width: 12, height: 12 },
            })),
          },
        ],
        operations: [
          {
            id: "op1",
            salt: 0,
            reseedOnLoad: false,
            selection: { type: "all" },
            source: { type: "random" },
            target: "tileId",
            mapping: { palette: [{ tileId: "t5", weight: 1 }] },
            blend: "set",
          },
        ],
      },
      layout: {
        cellSize: 100,
        referenceWidth: 200,
        yOffset: 0,
        horizontalAlignment: "gutter",
      },
    },
    "square-2x2 (built in code)",
  );

  let substrate = $state<"canvas" | "dom">("dom");
  /** CSS px, fractional on purpose — see `nudge`. */
  let width = $state(700);
  let box = $state<HTMLElement | null>(null);
  let failures = $state<string[]>([]);

  /**
   * A fraction of a pixel is the whole point. At a 350 px cell the transitions this
   * page exists to show are a tenth of a CSS pixel apart, so the slider steps in
   * tenths and these move one step at a time.
   */
  function nudge(by: number): void {
    width = Math.round((width + by) * 10) / 10;
  }

  /**
   * The box's **measured** rect, re-read whenever it changes size — including when
   * it changes *height*, which is the thing under inspection here, so a
   * width-keyed read would go stale exactly when it mattered.
   */
  let measured = $state<{ width: number; height: number } | null>(null);

  $effect(() => {
    const el = box;
    if (el === null) return;
    const read = (): void => {
      const rect = el.getBoundingClientRect();
      measured = { width: rect.width, height: rect.height };
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  });

  /**
   * `devicePixelRatio`, refreshed on `resize` because that is what fires when it
   * changes (a browser-zoom step, or a window moving between displays). The package
   * watches this properly with `matchMedia`; a fixture reading the global is the
   * host measuring its own page, which `07` **R5** does not touch.
   */
  let dpr = $state(1);
  $effect(() => {
    const read = (): void => (dpr = window.devicePixelRatio);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  });

  /**
   * The geometry the component itself is working from: **the measured width**, not
   * the requested one. They differ whenever the browser resolves `width: 700.4px`
   * to something else, and the component only ever sees what it measured.
   */
  const geometry = $derived<GridGeometry>({
    layout: FILE.layout,
    rows: FILE.config.rows,
    columns: FILE.config.columns,
    Wpx: measured?.width ?? 0,
  });

  const u = $derived(geometry.Wpx > 0 ? uniformGeometry(geometry, dpr) : null);
  const d = $derived(geometry.Wpx > 0 ? domGeometry(geometry, dpr) : null);

  /**
   * The number the bottom-row defect is about: how much of the last row survives the
   * box's bottom edge, in device px, computed from the **measured** box height
   * rather than from the predicted one. Equal to `cellDev` means flush; less means
   * the row is being cut, which is what this page was built to catch.
   */
  const bottomRowDev = $derived.by(() => {
    if (d === null || measured === null) return null;
    const top = d.originYDev + (FILE.config.rows - 1) * d.cellDev;
    return Math.min(d.cellDev, measured.height * dpr - top);
  });

  const px = (v: number): string => `${Math.round(v * 100) / 100}`;

  function onAssetError(ref: AssetRef, cause: unknown): void {
    failures = [...failures, `${ref.tileId}/${ref.assetId}: ${String(cause)}`];
  }
</script>

<section>
  <h2>2&times;2, one big square cell &mdash; geometry instrument</h2>

  <div class="controls">
    <label>
      Substrate
      <select bind:value={substrate}>
        <option value="canvas">canvas</option>
        <option value="dom">dom</option>
      </select>
    </label>

    <label>
      Box width <code>{px(width)}px</code>
      <input type="range" min="200" max="1200" step="0.1" bind:value={width} />
      <button onclick={() => nudge(-1)}>&minus;1</button>
      <button onclick={() => nudge(-0.1)}>&minus;0.1</button>
      <button onclick={() => nudge(0.1)}>+0.1</button>
      <button onclick={() => nudge(1)}>+1</button>
    </label>
  </div>

  <!--
    The container is out of flow, as asked: the stage is the positioned ancestor and
    reserves the space, the box is `position: absolute` inside it. That is worth
    having as a fixture in its own right — an absolutely-positioned box takes its
    width from this inline style rather than from a flow calculation, so it lands on
    a fractional CSS pixel readily, which is the awkward case.

    The stage's backdrop is loud on purpose: every asset here is opaque, so any
    colour of the stage showing through the grid is a gutter, and there is no way to
    mistake it for artwork.
  -->
  <div class="stage">
    <div class="abs" style="width: {width}px;">
      <Tileset file={FILE} options={{ substrate, provider, onAssetError }} bind:box />
    </div>
  </div>

  <table>
    <thead>
      <tr><th>quantity</th><th>predicted</th><th>measured</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>box width (Wpx)</td>
        <td><code>{px(width)}</code> requested</td>
        <td><code>{measured === null ? "—" : px(measured.width)}</code></td>
      </tr>
      <tr>
        <td>dpr</td>
        <td><code>{dpr}</code></td>
        <td></td>
      </tr>
      <tr>
        <td>scaleFactor(s)</td>
        <td><code>{geometry.Wpx > 0 ? px(scaleFactor(geometry)) : "—"}</code></td>
        <td></td>
      </tr>
      <tr>
        <td>idealCell (device px)</td>
        <td><code>{u === null ? "—" : px(u.idealCell)}</code></td>
        <td></td>
      </tr>
      <tr class:live={substrate !== "dom"}>
        <td>cellDev &mdash; canvas (<code>round</code>)</td>
        <td><code>{u === null ? "—" : u.cellDev}</code></td>
        <td></td>
      </tr>
      <tr class:live={substrate === "dom"}>
        <td>cellDev &mdash; dom (<code>ceil</code>)</td>
        <td><code>{d === null ? "—" : d.cellDev}</code></td>
        <td></td>
      </tr>
      <tr class:live={substrate === "dom"}>
        <td>dom overhang per side (device px)</td>
        <td><code>{d === null ? "—" : px(-d.originXDev)}</code></td>
        <td></td>
      </tr>
      <tr>
        <td>box height</td>
        <td>
          <code>{d === null ? "—" : px(d.gridHeightDev / dpr)}</code> dom grid,
          <code>{geometry.Wpx > 0 ? px(naturalHeight(geometry)) : "—"}</code> ideal
        </td>
        <td><code>{measured === null ? "—" : px(measured.height)}</code></td>
      </tr>
      <tr class:live={substrate === "dom"}>
        <td>bottom row visible (device px)</td>
        <td><code>{d === null ? "—" : d.cellDev}</code> if flush</td>
        <td><code>{bottomRowDev === null ? "—" : px(bottomRowDev)}</code></td>
      </tr>
    </tbody>
  </table>

  {#if failures.length > 0}
    <ul class="failures">
      {#each failures as failure (failure)}
        <li>{failure}</li>
      {/each}
    </ul>
  {/if}
</section>

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
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  label {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.85rem;
    color: #a0aec0;
  }

  select,
  button {
    background: #2d3748;
    border: 1px solid #4a5568;
    color: inherit;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }

  input[type="range"] {
    width: 16rem;
  }

  /*
    The positioned ancestor. It reserves the space the absolute box no longer
    occupies in flow, and its backdrop is what a gutter would show.
  */
  .stage {
    position: relative;
    height: 760px;
    background: #00e5a0;
  }

  .abs {
    position: absolute;
    top: 0;
    left: 0;
  }

  table {
    margin-top: 1.25rem;
    border-collapse: collapse;
    font-size: 0.8rem;
    color: #a0aec0;
  }

  th,
  td {
    text-align: left;
    padding: 0.2rem 1.25rem 0.2rem 0;
    border-bottom: 1px solid #1f2733;
    white-space: nowrap;
  }

  th {
    color: #718096;
    font-weight: 500;
  }

  /* The substrate in force, so the two cellDev rows cannot be confused. */
  .live td {
    color: #e2e8f0;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    color: #90cdf4;
  }

  .failures {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #fc8181;
  }
</style>
