<!--
  The staging page the README's images are shot from (`packages/tileset/docs/images/`).
  One section per image, each a fixed-size frame with an id, so a screenshot is one
  element (`scripts/readme-shots.mjs`).

  It draws `public/readme/` — the hero's export, with `rows` raised from 8 to 14 so
  copy fits inside the grid with tiles around it, and the README's own responsive
  rule added so the snippet under `responsive.png` is literally what is drawn.
-->
<script lang="ts">
  import { loadTilesetFile, type TilesetFile } from "@vit-foundation/gen-tilesets";
  import Tileset from "@vit-foundation/gen-tilesets/Tileset.svelte";
  import TileDecoration from "@vit-foundation/gen-tilesets/TileDecoration.svelte";
  import { prefixedProvider, type AssetRef } from "@vit-foundation/gen-tilesets/render";

  const ARCHIVE = "/readme";
  const provider = prefixedProvider(ARCHIVE);
  const onAssetError = (ref: AssetRef, cause: unknown) => console.error("asset failed", ref, cause);

  let file = $state<TilesetFile | null>(null);
  let loadError = $state<string | null>(null);

  void fetch(`${ARCHIVE}/tileset.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<unknown>;
    })
    .then((raw) => {
      file = loadTilesetFile(raw, "readme-header-2.zip");
    })
    .catch((cause: unknown) => {
      loadError = String(cause);
    });

  /** Tiles are this size in every decoration, so the mock page reads as one grid. */
  const CELL = 44;
  // `responsive: []` replaces the file's rule: a decoration is narrower than 500px,
  // and the phone rule would otherwise reshape every block to 9x14.
  const SPOTS = [
    { area: "tl", rows: 3, columns: 2, seed: "top-left" },
    { area: "tr", rows: 2, columns: 4, seed: "top-right" },
    { area: "side", rows: 4, columns: 1, seed: "beside-card" },
    { area: "bl", rows: 2, columns: 3, seed: "bottom-left" },
    { area: "br", rows: 3, columns: 3, seed: "bottom-right" },
  ];
</script>

{#if loadError}
  <p class="error">Load failed: {loadError}</p>
{:else if file}
  <section id="avoid" class="frame">
    <Tileset {file} options={{ provider, onAssetError, avoid: { targets: "#avoid h1, #avoid p, #avoid .cta", padding: 0 } }} />
    <div class="copy">
      <h1>Tiles can be hidden under DOM elements</h1>
      <p>
        Every tile under this heading, this paragraph and the button is cleared, and stays cleared
        as the text rewraps.
      </p>
      <button type="button" class="cta">Get started</button>
    </div>
  </section>

  <section id="responsive" class="frame side-by-side">
    <figure>
      <div class="desktop"><Tileset {file} options={{ provider, onAssetError }} /></div>
      <figcaption>800px &middot; 29 &times; 14</figcaption>
    </figure>
    <figure>
      <div class="phone"><Tileset {file} options={{ provider, onAssetError }} /></div>
      <figcaption>375px &middot; 9 &times; 14</figcaption>
    </figure>
  </section>

  <section id="decorations" class="frame mock">
    <nav><span class="logo"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></nav>
    <div class="layout">
      {#each SPOTS as spot (spot.seed)}
        <div class="spot" style="grid-area: {spot.area};">
          <TileDecoration
            style={file}
            rows={spot.rows}
            columns={spot.columns}
            cellSize={CELL}
            options={{ seed: spot.seed, provider, onAssetError, responsive: [] }}
          />
        </div>
      {/each}
      <div class="headline" style="grid-area: head;">
        <span class="line wide"></span><span class="line"></span>
      </div>
      <div class="card" style="grid-area: card;">
        <span class="line"></span><span class="line short"></span><span class="line"></span><span class="line short"></span>
      </div>
      <div class="text" style="grid-area: text;">
        <span class="line"></span><span class="line"></span><span class="line short"></span>
      </div>
    </div>
  </section>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: #e9e6df;
    font-family: system-ui, sans-serif;
    color: #001a34;
  }

  .error {
    color: #b00020;
    padding: 2rem;
  }

  .frame {
    width: 1280px;
    margin: 40px auto;
    background: #fff;
    position: relative;
    overflow: hidden;
  }

  /* 1. Avoid */
  .copy {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1rem;
    padding: 0 18%;
    pointer-events: none;
  }

  .copy > * {
    margin: 0;
    width: fit-content;
    max-width: 36rem;
  }

  .copy h1 {
    font-size: 3.4rem;
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  .copy p {
    font-size: 1.25rem;
    line-height: 1.45;
    max-width: 30rem;
  }

  .copy .cta {
    font: inherit;
    font-weight: 600;
    padding: 0.7rem 1.4rem;
    border-radius: 999px;
    border: 0;
    background: #ff006a;
    color: #fff;
  }

  /* 2. Responsive */
  .side-by-side {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 40px;
    padding: 48px 0 36px;
    background: #f4efe1;
  }

  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  figcaption {
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  .desktop {
    width: 800px;
    border: 10px solid #001a34;
    border-top-width: 28px;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
  }

  .phone {
    width: 375px;
    border: 10px solid #001a34;
    border-top-width: 32px;
    border-bottom-width: 32px;
    border-radius: 36px;
    overflow: hidden;
    background: #fff;
  }

  .phone,
  .desktop {
    box-sizing: content-box;
  }

  /* 3. Decorations */
  .mock {
    padding: 0 0 48px;
    background: #fdfbf6;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 22px 48px;
    border-bottom: 1px solid #e6e0d2;
  }

  .logo {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #ff006a;
    margin-right: auto;
  }

  .bar {
    width: 72px;
    height: 10px;
    border-radius: 5px;
    background: #cfc8b8;
  }

  .layout {
    display: grid;
    grid-template-columns: 176px 1fr 1fr 176px;
    grid-template-areas:
      "tl   head head tr"
      ".    card text side"
      "bl   card text br";
    gap: 40px;
    padding: 48px 48px 0;
    align-items: start;
  }

  .spot {
    display: flex;
  }

  .layout > .spot:nth-child(2),
  .layout > .spot:nth-child(5) {
    justify-content: flex-end;
  }

  .headline,
  .card,
  .text {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .headline {
    padding-top: 30px;
  }

  .card {
    background: #fff;
    border: 1px solid #e6e0d2;
    border-radius: 14px;
    padding: 28px;
    min-height: 220px;
  }

  .line {
    display: block;
    height: 12px;
    border-radius: 6px;
    background: #d9d2c2;
    width: 100%;
  }

  .headline .line {
    height: 26px;
    background: #001a34;
    width: 70%;
  }

  .headline .line.wide {
    width: 100%;
  }

  .line.short {
    width: 60%;
  }
</style>
