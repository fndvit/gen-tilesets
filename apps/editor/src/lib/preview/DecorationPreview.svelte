<!--
  The preview's Decorations mode: the file being edited, drawn as a decoration
  style at fixed shapes (`decorations.ts` says why the mode exists).

  **Through the package's `<TileDecoration>`, the component a host page
  mounts** — not a reshaped file handed to `<Tileset>` here. `TileDecoration` is
  a thin preset over the same `TilesetRenderer` (`decoration.ts`), so the
  editor and a page draw a decoration with one code path, which is what **S2**
  asks of the Page mode (see `App.svelte`'s header). Rejected: reshaping in the
  editor and drawing with `<Tileset>`; it would agree today and could drift the
  day the preset changes.

  **The file is checked before anything mounts** (`decorationErrors`). A
  `rect`/`cellList` operation makes `TileDecoration` throw in development; here
  nothing draws and one note says which operations and why. Nothing is
  substituted. Checked once, not per spot: no spot this view offers can fail
  for its own shape (`parseSpan` holds rows and columns to whole numbers, and
  every spot shares one whole-px cell), so seven copies of one message said nothing more
  (seen on the Collage template). Each spot is still checked on its own as it
  mounts, by the component itself, so a reason this misses still fails loud.

  The note points at hiding: `style` is App's `shown`, so a hidden operation is
  not in it, and hiding the pinned ones previews the rest.

  **Fit, the default cell, fills the area** (`fitGallery`): the largest cell at
  which every spot fits without a scroll. At a fixed cell the gallery was one
  strip across a mostly empty area (Pol). The rows are computed (`packRows`)
  and drawn as they are, at Fit and at a fixed cell alike, so what Fit counted
  is what shows.

  Under Fit the spots sit in an absolutely placed layer over `.area`, so their
  height adds nothing to the stage's. Left in the flow, a gallery taller than
  the area (Fit's floor, in a tiny window) would grow the stage, which grows
  the measured area, which grows the cell — a loop. At a fixed cell they stay
  in the flow and the preview scrolls, as before.

  Spots keep `tileset.css`'s `max-width: 100%`: a spot wider than the column
  scales down, exactly as it would in a narrow page, rather than being given a
  scroll a page would never have.
-->
<script lang="ts">
  import type { Operation, TilesetFile } from "@vit-foundation/gen-tilesets";
  import TileDecoration from "@vit-foundation/gen-tilesets/TileDecoration.svelte";
  import type { TilesetOptions } from "@vit-foundation/gen-tilesets/render";
  import {
    boundOperations,
    decorationErrors,
    fitGallery,
    FIT,
    GALLERY,
    packRows,
    spanLabel,
    spotSeed,
    type GalleryMetrics,
    type Span,
  } from "./decorations.js";
  import { preview } from "./view.svelte.js";

  interface Props {
    /** What to draw: App's `shown`, so the open draft and hidden operations apply as in Page mode. */
    style: TilesetFile;
    /** Everything but the seed, which is each spot's own (`spotSeed`). */
    options: Omit<TilesetOptions, "seed">;
    /** The saved stack, which the cards number (`boundOperations`). */
    operations: readonly Operation[];
  }

  let { style, options, operations }: Props = $props();

  const spots = $derived<readonly Span[]>(preview.decorationView === "custom" ? [preview.custom] : GALLERY);

  const fit = $derived(preview.decorationCell === FIT);

  /** The area the spots may fill, and the layout's own lengths, read from the CSS (`measure`). */
  let areaWidth = $state(0);
  let areaHeight = $state(0);
  let metrics = $state<GalleryMetrics>({ gap: 0, captionHeight: 0, captionGap: 0 });
  let rowsEl = $state<HTMLElement>();

  /**
   * The gaps are the `--space-*` tokens and the caption's height is its type
   * style's: measured, not copied here, so a token change cannot desync Fit
   * from what is drawn. Re-read when the spots remount (`rowsEl` changes).
   */
  $effect(() => {
    if (!rowsEl) return;
    const figure = rowsEl.querySelector("figure");
    const caption = rowsEl.querySelector("figcaption");
    if (!figure || !caption) return;
    metrics = {
      gap: parseFloat(getComputedStyle(rowsEl).rowGap) || 0,
      captionGap: parseFloat(getComputedStyle(figure).rowGap) || 0,
      captionHeight: caption.getBoundingClientRect().height,
    };
  });

  const layout = $derived.by(() => {
    if (fit) return fitGallery(spots, { width: areaWidth, height: areaHeight }, metrics);
    const cell = preview.decorationCell as number;
    return { cell, rows: packRows(spots, cell, areaWidth, metrics.gap) };
  });

  $effect(() => {
    preview.drawnDecorationCell = layout.cell;
  });

  const errors = $derived(decorationErrors(style, spots[0]!, layout.cell));
  const bound = $derived(errors.length > 0 ? boundOperations(style, operations) : []);
</script>

{#if errors.length > 0}
  <div class="refused" role="note">
    <p class="t-label">This file can't be drawn as a decoration</p>
    {#if bound.length > 0}
      <p class="t-xs">
        A decoration is placed at any size, so it can't use a Selection tied to cell positions, as Drag and Handpick
        are. These operations use one:
      </p>
      <ul class="t-xs">
        {#each bound as b (b.id)}
          <li>Operation {b.index} · {b.labels.join(", ")}</li>
        {/each}
      </ul>
      <p class="t-xs">Hide them to preview the rest, or use procedural Selections instead.</p>
    {:else}
      <ul class="t-xs">
        {#each errors as e (e)}
          <li>{e}</li>
        {/each}
      </ul>
    {/if}
  </div>
{:else}
<div class="area" class:fit bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
  <div class="spots" class:single={spots.length === 1} bind:this={rowsEl}>
    {#each layout.rows as row, r (r)}
      <div class="row">
        {#each row as i (preview.decorationView === "custom" ? "custom" : i)}
          {@const span = spots[i]!}
          <figure class="spot">
            <div
              class="frame"
              class:grid={preview.showGrid}
              style="--columns: {span.columns}; --rows: {span.rows}; max-width: {span.columns * layout.cell}px;"
            >
              <TileDecoration
                {style}
                rows={span.rows}
                columns={span.columns}
                cellSize={layout.cell}
                options={{ ...options, seed: spotSeed(i, preview.reroll) }}
              />
            </div>
            <figcaption class="t-label">{spanLabel(span)}</figcaption>
          </figure>
        {/each}
      </div>
    {/each}
  </div>
</div>
{/if}

<style>
  /* The room the spots may fill: the stage's, less nothing. */
  .area {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .spots {
    display: flex;
    flex-direction: column;
    gap: var(--space-7);
    margin: auto 0;
  }

  /* Fit: out of the flow, so the spots' height never feeds the area it is measured from. */
  .fit .spots {
    position: absolute;
    inset: 0;
    justify-content: center;
    margin: 0;
    overflow: auto;
  }

  .row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-7);
  }

  .spot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    max-width: 100%;
    margin: 0;
  }

  .single .spot {
    flex: 1;
  }

  /*
    Sized by the decoration inside it (its box is `columns * cellSize` wide,
    with an aspect ratio), so the grid lines below land on cell edges at any
    scale: they are fractions of the frame, not px.
  */
  .frame {
    position: relative;
    width: 100%;
  }

  /*
    Grid on: the box's edge and its cell lattice, over the picture, so where a
    decoration ends is visible against any backdrop. The page mode's grid is the
    layout's lattice (`PreviewGrid`); a decoration has no gutters or bleed, so
    an even lattice is the whole of it.
  */
  .frame.grid::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    outline: var(--rule-w) dashed var(--color-grid);
    background-image:
      linear-gradient(to right, var(--color-grid) var(--rule-w), transparent var(--rule-w)),
      linear-gradient(to bottom, var(--color-grid) var(--rule-w), transparent var(--rule-w));
    background-size: calc(100% / var(--columns)) calc(100% / var(--rows));
    opacity: 0.6;
  }

  figcaption {
    color: var(--color-muted);
  }

  .refused {
    align-self: center;
    margin: auto 0;
    max-width: 28rem;
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-sm);
    background: var(--color-panel);
    box-shadow: inset 0 0 0 var(--rule-w) var(--color-edge);
    color: var(--color-ink);
  }

  .refused p,
  .refused ul {
    margin: 0 0 var(--space-3);
  }

  .refused > :last-child {
    margin-bottom: 0;
  }

  .refused ul {
    padding-left: var(--space-5);
  }
</style>
