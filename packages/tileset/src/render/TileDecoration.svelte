<!--
  **One authored style, one placement of it.** A decoration is a small block of
  tiles sitting in a page's margin — a 2x2 in a corner, a stepped 3x4 beside a
  heading — drawn from a style that a dozen other decorations on the same page
  share. `../shape.ts` carries the whole argument for why one config can serve
  every size; this component is the thin part.

  **It is `reshape` with one preset, plus a box.** The preset is `bleed: 0,
  yOffset: 0`: a decoration is a block of whole cells with an edge the page can
  see, so there is no design for a bleed to belong to, and a `yOffset` would shave
  its visible top. Zero bleed is also what makes `cellSize` mean CSS px — see the
  box comment below. Until 0.7.0 this preset was the only way to reach reuse at
  all (`decorationFile`); now it is one caller of the general transform.

  **It is not a second renderer, and does not weaken S1.** `<Tileset>` remains
  the one thing that draws and the one thing that calls `generate()`. This is an
  ordinary consumer of it, exactly as the editor's preview is, and adds no stage
  to the pipeline: it derives a `TilesetFile` above the component and hands it
  over. The import graph will not say that, which is why this paragraph is here.

  What it adds over calling `<Tileset>` yourself is the **box**, and that is the
  part worth having in one place. `<Tileset>` has no width prop on purpose (`07`
  §5.3 makes every quantity a fixed fraction of `Wpx`, so the host's CSS decides
  it), and a decoration's width is not a free choice: it is `columns * cellSize`,
  the same product the preset writes into `referenceWidth`. A host sizing the box
  by hand has two places to get one number right, and getting it wrong
  reintroduces a bleed silently — the grid still draws, just not at the tile size
  the author asked for.
-->
<script lang="ts">
  import { DEV } from "../dev.js";
  import { reshape, reshapeErrors } from "../shape.js";
  import type { Shape, TilesetFile } from "../types.js";
  import { WRAPPER_ATTRIBUTE } from "./measure.js";
  import type { TilesetOptions } from "./options.js";
  import Tileset from "./Tileset.svelte";

  interface Props {
    /**
     * The decoration style: an ordinary `TilesetFile`, parsed, valid and held
     * stable by the host (**S3**), using only procedural Selections. Shared
     * across every decoration on the page — that sharing is the point. Its own
     * `responsive` rules are dropped, as `reshape` drops any file's: they were
     * written for the style's own shape, not for this placement.
     */
    style: TilesetFile;
    rows: number;
    columns: number;
    /** CSS px per tile. See the box comment below for why it is also the width. */
    cellSize: number;
    /**
     * `<Tileset>`'s options, passed straight through — `TilesetOptions`.
     *
     * **`options.seed` is what makes two decorations of the same size differ.**
     * `generate()` is pure in `(config, seed, loadSalt)`, so a distinct seed per
     * spot re-rolls every Operation and the asset walk alike. Omitted, every spot
     * of a given size draws the identical picture, which is occasionally what you
     * want.
     */
    options?: TilesetOptions | undefined;
  }

  // No `box` prop, unlike `<Tileset>`. That exists so an editor can convert a
  // pointer event into render space (`07` §8.2); a decoration is `aria-hidden`
  // ornament that nothing points at. A host that needs the element can wrap this.
  let { style, rows, columns, cellSize, options }: Props = $props();

  const shape = $derived<Partial<Shape>>({ rows, columns, cellSize, bleed: 0, yOffset: 0 });

  /**
   * **Development-loud, production-trusting** — the same arrangement `<Tileset>`
   * has with `assertValidFile`, and for the same reason (`05` §6.3, `08` **S3**).
   * A `rect` or `cellList` Selection in a decoration style is the one thing that
   * cannot be made to work at another size, and it fails *quietly*: the picture
   * draws, with the Operation landing on cells it was never authored for, or on
   * none. That is the shape of defect worth a throw in front of a developer and
   * never in front of a visitor.
   *
   * `DEV` folds to `false` in a production build and takes `shape.ts`'s registry
   * walk with it — see `../dev.ts` on why the read is written inline.
   */
  const file = $derived.by(() => {
    if (DEV) {
      const errors = reshapeErrors(style, shape);
      if (errors.length > 0) {
        throw new Error(
          `<TileDecoration>'s \`style\` cannot be placed at ${columns} x ${rows}:\n` +
            errors.map((e) => `  - ${e}`).join("\n"),
        );
      }
    }
    return reshape(style, shape);
  });
</script>

<!--
  **The box, and the two declarations that are the whole of it.**

  `width` is `columns * cellSize` because that is what makes `cellSize` mean CSS
  px: the preset sets `referenceWidth` to the same product, so `s = Wpx /
  referenceWidth` is exactly 1 here and a tile is exactly `cellSize` px. It is a
  `width` rather than a container query because a decoration declares its tile
  size — that is the choice this whole feature is built around.

  `max-width: 100%` is a default with a reason rather than a hedge. A 6-column
  decoration at 96px is 576px wide, which overflows a phone, and a page that
  scrolls sideways is a worse failure than a decoration whose tiles came out
  smaller than declared — the tileset degrades gracefully into that case, since
  `07` §5.3 makes every quantity a fraction of `Wpx` and a narrower box is
  simply a smaller `s`. Nothing else in the picture changes. A host that would
  rather keep the tile size can pass a rule that switches to fixed sizing below
  the decoration's width — `options.responsive`.

  No height: `<Tileset>` declares `aspect-ratio: naturalRatio`, which at zero
  bleed and no `yOffset` is exactly `columns / rows`, and then takes its height
  from its own child.

  `data-tileset-wrapper` marks this element as the package's, so an
  `options.avoid` selector resolves in the section the decoration sits in rather
  than in here, where the only thing to find is the box (`measure.ts`'s
  `scopeOf`; `RESPONSIVE-HOSTING.md` §8.2).
-->
<div class="decoration" style="width: {columns * cellSize}px;" {...{ [WRAPPER_ATTRIBUTE]: "" }}>
  <Tileset {file} {options} />
</div>

<style>
  .decoration {
    /* See the template comment. `width` is inline because it is data. */
    max-width: 100%;
  }
</style>
