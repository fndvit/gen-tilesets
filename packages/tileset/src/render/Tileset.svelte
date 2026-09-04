<!--
  `<Tileset>` — `08-renderer-svelte.md` §3-§6.

  **Invariant S1** — there is one entry point. This component accepts a
  `TilesetFile` and calls `generate()` itself. Nothing in the package accepts a
  `Grid<TileState>` as an input.

  **Invariant S2** — the editor's preview is this component on the editor's file,
  drawing the complete operation stack. Overlays draw *over* it, never instead of
  it. There is no preview mode and no second component.

  **Invariant S3** — it performs no validation *on the draw path*. It reads
  `schemaVersion` and `engineVersion` for nothing, substitutes nothing, and in a
  production build has undefined behaviour on a file `06`'s `validate()` would
  reject. A host must never hold an invalid file, not even between keystrokes.

  **In a development build it asserts that, once per file** — see `checked`
  below. S3 as originally written forbade this outright, and `08` §3.4 gave the
  reason: "a component that validated would be doing at sixty frames per second
  what belongs at load, once." That rules out validating **per frame**, which a
  `$derived` keyed on `file` does not do — it runs when the file changes, at the
  same cadence as `generate()` itself. The cost the objection names is not the
  cost this pays.

  **C5** is untouched. `generate()` still trusts its input, and validation is
  still a separate function living in `../load.ts`; this only calls it. What it
  buys is that skipping `loadTilesetFile()` stops being silent: undefined
  behaviour was the one failure in this package that reported nothing, which
  sits badly beside *failure is loud*.

  This is the component half of `08` **open question 3**. It does not close it —
  `../dev.ts` still detects a development build by sniffing two bundler signals,
  and that detection remains the provisional answer it says it is.

  **Invariant S7** — it draws no random number and reads no ambient state.
  `Math.random()` does not appear here. That makes **R12** structural rather than
  disciplinary: the component cannot redraw `loadSalt` on a regeneration because
  it has no draw to repeat.
