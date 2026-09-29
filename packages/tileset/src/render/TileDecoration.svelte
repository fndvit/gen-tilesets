<!--
  **One authored style, one placement of it.** A decoration is a small block of
  tiles sitting in a page's margin — a 2x2 in a corner, a stepped 3x4 beside a
  heading — drawn from a style that a dozen other decorations on the same page
  share. `../decoration.ts` carries the whole argument for why one config can
  serve every size; this component is the thin part.

  **It is not a second renderer, and does not weaken S1.** `<Tileset>` remains
  the one thing that draws and the one thing that calls `generate()`. This is an
  ordinary consumer of it, exactly as the editor's preview is, and adds no stage
  to the pipeline: it derives a `TilesetFile` above the component and hands it
  over. The import graph will not say that, which is why this paragraph is here.

  What it adds over calling `<Tileset>` yourself is the **box**, and that is the
  part worth having in one place. `<Tileset>` has no width prop on purpose (`07`
  §5.3 makes every quantity a fixed fraction of `Wpx`, so the host's CSS decides
  it), and a decoration's width is not a free choice: it is `columns * cellSize`,
  the same product `decorationFile` writes into `referenceWidth`. A host sizing
  the box by hand has two places to get one number right, and getting it wrong
  reintroduces a bleed silently — the grid still draws, just not at the tile size
  the author asked for.
-->
<script lang="ts">
  import { DEV } from "../dev.js";
  import { decorationFile, decorationStyleErrors } from "../decoration.js";
  import type { TilesetFile } from "../types.js";
  import type { AssetProvider, AssetRef } from "./provider.js";
  import Tileset from "./Tileset.svelte";

  interface Props {
    /**
     * The decoration style: an ordinary `TilesetFile`, parsed, valid and held
     * stable by the host (**S3**), using only procedural Selections. Shared
     * across every decoration on the page — that sharing is the point.
     */
    style: TilesetFile;
    rows: number;
    columns: number;
    /** CSS px per tile. See the box comment below for why it is also the width. */
    cellSize: number;
    /**
     * **This is what makes two decorations of the same size differ.** `generate()`
     * is pure in `(config, seed, loadSalt)`, so a distinct seed per spot re-rolls
     * every Operation and the asset walk alike. Omitted, every spot of a given
     * size draws the identical picture, which is occasionally what you want.
     */
    seed?: string;
    loadSalt?: number;
    provider?: AssetProvider;
    onAssetError?: (ref: AssetRef, cause: unknown) => void;
    substrate?: "canvas" | "dom" | "svg";
  }

  // No `box` prop, unlike `<Tileset>`. That exists so an editor can convert a
  // pointer event into render space (`07` §8.2); a decoration is `aria-hidden`
  // ornament that nothing points at. A host that needs the element can wrap this.
  let {
    style,
    rows,
    columns,
    cellSize,
    seed,
    loadSalt = 0,
    provider,
    onAssetError,
    substrate,
  }: Props = $props();

  /**
   * **Development-loud, production-trusting** — the same arrangement `<Tileset>`
   * has with `assertValidFile`, and for the same reason (`05` §6.3, `08` **S3**).
   * A `rect` or `cellList` Selection in a decoration style is the one thing that
   * cannot be made to work at another size, and it fails *quietly*: the picture
   * draws, with the Operation landing on cells it was never authored for, or on
   * none. That is the shape of defect worth a throw in front of a developer and
   * never in front of a visitor.
   *
   * `DEV` folds to `false` in a production build and takes `decoration.ts`'s
   * registry walk with it — see `../dev.ts` on why the read is written inline.
   */
  const checked = $derived.by(() => {
    if (!DEV) return style;
    const errors = decorationStyleErrors(style);
    if (errors.length > 0) {
      throw new Error(
        `<TileDecoration>'s \`style\` is not reusable at another size:\n` +
          errors.map((e) => `  - ${e}`).join("\n"),
      );
    }
    return style;
  });

  const file = $derived(decorationFile(checked, { rows, columns, cellSize }));

  /**
   * **Forwarded by spread, and that is a type requirement rather than a style.**
   * The package compiles under `exactOptionalPropertyTypes`, where `seed?: string`
   * accepts *absent* but not *present-and-`undefined`* — so `seed={seed}` on an
   * unset prop is an error, and passing one through means omitting the key rather
   * than passing the value. `loadSalt` needs no such treatment because it has a
   * default here, as it does in `<Tileset>`.
   */
  const forwarded = $derived({
    ...(seed !== undefined ? { seed } : {}),
    ...(provider !== undefined ? { provider } : {}),
    ...(onAssetError !== undefined ? { onAssetError } : {}),
    ...(substrate !== undefined ? { substrate } : {}),
  });
</script>

<!--
  **The box, and the two declarations that are the whole of it.**

  `width` is `columns * cellSize` because that is what makes `cellSize` mean CSS
  px: `decorationFile` sets `referenceWidth` to the same product, so `s = Wpx /
  referenceWidth` is exactly 1 here and a tile is exactly `cellSize` px. It is a
  `width` rather than a container query because a decoration declares its tile
  size — that is the choice this whole feature is built around.

  `max-width: 100%` is a default with a reason rather than a hedge. A 6-column
  decoration at 96px is 576px wide, which overflows a phone, and a page that
  scrolls sideways is a worse failure than a decoration whose tiles came out
  smaller than declared — the tileset degrades gracefully into that case, since
  `07` §5.3 makes every quantity a fraction of `Wpx` and a narrower box is
  simply a smaller `s`. Nothing else in the picture changes. A host that would
  rather clip or scroll overrides it on this element.

  No height: `<Tileset>` declares `aspect-ratio: naturalRatio`, which at zero
  bleed and no `yOffset` is exactly `columns / rows`, and then takes its height
  from its own child.
-->
<div class="decoration" style="width: {columns * cellSize}px;">
  <Tileset {file} {loadSalt} {...forwarded} />
</div>

<style>
  .decoration {
    /* See the template comment. `width` is inline because it is data. */
    max-width: 100%;
  }
</style>
