<!--
  `<Tileset>` — `08-renderer-svelte.md` §3-§6.

  **Invariant S1** — there is one entry point. This component accepts a
  `TilesetFile` and calls `generate()` itself. Nothing in the package accepts a
  `Grid<TileState>` as an input.

  **Invariant S2** — the editor's preview is this component on the editor's file,
  drawing the complete operation stack. Overlays draw *over* it, never instead of
  it. There is no preview mode and no second component.

  **Invariant S3** — it performs no validation. It reads `schemaVersion` and
  `engineVersion` for nothing and has undefined behaviour on a file `06`'s
  `validate()` would reject. A host must never hold an invalid file, not even
  between keystrokes.

  **Invariant S7** — it draws no random number and reads no ambient state.
  `Math.random()` does not appear here. That makes **R12** structural rather than
  disciplinary: the component cannot redraw `loadSalt` on a regeneration because
  it has no draw to repeat.
-->
<script lang="ts">
  import { generate } from "../generate.js";
  import type { TileState, TilesetFile } from "../types.js";
  import { cellPlacementPercent, naturalRatio, type GridGeometry } from "./geometry.js";
  import { cssTransform, isIdentityTransform } from "./transform.js";
  import { blitRect, coverRect, drawList, snappedGrid } from "./edges.js";
  import { currentDpr, observeDpr, observeWidth } from "./measure.js";
  import { ImageBank } from "./images.js";
  import {
    assetKey,
    defaultProvider,
    type AssetProvider,
    type AssetRef,
    type Drawable,
  } from "./provider.js";

  interface Props {
    /** Parsed, valid, and held stable by the host (**S3**). */
    file: TilesetFile;
    /** `07` §9.2: `seed = hostSeed ?? file.config.defaultSeed`. */
    seed?: string;
    /** `07` **R12**: drawn once per render session by the host and held. */
    loadSalt?: number;
    provider?: AssetProvider;
    /** `08` **S6**. Fires for a resolution failure and a load failure alike. */
    onAssetError?: (ref: AssetRef, cause: unknown) => void;

    /**
     * Which substrate draws the grid — **ADR-006**, `08` §13. Defaults to
     * `"canvas"`.
     *
     * **`"canvas"` is the only one that can promise a seamless grid**, and the
     * promise is structural rather than careful: adjacent tiles are neighbouring
     * pixels of one bitmap, so there is no boundary between them for a backdrop
     * to show through. No host-page CSS can open one — a parent `transform`,
     * `filter`, `zoom`, or animation re-rasterizes a picture that is already
     * seamless, and the worst it can do is soften it.
     *
     * **`"dom"` is one `<img>` per cell**, which is what `08` §6.3 describes and
     * what this component did before ADR-006. Its cell edges are snapped to the
     * same shared device-pixel array, so it is correct on its own — but it is a
     * grid of separate elements, and any ancestor that re-rasterizes the subtree
     * re-opens the seam. Take it when SSR or a no-JavaScript render matters more
     * than that guarantee: it draws complete geometry in the initial HTML, where
     * `"canvas"` emits an empty box of the right ratio and fills it after mount.
     */
    substrate?: "canvas" | "dom";

    /**
     * The render box element — `08` §7, bindable and read-only in practice.
     *
     * **The host measures; the renderer does not.** `07` **R5** forbids the
     * *renderer* consulting or measuring anything to compute a cell box, and it
     * never needs to. But converting a pointer event into render space is
     * `07` §8.2's explicitly-assigned *caller* work, and that requires the box's
     * position on screen. So the element is exposed and "an editor calling
     * `getBoundingClientRect()` on it is doing something **R5** does not touch".
     *
     * This is the whole of what `09` needs from the component beyond `cellBox`
     * and `cellAt`. In particular there is **no exported grid**: an overlay shows
     * which cells an Operation *selects*, which `09` derives from the Operation
     * it is editing, never from the drawn output.
     *
     * `HTMLElement` rather than `HTMLDivElement` since ADR-006: under
     * `substrate="canvas"` the render box *is* the `<canvas>`. Every use of it is
     * `getBoundingClientRect()`, which does not care.
     */
    box?: HTMLElement | null;
  }

  // There is no width prop: `07` §5.3 makes every quantity a fixed fraction of
  // Wpx, so placement is expressed in relative units and Wpx is whatever width
  // the host's CSS gives the element. Measuring it would reintroduce exactly what
  // §5.3 exists to remove.
  //
  // There is no `config` prop and no `layout` prop: splitting the file across two
  // would hand the host a way to pair mismatched halves (§3.1).
  let {
    file,
    seed,
    loadSalt = 0,
    provider = defaultProvider,
    onAssetError,
    substrate = "canvas",
    box = $bindable(null),
  }: Props = $props();

  // **Invariant S4** — with no optional props the picture is fixed:
  // seed = defaultSeed, loadSalt = 0. Variation between loads is always an
  // explicit act by the host. The reverse default would make every page
  // nondeterministic by accident, including under SSR.
  const effectiveSeed = $derived(seed ?? file.config.defaultSeed);

  // Regenerates when `file.config`, `seed`, or `loadSalt` changes, and on nothing
  // else — not a `provider` change, not a viewport resize, not hydration
  // (`08` §5.2, `07` §9.1). A viewport resize changes `s` and nothing else, so
  // every cell keeps its TileState and moves to a new rect.
  const grid = $derived(generate(file.config, effectiveSeed, loadSalt));

  const layout = $derived(file.layout);
  const ratio = $derived(naturalRatio(layout, file.config.rows));

  // Placement is `cellPlacementPercent`'s, not a second copy of it (**S10**).
  // This component used to open-code `sidePercent` and `leftBase` here, which
  // meant the pure geometry and the only renderer that ships reached the same
  // numbers by two routes and could drift apart without anything reporting it —
  // the exact failure `07` **R1** names. It is called per cell from `cellStyle`
  // below rather than hoisted into a `$derived`: it reads `layout` and
  // `config.columns`, so it re-evaluates with them.

  // `meta` lookup, keyed by the (tileId, assetId) pair per `07` §4.1.
  const metaByKey = $derived.by(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const tile of file.config.tiles) {
      for (const asset of tile.assets) {
        map.set(assetKey(tile.id, asset.id), asset.meta ?? {});
      }
    }
    return map;
  });

  // Resolution is memoized per session on the (tileId, assetId) pair — `08` open
  // question 1, which leans yes: it makes `07` **R2** structural rather than a
  // provider obligation the component cannot check, and it costs one map. It is
  // also load-bearing here, because an unmemoized call in the template would
  // re-invoke the provider on every re-render.
  //
  // Q1's recorded objection stands: this silently repairs an impure provider
  // instead of surfacing it, and a lazy provider's rejection is cached too.
  const drawables = $derived.by(() => {
    const map = new Map<string, Drawable | Promise<Drawable>>();
    for (const cell of grid.cells) {
      if (cell.tileId === null || cell.assetId === null) continue;
      const key = assetKey(cell.tileId, cell.assetId);
      if (map.has(key)) continue;
      const ref: AssetRef = {
        tileId: cell.tileId,
        assetId: cell.assetId,
        meta: metaByKey.get(key) ?? {},
      };
      try {
        map.set(key, provider(ref));
      } catch (cause) {
        // R3: a failure to obtain a drawable never substitutes one. The cell
        // draws nothing and the failure is reported.
        onAssetError?.(ref, cause);
        map.set(key, Promise.reject(cause));
      }
    }
    return map;
  });

  // Cells whose <img> failed to load. `08` **S6**: the substrate substitutes on
  // its own — a broken <img> renders the browser's placeholder glyph, which is a
  // drawable the renderer did not choose, in a cell **R3** says must draw
  // nothing.
  let loadFailed = $state(new Set<string>());

  function handleLoadError(cell: TileState, cause: unknown): void {
    if (cell.tileId === null || cell.assetId === null) return;
    const key = assetKey(cell.tileId, cell.assetId);
    if (loadFailed.has(key)) return;
    loadFailed = new Set(loadFailed).add(key);
    onAssetError?.(
      { tileId: cell.tileId, assetId: cell.assetId, meta: metaByKey.get(key) ?? {} },
      cause,
    );
  }

  /**
   * The cell's whole inline style: placement, then its own transform, then its
   * opacity.
   *
   * **Placement is by percentage margin, not by `transform: translate()`**
   * (`08` §12). §6.3 illustrated the translate, and it drew seams: a transformed
   * element is rasterized at sub-pixel precision — the substrate is not permitted
   * to snap it — so at any width where `s * cellSize` is fractional, every cell
   * edge landed mid-pixel and was antialiased. Two adjacent antialiased edges each
   * contribute *partial* coverage to the shared boundary pixel, and source-over of
   * two partial coverages never sums to one, so a sliver of the backdrop survived
   * at every seam. That is `07` §5.6's "faint grid of seams across the whole
   * background… invisible at some widths and obvious at others", reached through
   * the substrate rather than through the arithmetic.
   *
   * A **percentage margin resolves against the containing block's width** — this
   * is true of `margin-top` as well as `margin-left`, and it is why the vertical
   * offset a percentage `top` could not carry (§6.3's objection) is carried here
   * anyway. So placement stays a fixed fraction of `Wpx` per `07` §5.3, nothing
   * is measured, and **S8** is untouched: a host overriding the box height still
   * gets square cells clipped by **R9**, never stretched ones.
   *
   * **The `transform` property is omitted entirely for an identity cell.** That is
   * what earns the snap: an untransformed border box is pixel-snapped, and
   * **R6**'s shared edge survives the snap because cell `x`'s right edge and cell
   * `x+1`'s left edge are one number, and `round()` of one number is one number.
   * Neither a gap nor an overlap can open, at any `Wpx`.
   *
   * **`opacity` is omitted at 1** for the same reason: a value below 1 forces a
   * stacking context, and emitting it unconditionally imposed one on every cell in
   * the grid for no gain.
   *
   * `07` §6.3 and `08` §6.3's ordering warning still binds what `cssTransform`
   * emits — **a CSS transform list applies right to left**, so it must read
   * `rotate(...) scale(...)` for **D11**'s scale-before-rotation to hold. The list
   * is `cssTransform`'s and not a second copy of it: this component used to spell
   * it out inline, which meant the pure function and the only renderer that ships
   * could disagree — and they would have, the moment ADR-005 added `scale` to one
   * of them.
   */
  function cellStyle(cell: TileState, x: number, y: number): string {
    let style = domPlacement(cell, x, y);
    if (!isIdentityTransform(cell)) style += ` transform: ${cssTransform(cell)};`;
    if (cell.opacity < 1) style += ` opacity: ${cell.opacity};`;
    return style;
  }

  /**
   * The DOM substrate's placement, in two regimes.
   *
   * **Before measurement — and therefore in the server-rendered HTML — this is
   * percentages**, which is `cellPlacementPercent`: correct at every width with
   * nothing measured, per `07` §5.3. That is the whole reason the `"dom"`
   * substrate still exists.
   *
   * **After measurement it is px from the same snapped edge array the canvas
   * draws**, so neighbours share an edge here too rather than each rounding
   * independently (`07` §5.6, **R6**). It is the best a grid of separate elements
   * can do; what it cannot do is survive an ancestor that re-rasterizes the
   * subtree, which is why it is not the default.
   *
   * The swap happens on mount and moves each cell by at most half a device pixel,
   * so there is no visible reflow — and `08` **S8**'s reserved space is the box's,
   * not the cells', so nothing shifts around it either.
   *
   * **The box a quarter-turned cell gets is `blitRect`'s, not the cell rect** —
   * the canvas path's transpose, spent here rather than restated (**S10**,
   * **R1**). A snapped cell is non-square by up to a device pixel, and `rotate(90deg)`
   * transposes the border box about its centre, so an untransposed box would
   * leave half a device pixel of the cell uncovered down each side. `object-fit:
   * cover` then crops against the same rect the canvas crops against.
   */
  function domPlacement(cell: TileState, x: number, y: number): string {
    const edges = snapped;
    if (edges !== null) {
      const dx = edges.x[x]!;
      const dy = edges.y[y]!;
      const { bx, by, bw, bh } = blitRect(cell, dx, dy, edges.x[x + 1]! - dx, edges.y[y + 1]! - dy);
      return (
        `width: ${bw / dpr}px; ` +
        `height: ${bh / dpr}px; ` +
        `margin-left: ${bx / dpr}px; ` +
        `margin-top: ${by / dpr}px;`
      );
    }
    const { leftPercent, topPercent, sidePercent } = cellPlacementPercent(
      layout,
      file.config.columns,
      x,
      y,
    );
    return (
      `width: ${sidePercent}%; ` + `margin-left: ${leftPercent}%; ` + `margin-top: ${topPercent}%;`
    );
  }

  // ---------------------------------------------------------------- canvas ---
  //
  // ADR-006. Everything below is inert under `substrate="dom"`.

  /** The two numbers ADR-006 measures. Nothing else about the element is read. */
  let measuredWidth = $state(0);
  let dpr = $state(currentDpr());

  let canvas = $state<HTMLCanvasElement | null>(null);
  const bank = new ImageBank();
  /** Bumped when a decode lands, so the paint effect re-runs. `bank` is plain. */
  let bankVersion = $state(0);

  // Both substrates measure, because both snap to the same shared edges. What
  // differs is only what they do before the first measurement: the DOM path draws
  // a complete percentage-placed grid, the canvas path draws nothing.
  $effect(() => observeDpr((next) => (dpr = next)));

  $effect(() => {
    const el = box;
    if (el === null) return;
    return observeWidth(el, (next) => (measuredWidth = next));
  });

  // `box` is the render box whichever substrate is drawing. The DOM path binds it
  // directly; the canvas path binds `canvas` and mirrors it here, since one
  // element cannot carry two `bind:this`.
  $effect(() => {
    if (substrate !== "canvas") return;
    box = canvas;
    return () => {
      box = null;
    };
  });

  /**
   * `(tileId, assetId)` -> `src`, for the bank.
   *
   * Resolution is still `drawables`', and a provider may be lazy — `AssetProvider`
   * returns `Drawable | Promise<Drawable>` and the DOM path simply `{#await}`s it.
   * The canvas path has no template to await in, so a pending provider is awaited
   * here and lands in this map when it settles. Skipping promises instead would
   * make every asynchronous provider draw nothing at all, silently.
   */
  let sources = $state(new Map<string, string>());

  $effect(() => {
    if (substrate !== "canvas") return;
    const seen = drawables;
    let live = true;

    const settle = (key: string, src: string): void => {
      if (!live) return;
      if (sources.get(key) === src) return;
      const next = new Map(sources);
      next.set(key, src);
      sources = next;
    };

    // Drop keys the config no longer references, so a deleted Tile stops drawing.
    if ([...sources.keys()].some((key) => !seen.has(key))) {
      sources = new Map([...sources].filter(([key]) => seen.has(key)));
    }

    for (const [key, value] of seen) {
      if (value instanceof Promise) {
        // A rejection has already been reported through `onAssetError` where the
        // provider threw, or is reported by the bank if the URL fails to load.
        void value.then((d) => settle(key, d.src)).catch(() => {});
      } else {
        settle(key, value.src);
      }
    }

    return () => {
      live = false;
    };
  });

  $effect(() => {
    if (substrate !== "canvas") return;
    bank.sync(
      sources,
      () => bankVersion++,
      (key, cause) => {
        const [tileId, assetId] = key.split(" ");
        if (tileId === undefined || assetId === undefined) return;
        onAssetError?.({ tileId, assetId, meta: metaByKey.get(key) ?? {} }, cause);
      },
    );
  });

  const geometry = $derived<GridGeometry>({
    layout,
    rows: file.config.rows,
    columns: file.config.columns,
    Wpx: measuredWidth,
  });

  /**
   * The shared edge array — `edges.ts`, and the substance of the whole fix.
   *
   * `null` until the box has been measured. Device px, integral, so cell `x`'s
   * right edge **is** cell `x+1`'s left edge.
   */
  const snapped = $derived(measuredWidth > 0 ? snappedGrid(geometry, dpr) : null);

  /**
   * The draw list, in render-space CSS px on the device pixel grid.
   *
   * Recomputed when the grid, the width, or the DPR changes, and on nothing else
   * — in particular not when an image finishes decoding. Geometry is committed
   * before resolution is attempted and never revised as a result of it, which is
   * `07` **R5**'s substance and the reason a missing asset leaves a hole in a
   * laid-out grid rather than collapsing it.
   */
  const items = $derived(measuredWidth > 0 ? drawList(geometry, grid, dpr, assetKey) : []);

  /**
   * Paint.
   *
   * Reads `items` and `bank.ready`, so it re-runs when either moves — a decode
   * completing repaints without recomputing geometry.
   */
  $effect(() => {
    if (substrate !== "canvas") return;
    const el = canvas;
    const list = items;
    const ratioNow = dpr;
    const wpx = measuredWidth;
    // Read so the effect re-runs when a decode lands. `ImageBank` is a plain
    // object by design, so its map is not itself reactive.
    void bankVersion;
    const ready = bank.ready;
    if (el === null || wpx <= 0) return;

    // The backing store is the box in device pixels, and the draw list is already
    // in device px, so the context is left unscaled: every coordinate written
    // below is an integer in the canvas's own space. Scaling the context by the
    // DPR and drawing in CSS px would put the arithmetic back into floating point
    // for no gain.
    const bw = Math.max(1, Math.round(wpx * ratioNow));
    const bh = Math.max(1, Math.round((wpx / ratio) * ratioNow));
    if (el.width !== bw) el.width = bw;
    if (el.height !== bh) el.height = bh;

    const ctx = el.getContext("2d");
    if (ctx === null) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    // Nearest-neighbour would alias the interior of every downscaled tile; the
    // seam problem this fixes is about *edges*, which are now integral, so
    // smoothing costs nothing at the boundary and buys quality inside.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    for (const item of list) {
      const img = ready.get(item.key);
      // R3 — a cell with no drawable draws nothing. No placeholder, and not
      // another TileAsset from the same Tile: falling back to a sibling would
      // keep the picture plausible and silently reweight the distribution D3
      // exists to make deterministic.
      if (img === undefined) continue;

      // The blit rect, not the cell rect: `blitRect` transposes it under a
      // quarter turn so the matrix maps it back onto the cell exactly. The crop
      // follows the rect being filled, or a quarter-turned tile would be
      // centre-cropped to the wrong aspect and R8 would read differently for a
      // rotated cell than an unrotated one.
      const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, item.bw, item.bh);
      if (sw <= 0 || sh <= 0) continue;

      const alpha = item.alpha;
      const m = item.matrix;

      if (m === null && alpha >= 1) {
        // The common case: an axis-aligned blit onto whole device pixels.
        ctx.drawImage(img, sx, sy, sw, sh, item.bx, item.by, item.bw, item.bh);
        continue;
      }

      ctx.save();
      if (alpha < 1) ctx.globalAlpha = alpha;
      if (m !== null) {
        // D11 / R7 — `edges.ts` built this about the cell's own centre, so the
        // drawable is scaled before it is rotated and both are taken about the
        // box it is drawn into. R9: whatever spills is clipped by the canvas,
        // which is the render box, and nothing else clips.
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      }
      ctx.drawImage(img, sx, sy, sw, sh, item.bx, item.by, item.bw, item.bh);
      ctx.restore();
    }
  });
