<!--
  **The decorations fixture** — one style, a dozen placements, and the case this
  feature exists for: a page with a couple of tailor-made tilesets *plus* a
  scattering of small tile blocks around it, all in one visual language and
  differing only in how many cells they occupy.

  The two fixtures above it are geometry instruments. This one is a **use case**:
  what it has to demonstrate is that twelve decorations come off one `tiles`
  array and one set of Operations, and that each gets its own silhouette from its
  own seed. So it is laid out like a page rather than like a test bench.

  **It reuses the served archive's assets** (`prefixedProvider("/atlas")`), so
  not one SVG is duplicated to get a second look — which is the whole argument
  for the feature, made concrete rather than asserted.

  **The atlas's own `tileset.json` cannot be the style.** Its second Operation is
  a `rect {x: 0, y: 0, width: 76, height: 7}`, and `rect` is `coordinateBound`:
  it holds literal cell coordinates and so means nothing in a 3x2 spot.
  `decorationStyleErrors` is exactly that check, and `<TileDecoration>` throws on
  it under `DEV` — so the style below is built for the purpose, from procedural
  Selections only. Swap a `rect` in and the page fails loudly rather than drawing
  a plausible wrong picture.

  Note the background: **light**, unlike the rest of this app. `07` §4.5 makes a
  tileset decorative, drawn over whatever the host puts behind it, and a
  decoration in a margin is the case where the page's own backdrop shows on all
  four sides of the grid. A gutter or a clipped edge has nowhere to hide here.
