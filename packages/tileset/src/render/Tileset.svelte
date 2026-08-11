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
  import { naturalRatio } from "./geometry.js";
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
     */
    box?: HTMLDivElement | null;
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

  // Placement constants — `08` §6.3. Every quantity is a multiple of the cell's
  // own side, and a cell is square, so nothing observes the element.
  //
  //   side / Wpx     = cellSize / referenceWidth
  //   left in sides  = (referenceWidth - columns * cellSize) / (2 * cellSize) + x
  //   top  in sides  = y - yOffset
  const sidePercent = $derived((layout.cellSize / layout.referenceWidth) * 100);
  const leftBase = $derived(
    (layout.referenceWidth - file.config.columns * layout.cellSize) / (2 * layout.cellSize),
  );

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
   * The cell's full transform list.
   *
   * `07` §6.3 and `08` §6.3 both warn about this: **a CSS transform list applies
   * right to left**, so the list must read `translate(...) rotate(...) scale(...)`
   * for **D11**'s scale-before-rotation to hold. Placing the translation last, or
   * scale before rotate, produces a picture that looks deliberate.
   *
   * `transform-origin` is the element's own centre (the CSS default), which is the
   * drawable box's centre, as **D11** and **R7** require.
   */
  function cellTransform(cell: TileState, x: number, y: number): string {
    const left = (leftBase + x) * 100;
    const top = (y - layout.yOffset) * 100;
    return (
      `translate(${left}%, ${top}%) ` +
      `rotate(${cell.rotation}deg) ` +
      `scale(${cell.scaleX}, ${cell.scaleY})`
    );
  }
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
-->
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
        <div
          class="cell"
          style="width: {sidePercent}%; transform: {cellTransform(
            cell,
            i % grid.columns,
            Math.floor(i / grid.columns),
          )}; opacity: {cell.opacity};"
        >
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

<style>
  .tileset {
    position: relative;
    display: block;
    width: 100%;
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
       render box and the height follows. */
    aspect-ratio: 1;
    /* D11 / R7 — every transform is about the drawable box's centre. */
    transform-origin: 50% 50%;
    /* R9 again, from the other side: a cell is NOT a clipping boundary. A bare
       45deg rotation already spills (07 §6.3), and scale is unbounded, so
       clipping per cell would clip the two features the attribute set exists to
       provide (07 §7.1). */
    overflow: visible;
    will-change: transform;
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