</script>

<!--
  The render box. **S9** — no padding and no border, so its content box and border
  box coincide and `Wpx` is unambiguous. Host styling applies from the outside;
  padding or a border on it is unsupported rather than interpreted.

  **S8** — it declares its natural aspect ratio and no explicit height, so height
  follows width at every width with no measurement and no script. Host CSS may
  override the height, and `07` §7.3's vertical bleed then costs one line.

  **R9** — the render box is the only clipping boundary. Nothing else clips. This
  disposes of two cases without special-casing them: `yOffset`'s clipping of row 0
  is the box's top edge meeting a negative `originY`, and the horizontal bleed is
  its side edges meeting a negative `originX`.

  **§4.5** — the output is decorative. The box is `aria-hidden` and every image
  carries `alt=""`. Meaningful content is never a tile.

  **ADR-006** — under `substrate="canvas"` the render box *is* the canvas: one
  element, no per-cell nodes, and **R9**'s clip for free because a canvas cannot
  draw outside itself. Everything above still holds of it; a canvas takes
  `aspect-ratio` and a percentage width like any other element, and its `width` /
  `height` attributes are the backing store, not the layout size.
-->
{#if substrate === "canvas"}
  <canvas
    class="tileset"
    style="aspect-ratio: {ratio};"
    aria-hidden="true"
    bind:this={canvas}
  ></canvas>
{:else}
<div class="tileset" style="aspect-ratio: {ratio};" aria-hidden="true" bind:this={box}>
  <!--
    Cells are painted in row-major order — ascending y, then ascending x within a
    row (**R10**). `grid.cells` is stored row-major, so document order gives it
    for free, which is exactly what `07` §7.4 predicts: "the correct behaviour is
    the free one and any deviation costs effort."

    Later rows are lower on the screen and read as nearer the viewer, so painting
    them on top is what overlapping foliage and anything with implied depth want.
  -->
  {#each grid.cells as cell, i (i)}
    {#if cell.tileId !== null && cell.assetId !== null}
      {@const key = assetKey(cell.tileId, cell.assetId)}
      {#if !loadFailed.has(key)}
        <div class="cell" style={cellStyle(cell, i % grid.columns, Math.floor(i / grid.columns))}>
          <!--
            Geometry is computed and committed before resolution is attempted, and
            is never revised as a result of it (**R5**, §4.2). So: no layout shift
            as assets arrive, assets lazily loadable in any order, and a missing
            asset leaves a hole in a laid-out grid rather than collapsing it.
          -->
          {#await drawables.get(key) then drawable}
            {#if drawable}
              <img
                src={drawable.src}
                alt=""
                loading="lazy"
                draggable="false"
                onerror={(e) => handleLoadError(cell, e)}
              />
            {/if}
          {:catch}
            <!-- R3: the cell draws nothing. No placeholder, no default tile, and
                 not another TileAsset from the same Tile -- falling back to a
                 sibling would keep the picture plausible and silently reweight the
                 distribution D3 exists to make deterministic. -->
          {/await}
        </div>
      {/if}
    {/if}
  {/each}
</div>
{/if}

<style>
  .tileset {
    position: relative;
    display: block;
    width: 100%;
    /* The canvas's `width`/`height` attributes are its backing store, in device
       pixels; these two keep the *layout* size the box S8 and S9 describe. */
    height: auto;
    max-width: 100%;
    /* S9 — the component owns this element and styles it with no padding and no
       border, so Wpx is unambiguously its width. */
    padding: 0;
    border: 0;
    /* R9 — the only clipping boundary in the system. */
    overflow: hidden;
  }

  .cell {
    position: absolute;
    top: 0;
    left: 0;
    /* Cells are square (02 §7); `width` is set inline as a percentage of the
       render box and the height follows. `margin-left` / `margin-top` carry the
       placement, both as percentages of the render box's *width* — see
       `cellStyle`. */
    aspect-ratio: 1;
    /* D11 / R7 — every transform is about the drawable box's centre. */
    transform-origin: 50% 50%;
    /* R9 again, from the other side: a cell is NOT a clipping boundary. A bare
       45deg rotation already spills (07 §6.3), and scale is unbounded, so
       clipping per cell would clip the two features the attribute set exists to
       provide (07 §7.1). */
    overflow: visible;
    /*
      No `will-change: transform`. It promoted every cell to its own composited
      layer, and a layer is rasterized and composited with its own independent
      device-pixel snapping — which is `07` §5.6's forbidden "compute each cell's
      left and size independently, round both" reached through the compositor
      instead of through the arithmetic. It also made the seam depend on DPR and
      on which rasterization path the browser chose, and cost one layer per cell
      in a grid that is routinely hundreds of cells.
    */
  }

  .cell img {
    display: block;
    width: 100%;
    height: 100%;
    /* R8 — an asset is centre-cropped to the drawable box before any transform,
       and no attribute value changes the crop. `object-fit: cover` expresses it
       declaratively, so no measurement happens and the renderer never learns an
       aspect ratio (07 §6.4). Stretch would distort silently; letterbox would
       break R7's tangency claim for some assets and not others. */
    object-fit: cover;
    user-select: none;
  }
</style>