-->
<script lang="ts">
  import { loadTilesetFile } from "@fndvit/gen-tilesets";
  import TileDecoration from "@fndvit/gen-tilesets/TileDecoration.svelte";
  import { prefixedProvider, type AssetRef } from "@fndvit/gen-tilesets/render";

  /**
   * Drawn by the host (`App.svelte`), not here — `08` §5.1 puts the draw with
   * whoever owns the page load. It only has an effect because every Operation
   * and the asset walk below set their `reseedOnLoad` flag.
   */
  let { loadSalt }: { loadSalt: number } = $props();

  const ARCHIVE = "/atlas";
  const provider = prefixedProvider(ARCHIVE);

  /**
   * **The decoration style.** Module scope and through `loadTilesetFile`, for
   * `Square2x2.svelte`'s two reasons: **S3** says a host must never hold an
   * invalid file, and a stable reference is what `<Tileset>` is keyed on under
   * `DEV`.
   *
   * `rows` and `columns` here are **placeholders and nothing more** — every
   * placement overrides them, and the style is never rendered at this size. They
   * are 1x1 rather than something plausible so that a decoration accidentally
   * drawing at the style's size would be unmistakable rather than subtle.
   * `layout`'s numbers are equally inert: `decorationFile` derives
   * `referenceWidth` from the placement and zeroes `yOffset`.
   *
   * Two Operations, both procedural:
   *
   * 1. `all` / `random` -> `tileId`, over a palette carrying **`{tileId: null}`**.
   *    That entry is where the silhouettes come from: `04` §6.3 makes a null
   *    `tileId` "clear this cell", so roughly a third of the cells in any spot
   *    are empty and *which* third is a function of the seed. This is what
   *    replaces a hand-painted mask per decoration.
   * 2. `random` density / `random` -> `rotation` in quarter turns, so the wedge
   *    tiles do not all point the same way. Quarter turns because `sincos` makes
   *    them exact (`../../packages/tileset/src/angle.ts`) — a 90-degree rotation
   *    lands on the cell box rather than 6.12e-17 off it.
   *
   * No `gradient`: it takes its domain from `ctx.extent`, which under
   * `selection: all` is the grid, so it renormalizes per decoration — a ramp
   * across 40 columns becomes a 3-step ramp in a 3-column spot. Legal, and
   * documented in `decoration.ts`, but it would make this page a demonstration
   * of that instead of of the feature.
   */
  const STYLE = loadTilesetFile(
    {
      schemaVersion: 2,
      engineVersion: "0.0.0",
      config: {
        rows: 1,
        columns: 1,
        defaultSeed: "decorations",
        assetSalt: 3,
        reseedAssetsOnLoad: true,
        // **The asset ids are transcribed from the archive, not generated.**
        // `t1`-`t4` run `a1, a3, a4, a5, a6` — there is no `a2` — and only `t5`
        // runs `a1..a5`. Assuming the obvious sequence here produced four 404s
        // and an `EncodingError` per spot, reported through `onAssetError`
        // exactly as **S6** intends and visible nowhere else, since **R3**
        // substitutes nothing and the cell simply drew empty.
        tiles: (
          [
            ["t1", "circle2Beige", ["a1", "a3", "a4", "a5", "a6"]],
            ["t2", "circle4Beige", ["a1", "a3", "a4", "a5", "a6"]],
            ["t3", "circle05Beige", ["a1", "a3", "a4", "a5", "a6"]],
            ["t4", "circleSolidBeige", ["a1", "a3", "a4", "a5", "a6"]],
            ["t5", "solidPink", ["a1", "a2", "a3", "a4", "a5"]],
          ] as const
        ).map(([id, name, assets]) => ({
          id,
          name,
          assets: assets.map((a) => ({
            id: a,
            weight: 1,
            meta: { src: `tiles/${id}/${a}.svg`, width: 12, height: 12 },
          })),
        })),
        operations: [
          {
            id: "fill",
            salt: 0,
            reseedOnLoad: true,
            selection: { type: "all" },
            source: { type: "random" },
            target: "tileId",
            mapping: {
              palette: [
                { tileId: "t5", weight: 3 },
                { tileId: "t4", weight: 2 },
                { tileId: "t2", weight: 2 },
                { tileId: "t1", weight: 1 },
                { tileId: "t3", weight: 1 },
                // The silhouette. Weighted against the rest so a small spot is
                // a cluster with holes rather than a scatter of single cells.
                { tileId: null, weight: 4 },
              ],
            },
            blend: "set",
          },
          {
            id: "turn",
            salt: 1,
            reseedOnLoad: true,
            selection: { type: "random", density: 0.6 },
            source: { type: "random" },
            target: "rotation",
            mapping: { range: [0, 270], steps: 4 },
            blend: "set",
          },
        ],
      },
      layout: { cellSize: 1, referenceWidth: 1, yOffset: 0, horizontalAlignment: "column" },
    },
    "the decorations style",
  );

  /**
   * One tile size for the whole page, which is what makes twelve independent
   * decorations read as one grid: every spot resolves to `s = 1`, so a cell is
   * exactly this many CSS px in all of them.
   */
  const CELL = 44;

  /**
   * The placements. `seed` is the only thing separating two spots of the same
   * size — `generate()` is pure in `(config, seed, loadSalt)`, so a distinct
   * string re-rolls every Operation and the asset walk alike. They are named
   * after where they sit, which is what a real page would do and what makes a
   * changed picture traceable to a changed seed.
   *
   * **Every reload is a new picture**, on purpose: the host draws a `loadSalt`
   * once per page load (`07` **R12**) and the style sets `reseedOnLoad`
   * everywhere, so the salt is mixed into each Operation and the asset walk.
   * The seeds still separate spots *within* one load; the salt re-rolls them
   * all *between* loads. Nothing here draws a random number itself (**S7**).
   */
  const SPOTS = [
    { seed: "hero-left", rows: 4, columns: 2, area: "a" },
    { seed: "hero-right", rows: 2, columns: 3, area: "b" },
    { seed: "board-tl", rows: 3, columns: 3, area: "c" },
    { seed: "board-tr", rows: 2, columns: 2, area: "d" },
    { seed: "mid-left", rows: 5, columns: 2, area: "e" },
    { seed: "mid-right", rows: 3, columns: 4, area: "f" },
    { seed: "foot-left", rows: 2, columns: 4, area: "g" },
    { seed: "foot-mid", rows: 4, columns: 3, area: "h" },
    { seed: "foot-right", rows: 3, columns: 2, area: "i" },
  ] as const;

  /**
   * **Deduplicated, which is a correctness fix and not a tidy-up.** A provider
   * failure fires once per *cell* that wanted the asset (`08` **S6** — "for a
   * resolution failure and a load failure alike"), so nine decorations sharing
   * one missing file report it dozens of times. Keying the `{#each}` below on
   * the message then throws `each_key_duplicate` and takes the whole page down —
   * which is how the wrong asset ids above were found. A `Set` is the honest
   * shape: the fact is *which* asset failed, not how many cells noticed.
   */
  let failures = $state<string[]>([]);
  const onAssetError = (ref: AssetRef, cause: unknown) => {
    const line = `${ref.tileId}/${ref.assetId}: ${String(cause)}`;
    if (!failures.includes(line)) failures = [...failures, line];
  };