-->
<script lang="ts">
  import { generate } from "../generate.js";
  import { DEV } from "../dev.js";
  import { assertValidFile } from "../load.js";
  import type { TileState, TilesetFile } from "../types.js";
  import {
    cellBox,
    cellPlacementPercent,
    naturalHeight,
    naturalRatio,
    type GridGeometry,
  } from "./geometry.js";
  import { cssTransform, isIdentityTransform, transformMatrix } from "./transform.js";
  import { coverRect } from "./edges.js";
  import { domGeometry, uniformDrawList, uniformGeometry } from "./uniform.js";
  import { assetTooSmall, cellTooSmall, WarnOnce } from "./warn.js";
  import { currentDpr, observeDpr, observeWidth } from "./measure.js";
  import { ImageBank } from "./images.js";
  import {
    assetKey,
    defaultProvider,
    parseAssetKey,
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
     * Which substrate draws the grid — **ADR-006**, `08` §13, and
     * `SUBPIXEL-GEOMETRY.md`'s *The recommendation*. Defaults to `"canvas"`.
     *
     * **The two that quantise compute the same uniform square cell** — one integer
     * side on both axes, so a cell is square by construction and **R8**'s crop has
     * nothing left to remove. They differ only in where the quantisation residual
     * goes, and that is a property of the geometry rather than of the painter.
     * Only seams and vector sharpness are genuinely substrate properties.
     *
     * `"canvas"` takes `cellDev = round(s * cellSize * dpr)`, because the
     * presentation undoes the quantisation and what is left to minimise is the
     * residual's *magnitude*. `"dom"` takes `ceil` — see its paragraph below.
     *
     * **`"svg"` quantises nothing at all** and has no `cellDev`: its cells come
     * straight from `cellBox` in design space under one `viewBox`, so there is no
     * residual to place. That is the whole of what its paragraph below claims, and
     * it is why it measures nothing.
     *
     * **`"canvas"` is the choice for proportion.** The canvas *is* the grid — its
     * backing store is exactly `columns * cellDev` device px, so there is no
     * origin to round and no box to centre in — and that bitmap is then presented
     * at the **ideal fractional** width. The whole residual becomes one isotropic
     * resample of one surface, which is the only place it can go that costs
     * neither the artwork nor the backdrop. It is also the only substrate that can
     * promise a seamless grid structurally rather than carefully: adjacent tiles
     * are neighbouring pixels of one bitmap, so no host-page CSS can open a
     * boundary between them. Read against a 64 px curve tangent to its cell it
     * shows no chord, correct transform centring and exact quarter turns, with
     * zero gaps from a 4 device px cell to a 190 px one.
     *
     * Its cost is that at a non-exact width the bitmap is resampled by
     * `1 +/- 1 / (2 * cellDev)`: at worst 1.32% on a coarse preset, and 12.17% at
     * the extreme of a 4 px cell. It requires assets carrying at least as many
     * pixels as the largest cell they are drawn into.
     *
     * **`"dom"` is the choice for interactivity**, because a canvas is one element
     * and cannot be hit-tested per cell. It is also what SSR emits: before
     * measurement it places cells by percentage, so the initial HTML carries
     * complete geometry where `"canvas"` emits an empty box of the right ratio.
     * Its stated cost is that the residual goes to the **box** — the grid does not
     * fit it exactly, so the tileset does not start on exactly the right cell. The
     * full-bleed case (exact box, every column present) is served by no
     * configuration here.
     *
     * **What it does guarantee is the direction, and only on the axis it does not
     * own.** Its cell is `ceil`ed (`domGeometry`), so the grid always covers its box
     * horizontally and **R9** clips the overhang: the outer columns are cut, by an
     * amount that varies with width, and **no gutter of page backdrop can open at
     * the sides**. Under `round` the sign was free and about half of all widths
     * guttered instead — up to 19 device px down each side of a zero-bleed design.
     * The price of fixing the sign is that the worst-case side cut doubles.
     *
     * **Vertically nothing is cut at all**, because the box's height is the
     * component's own rather than the host's: after measurement it takes its height
     * from the grid it contains (`domGeometry.gridHeightDev`), so the bottom row is
     * flush with the box's bottom edge at every width. The box is then up to `rows`
     * device px taller than `naturalHeight`, which **S8** makes a default rather
     * than a constraint. A host that overrides the height gets **R9** back, by its
     * own choice.
     *
     * It is a grid of separate elements, so any ancestor that re-rasterizes the
     * subtree can re-open a seam.
     *
     * **`"svg"` is the choice for crispness, if seams are acceptable.** One inline
     * `<svg>` in design coordinates under a single `viewBox`: one affine
     * transform, no per-cell layout rounding, so the distribution problem is gone
     * by construction and there is no residual to assign. It measures nothing at
     * all, which makes it the most SSR-complete of the three. What it does not
     * escape is antialiasing coverage at a fractional shared edge — two abutting
     * antialiased edges composite to `1 - 0.5^2 = 0.75`, not 1, so the backdrop
     * survives as a hairline. Measured at **+52% backdrop leak** through `<image>`
     * edges, the worst of anything in the investigation. That figure was taken
     * against 12 px data URIs rather than competently-sized assets, so it may not
     * transfer; it is stated as the known risk rather than quietly omitted.
     */
    substrate?: "canvas" | "dom" | "svg";

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
     * `HTMLElement` rather than `HTMLDivElement`, because the element differs by
     * substrate: a `<div>` under `"canvas"` and `"dom"`, the `<svg>` itself under
     * `"svg"`. Every use of it is `getBoundingClientRect()`, which does not care.
     *
     * **Under `"canvas"` this is the wrapper, not the canvas.** They are no longer
     * the same element and no longer the same size: the canvas is the *grid* and
     * hangs off both sides by the designed bleed, while this is the *box* — what
     * `Wpx` means, and what **R9** clips against. Binding it to the canvas would
     * hand a pointer-to-render-space conversion a rect wider than the render box,
     * which is `07` §8.2's "single most likely place to get this wrong" arriving
     * by a new route.
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

  // **S3's development assertion.** Keyed on `file` alone: a `seed` or
  // `loadSalt` change moves no config, so re-validating on one would be work
  // with no question attached. In a production build this is `file` itself, by
  // identity, and costs a boolean test.
  //
  // Every derived below reads `checked`, never `file`, and that is deliberate —
  // it makes "assert before generating" structural. A `$derived` that existed
  // only for its throw would have to be read back for its side effect, and a
  // read whose value is discarded is the line a later refactor deletes as dead.
  // Here the assertion cannot be dropped without also dropping the data.
  const checked = $derived(
    DEV
      ? assertValidFile(
          file,
          "`<Tileset>`'s `file` prop",
          "Pass the file through `loadTilesetFile()` before handing it to `<Tileset>`. " +
            "This check runs in development builds only; in production the same file is " +
            "undefined behaviour (S3).",
        )
      : file,
  );

  // **Invariant S4** — with no optional props the picture is fixed:
  // seed = defaultSeed, loadSalt = 0. Variation between loads is always an
  // explicit act by the host. The reverse default would make every page
  // nondeterministic by accident, including under SSR.
  const effectiveSeed = $derived(seed ?? checked.config.defaultSeed);

  // Regenerates when `file.config`, `seed`, or `loadSalt` changes, and on nothing
  // else — not a `provider` change, not a viewport resize, not hydration
  // (`08` §5.2, `07` §9.1). A viewport resize changes `s` and nothing else, so
  // every cell keeps its TileState and moves to a new rect.
  const grid = $derived(generate(checked.config, effectiveSeed, loadSalt));

  const layout = $derived(checked.layout);
  const ratio = $derived(naturalRatio(layout, checked.config.rows));

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
    for (const tile of checked.config.tiles) {
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
    let style = domPlacement(x, y);
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
   * **After measurement it is px from `domGeometry`'s square cell**, centred in the
   * box at an integer origin. Neighbours share an edge here too — cell `x`'s right
   * edge is `originXDev + (x+1) * cellDev`, which is identically cell `x+1`'s left
   * edge (**R6**) — and the widths are equal as well as adjacent, so `object-fit:
   * cover` crops a square asset by nothing.
   *
   * **`domGeometry` and not `uniformGeometry`**, which is the one place this
   * substrate's geometry parts company with the other two: its cell is rounded
   * **up**, so the grid always covers its box and the residual can only ever be a
   * cut. `uniformGeometry`'s `round` left the residual's sign free, and at about
   * half of all widths that showed as a band of page backdrop down each side.
   *
   * The **vertical** residual is not answered by any of that. It is answered by the
   * box taking its height from `gridHeightDev` — see the template comment on
   * `.extent`, which is why the bottom row is no longer shaved.
   *
   * **`blitRect` is gone and needs no successor.** It transposed the fill rect
   * under a quarter turn because per-edge snapping made the device rect 133 x 132,
   * and rotating *that* left a hairline down each side. A square rect quarter-turned
   * **is** the same rect, so the uniform cell removes the special case rather than
   * needing it — predicted before it was read, and confirmed.
   *
   * The swap happens on mount, and it is no longer the sub-pixel nudge it was under
   * `round`: `ceil` grows the cell by up to a whole device pixel, so the grid
   * widens by up to `columns` device px and its edges move outward by half of that.
   * The picture stays put — the shift is symmetric about the box's centre and lands
   * outside it, in the region **R9** clips — and `08` **S8**'s reserved space is the
   * box's, not the cells', so nothing reflows around it either.
   */
  function domPlacement(x: number, y: number): string {
    const u = domCell;
    if (u !== null) {
      const side = u.cellDev / dpr;
      return (
        `width: ${side}px; ` +
        `height: ${side}px; ` +
        `margin-left: ${(u.originXDev + x * u.cellDev) / dpr}px; ` +
        `margin-top: ${(u.originYDev + y * u.cellDev) / dpr}px;`
      );
    }
    const { leftPercent, topPercent, sidePercent } = cellPlacementPercent(
      layout,
      checked.config.columns,
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

  // `"canvas"` and `"dom"` measure, because both quantise against the device
  // pixel grid. What differs is only what they do before the first measurement:
  // the DOM path draws a complete percentage-placed grid, the canvas path draws
  // nothing. `"svg"` quantises nothing and reads neither of these.
  $effect(() => observeDpr((next) => (dpr = next)));

  $effect(() => {
    const el = box;
    if (el === null) return;
    return observeWidth(el, (next) => (measuredWidth = next));
  });

  // `box` is the render box whichever substrate is drawing, and every branch of
  // the template binds it directly. Under `"canvas"` that is the *wrapper*, not
  // the canvas: since the split they are different elements of different widths,
  // and the box is the one that means `Wpx`.

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
        // `parseAssetKey`, not `key.split(" ")`. That is what this line used to
        // say, and the key has never contained a space -- `assetKey` joins with
        // `\0`. So `assetId` came back `undefined`, the guard returned, and a
        // failed decode reported nothing at all. Silent, and the opposite of
        // this package's posture.
        const ref = parseAssetKey(key);
        if (ref === null) return;
        onAssetError?.({ ...ref, meta: metaByKey.get(key) ?? {} }, cause);
      },
    );
  });

  const geometry = $derived<GridGeometry>({
    layout,
    rows: checked.config.rows,
    columns: checked.config.columns,
    Wpx: measuredWidth,
  });

  /**
   * The uniform square cell, and where the residual went — `uniform.ts`, and the
   * substance of the whole fix.
   *
   * `null` until the box has been measured, and **`null` for every substrate but
   * `"canvas"`**. The gate is on the substrate as well as on the measurement for
   * `domCell`'s reason: the width observer is not itself gated — `box` is bound in
   * all three branches — so `measuredWidth` alone would leave this non-null under
   * `"dom"` and `"svg"`, computing a quantisation neither of them draws from.
   */
  const uniform = $derived(
    substrate === "canvas" && measuredWidth > 0 ? uniformGeometry(geometry, dpr) : null,
  );

  /**
   * The **DOM** substrate's cell — `domGeometry`, and the one thing it does not
   * share with the other two.
   *
   * `uniformGeometry`'s `round` leaves the residual's sign free, so at about half
   * of all widths the grid came out *narrower* than its box and the page backdrop
   * showed through a band down each side. This substrate has no presentation to
   * undo the quantisation with, so it rounds the cell up instead: the grid always
   * covers its box and **R9** clips the overhang. It cuts at the sides, and it never
   * gutters.
   *
   * Its `gridHeightDev` is the other half of the same problem: the box's height is
   * taken from it rather than declared independently, so the vertical residual has
   * nowhere to land as a shaved bottom row.
   *
   * Gated on the substrate as well as on the measurement so the other two never
   * compute it, and so `null` still selects the percentage placement that makes
   * this the SSR-complete substrate.
   */
  const domCell = $derived(
    substrate === "dom" && measuredWidth > 0 ? domGeometry(geometry, dpr) : null,
  );

  /**
   * The draw list, in device px on the raster's own pixel grid.
   *
   * `0` for the x origin, not `uniform.originXDev`: under `"canvas"` the canvas
   * *is* the grid, so there is no box to centre in. The centring moved to the
   * presentation, where it happens at the ideal fractional `originXCss` and so
   * reproduces the author's designed bleed to the pixel rather than to the nearest
   * device pixel.
   *
   * Recomputed when the grid, the width, or the DPR changes, and on nothing else
   * — in particular not when an image finishes decoding. Geometry is committed
   * before resolution is attempted and never revised as a result of it, which is
   * `07` **R5**'s substance and the reason a missing asset leaves a hole in a
   * laid-out grid rather than collapsing it.
   *
   * Gated on `uniform`, so it is the empty list under `"dom"` and `"svg"`. Only
   * the paint effect reads it, and this is one object per non-empty cell — 760 of
   * them on the demo's 76x10 preset — rebuilt on every resize tick, which is not
   * work to do for a substrate that discards it.
   */
  const items = $derived(
    uniform !== null ? uniformDrawList(geometry, grid, dpr, 0, assetKey) : [],
  );

  /**
   * The two asset rules, in a development build only —
   * `SUBPIXEL-GEOMETRY.md`'s *The 1/cellDev law* and *The one ceiling that is
   * real*. Silent in production, and deliberately **not** routed through
   * `onAssetError`: that reports resolution and load failures, and a
   * legible-but-soft tile is neither. Nothing here changes what is drawn.
   */
  const warnings = new WarnOnce();

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
    const u = uniform;
    // Read so the effect re-runs when a decode lands. `ImageBank` is a plain
    // object by design, so its map is not itself reactive.
    void bankVersion;
    const ready = bank.ready;
    if (el === null || u === null) return;

    // **The backing store is the grid, not the box.** That is the split, and it is
    // the whole mechanism: there is no origin to round, nothing to centre, and
    // every coordinate below is an exact multiple of `cellDev`. The box is the
    // wrapper's problem, and the residual between the two is carried by the CSS
    // width the canvas is presented at -- one isotropic resample of one surface,
    // where no internal edge exists to seam.
    //
    // The context is left unscaled: the draw list is already in device px, and
    // scaling by the DPR to draw in CSS px would put integer arithmetic back into
    // floating point for no gain.
    const bw = Math.max(1, u.gridWidthDev);
    const bh = Math.max(1, u.rasterHeightDev);
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

    if (DEV) warnings.say(`cell:${u.cellDev}`, cellTooSmall(u.cellDev));

    for (const item of list) {
      const img = ready.get(item.key);
      // R3 -- a cell with no drawable draws nothing. No placeholder, and not
      // another TileAsset from the same Tile: falling back to a sibling would
      // keep the picture plausible and silently reweight the distribution D3
      // exists to make deterministic.
      if (img === undefined) continue;

      if (DEV) {
        // Keyed on the asset alone, not on `(asset, cellDev)`. Keying on the pair
        // looked more informative -- it would re-report as the cell grew -- and in
        // practice it emitted the same five lines on every step of a resize drag,
        // which is exactly how a real warning gets tuned out.
        const ref = parseAssetKey(item.key);
        if (ref !== null) {
          warnings.say(
            item.key,
            assetTooSmall(ref.tileId, ref.assetId, img.naturalWidth, img.naturalHeight, u.cellDev),
          );
        }
      }

      // R8, and the fix. The destination is square, so a square source is passed
      // through whole and there is no chord to shave; a non-square source is still
      // centre-cropped, exactly as `object-fit: cover` would crop it. The crop code
      // is unchanged -- what changed is the rect it is handed.
      const { sx, sy, sw, sh } = coverRect(
        img.naturalWidth,
        img.naturalHeight,
        item.side,
        item.side,
      );
      if (sw <= 0 || sh <= 0) continue;

      const alpha = item.alpha;
      const m = item.matrix;

      if (m === null && alpha >= 1) {
        // The common case: an axis-aligned blit onto whole device pixels.
        ctx.drawImage(img, sx, sy, sw, sh, item.dx, item.dy, item.side, item.side);
        continue;
      }

      ctx.save();
      if (alpha < 1) ctx.globalAlpha = alpha;
      if (m !== null) {
        // D11 / R7 -- `uniform.ts` built this about the cell's own centre, so the
        // drawable is scaled before it is rotated and both are taken about the
        // square box it is drawn into. R9: whatever spills is clipped by the
        // wrapper, and nothing else clips.
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      }
      ctx.drawImage(img, sx, sy, sw, sh, item.dx, item.dy, item.side, item.side);
      ctx.restore();
    }
  });

  // ------------------------------------------------------------------- svg ---

  /**
   * The SVG substrate's geometry, in **design space**.
   *
   * `Wpx = referenceWidth`, which makes render space *be* design space: the
   * `viewBox` then carries the entire scale, exactly once, and no coordinate here
   * depends on the rendered width. That is the whole claim of the substrate --
   * there is nothing to measure, so nothing waits for a measurement, and the
   * server-rendered HTML is the finished picture rather than a reserved box.
   */
  const svgGeometry = $derived<GridGeometry>({
    layout,
    rows: checked.config.rows,
    columns: checked.config.columns,
    Wpx: layout.referenceWidth,
  });

  const svgHeight = $derived(naturalHeight(svgGeometry));

  interface SvgItem {
    key: string;
    cellKey: string;
    x: number;
    y: number;
    side: number;
    /** `07` §6.2's six-tuple as SVG's `matrix(...)`, or `null` for an untransformed cell. */
    matrix: string | null;
    opacity: number;
  }

  /** Row-major, so document order is paint order — **R10**, as in the DOM branch. */
  const svgItems = $derived.by((): SvgItem[] => {
    const out: SvgItem[] = [];
    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i]!;
      if (cell.tileId === null || cell.assetId === null) continue;
      const box = cellBox(svgGeometry, i % grid.columns, Math.floor(i / grid.columns));
      const m = isIdentityTransform(cell) ? null : transformMatrix(cell, box);
      out.push({
        key: `${assetKey(cell.tileId, cell.assetId)}:${i}`,
        cellKey: assetKey(cell.tileId, cell.assetId),
        x: box.left,
        y: box.top,
        side: box.right - box.left,
        matrix: m === null ? null : `matrix(${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]})`,
        opacity: cell.opacity,
      });
    }
    return out;
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
  <!--
    **Two elements, because the two jobs are now two things.**

    The wrapper is the *box*: it is what `Wpx` means, it carries **R9**'s clip, and
    it declares **S8**'s natural ratio so correct space is reserved before anything
    is drawn. The canvas is the *grid*: its backing store is exactly the grid in
    device pixels, and it is presented at the ideal fractional grid width, hanging
    off both sides by the bleed the author designed. `originXCss` is negative
    whenever there is bleed, which is what puts it there.

    `height` is left `auto` **on purpose, and this is the one line not to tidy**. A
    canvas has an intrinsic ratio from its backing store, so the vertical
    presentation scale comes out equal to the horizontal one by construction rather
    than by a second calculation that could disagree with the first. Writing a
    height here is the single edit that would make cells non-square again.

    **The wrapper declares a ratio only until it has a canvas to measure**, and
    that is not fussiness. `naturalRatio` and the canvas's intrinsic ratio are not
    the same number: `originYDev` is rounded, so the raster's height is
    `rows * cellDev + originYDev` rather than `(rows - yOffset) * cellDev`, and the
    two disagree by up to **half a CSS pixel** at a fractional `yOffset` (and by
    exactly nothing when `yOffset` is 0, which is where the rounding goes away).
    Declaring the ratio permanently would leave the canvas a fraction short at some
    widths and show the page backdrop as a hairline under the bottom row -- the
    exact defect class this change exists to remove.

    So after measurement the wrapper takes its height from the canvas, the way an
    ordinary block box takes it from its only child. That keeps **S8**'s reserved
    space where it is actually needed -- before anything is drawn -- without
    introducing a second height to disagree with the first. Clamping instead
    (`min-height`) would work too, but it would stretch the picture anisotropically
    by that half pixel, and this substrate exists to keep cells square.

    Before the first measurement the canvas has no size and the wrapper is an empty
    box of the right ratio. That is the canvas substrate's known SSR cost, and it
    is why `"dom"` still exists.
  -->
  <div
    class="tileset"
    style={uniform === null ? `aspect-ratio: ${ratio};` : ""}
    aria-hidden="true"
    bind:this={box}
  >
    <!--
      **One element, conditionally styled** — not two arms of an `{#if}`. Two
      would tear the canvas down and build a new one at the first measurement,
      which discards the backing store and rebinds `canvas`, for a difference that
      is one attribute.
    -->
    <canvas
      class="presented"
      style={uniform === null
        ? ""
        : `width: ${uniform.presentedWidthCss}px; margin-left: ${uniform.originXCss}px;`}
      bind:this={canvas}
    ></canvas>
  </div>
{:else if substrate === "svg"}
  <!--
    One inline `<svg>`, one `<image>` per cell, coordinates in design space, and a
    single `viewBox` mapping the whole thing to whatever width the host gives it.

    A `viewBox` maps every child through one affine transform, and SVG children do
    not participate in CSS layout, so **independent per-cell box rounding cannot
    happen** -- the distribution problem is gone by construction and there is no
    residual to assign. Nothing is measured, so unlike either other substrate this
    emits the finished picture on the server.

    What it does *not* escape is antialiasing coverage at a fractional shared edge:
    two abutting antialiased edges composite to `1 - 0.5^2 = 0.75`, not 1, so the
    backdrop survives as a hairline. "One SVG, scaled once" does not repeal that
    arithmetic -- it is the same arithmetic that made ADR-006 choose integer device
    pixels. Measured at +52% leak; see the `substrate` prop's note on what that
    number was measured against.

    **The wrapper is not decoration.** An `<svg>` is an `SVGSVGElement`, not an
    `HTMLElement`, and `box` is typed `HTMLElement` because `09`'s pointer
    conversion reads `offsetWidth` off it. Widening the prop to `Element` would
    remove that at every call site to serve one substrate. So this branch binds the
    same kind of box the other two do, and the `<svg>` fills it.

    `overflow: hidden` plus the `viewBox` is **R9**. No explicit height on the
    `<svg>`: a `viewBox` gives it an intrinsic ratio, so height follows width with
    nothing measured (**S8**), and the wrapper takes its height from that.
  -->
  <div class="tileset" aria-hidden="true" bind:this={box}>
    <svg class="vector" viewBox="0 0 {layout.referenceWidth} {svgHeight}">
    {#each svgItems as item (item.key)}
      {#if !loadFailed.has(item.cellKey)}
        {#await drawables.get(item.cellKey) then drawable}
          {#if drawable}
            <!--
              `preserveAspectRatio="xMidYMid slice"` **is** R8's centre-crop, stated
              declaratively rather than computed. Against a cell box that is exactly
              square -- which it is here, because nothing was snapped -- it crops a
              square asset by nothing. That is the bug this substrate cannot have.
            -->
            <image
              href={drawable.src}
              x={item.x}
              y={item.y}
              width={item.side}
              height={item.side}
              preserveAspectRatio="xMidYMid slice"
              opacity={item.opacity < 1 ? item.opacity : null}
              transform={item.matrix}
            />
          {/if}
        {:catch}
          <!-- R3: the cell draws nothing. -->
        {/await}
      {/if}
    {/each}
    </svg>
  </div>
{:else}
  <!--
    **The box declares a ratio only until it has a grid to measure**, which is the
    same arrangement the canvas wrapper is in above and for the same reason: a
    declared ratio is the *ideal* height and the grid inside it is quantised, so the
    two disagree — and because the grid is top-anchored, the whole disagreement lands
    on the bottom edge as a shaved bottom row. Vertically there is no second edge to
    share it with, which is why `ceil`'s residual is tolerable at the sides (centred,
    half each) and was not at the bottom (one-edged, up to `rows` device px).

    So after measurement the box takes its height from `.extent`, the way an ordinary
    block box takes it from its only in-flow child, and `domGeometry.gridHeightDev`
    is the last horizontal edge — the same expression the cells are placed by, so it
    cannot disagree with them.

    Before measurement it is `naturalRatio`, unchanged: that is what reserves correct
    space in the server-rendered HTML (**S8**), and it is why this substrate is the
    SSR-complete one.
  -->
  <div
    class="tileset"
    style={domCell === null ? `aspect-ratio: ${ratio};` : ""}
    aria-hidden="true"
    bind:this={box}
  >
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
    <!--
      **The only in-flow child, and it exists to carry a height.** Cells are
      `position: absolute` (they have to be — `R6`'s shared edge is an arithmetic
      identity between two margins, not a flow relationship), so they contribute no
      height at all and `height: auto` would collapse the box to nothing.

      An inline `height` on the box itself would be shorter and would break **S8**:
      `07` §7.3's vertical bleed is a host writing `height` in its own stylesheet, and
      an inline style beats a stylesheet. An in-flow child leaves the host's `height`
      winning, with this simply overflowing into **R9**'s clip — exactly the
      relationship the canvas has with its wrapper.
    -->
    {#if domCell !== null}
      <div class="extent" style="height: {domCell.gridHeightDev / dpr}px"></div>
    {/if}
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

  .vector {
    display: block;
    width: 100%;
    /* The viewBox supplies an intrinsic ratio, so height follows width with
       nothing measured (S8) and the wrapper takes its height from this. */
    height: auto;
  }

  .presented {
    display: block;
    /* Left `auto` on purpose -- see the template comment. A canvas has an
       intrinsic ratio from its backing store, so the vertical presentation scale
       equals the horizontal one with no second calculation to disagree with the
       first. Writing a `height` here is the one edit that makes cells non-square
       again. */
    height: auto;
  }

  /* Height only. See the template comment -- it is what the box measures. */
  .extent {
    width: 0;
    pointer-events: none;
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