</script>

<section class="page">
  <header>
    <h2>Decorations</h2>
    <p>
      Nine decorations, one style. Every block below comes off the same
      <code>tiles</code> array and the same two Operations; each declares only its
      own <code>rows</code>, <code>columns</code> and a seed. Tiles are
      {CELL}px everywhere, so the page reads as one grid.
    </p>
  </header>

  <div class="scatter">
    {#each SPOTS as spot (spot.seed)}
      <div class="spot" style="grid-area: {spot.area};">
        <TileDecoration
          style={STYLE}
          rows={spot.rows}
          columns={spot.columns}
          cellSize={CELL}
          options={{ seed: spot.seed, provider, loadSalt, onAssetError }}
        />
        <span class="label">{spot.columns}&times;{spot.rows} &middot; {spot.seed}</span>
      </div>
    {/each}

    <article style="grid-area: t1;">
      <h3>Our Board</h3>
      <p>
        Lorem ipsum dolor sit amet consectetur. Quam est libero senectus vulputate
        sed suspendisse. In cras magna morbi nascetur placerat eget amet. Proin
        mauris consequat eu sit sit viverra consectetur quam.
      </p>
    </article>

    <article style="grid-area: t2;">
      <h3>Lorem ipsum dolor</h3>
      <p>
        Quam est libero senectus vulputate sed suspendisse. In cras magna morbi
        nascetur placerat eget amet. Proin mauris consequat eu sit sit viverra
        consectetur quam. Urna in arcu vivamus ut.
      </p>
    </article>

    <article style="grid-area: t3;">
      <h3>Lorem ipsum dolor</h3>
      <p>
        Diam turpis mattis aliquet mattis tempor enim dignissim tortor. In cras
        magna morbi nascetur placerat eget amet.
      </p>
    </article>
  </div>

  {#if failures.length > 0}
    <ul class="failures">
      {#each failures as failure (failure)}
        <li>{failure}</li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  /*
    Light, unlike the rest of this app: a decoration sits in a page's margin with
    the page's own backdrop on all four sides of it, so a gutter or a clipped
    edge has nowhere to hide. `07` §4.5 makes the output decorative and the
    backdrop the host's.
  */
  .page {
    background: #fbfaf7;
    color: #1c2233;
    padding: 2.5rem 1.5rem 3.5rem;
  }

  header {
    max-width: 44rem;
    margin: 0 auto 2.5rem;
  }

  h2 {
    font-size: 1.6rem;
    font-weight: 300;
    letter-spacing: 0.01em;
    margin: 0 0 0.75rem;
  }

  header p {
    margin: 0;
    color: #55606f;
    font-size: 0.9rem;
    max-width: 34rem;
  }

  /*
    An editorial scatter rather than a neat row: the decorations have to be seen
    *between* text blocks at different sizes, because that is the situation they
    are for. Named areas keep the placement legible; the columns are wide enough
    for the biggest spot (4 columns at 44px) plus its label.
  */
  .scatter {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    gap: 1.75rem 2rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-areas:
      "a t1 t1 b"
      "a t1 t1 d"
      "c t1 t1 d"
      "e f f t2"
      "e f f t2"
      "g h t3 i";
    align-items: start;
  }

  .spot {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  /*
    The label names the size and the seed, so a picture that looks wrong can be
    traced to the placement that produced it without reading the source.
  */
  .label {
    font-size: 0.68rem;
    color: #8a93a1;
    font-family: ui-monospace, monospace;
  }

  article h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.4rem;
  }

  article p {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.6;
    color: #55606f;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    color: #2b4b8f;
  }

  .failures {
    max-width: 1100px;
    margin: 1.5rem auto 0;
    font-size: 0.8rem;
    color: #b03030;
  }

  /* Below the widest spot the grid stops being a scatter and becomes a column. */
  @media (max-width: 820px) {
    .scatter {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-areas:
        "t1 t1"
        "a b"
        "c d"
        "t2 t2"
        "e f"
        "t3 t3"
        "g h"
        "i i";
    }
  }
</style>
