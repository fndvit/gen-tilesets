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

  **Four stages, and only the last is a substrate** (0.6.0). `generate()` makes
  the grid; `geometry.ts` / `uniform.ts` place it for the box, the sizing and the
  alignment; `occlusion.ts` turns the measured keep-out rects into a per-cell
  mask; and one of the two branches below paints. The mask is render space and
  never reaches the config, so the grid is generated exactly as often as it was
  before — see `occlusion.ts`'s header for the route this replaced.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import { generate } from "../generate.js";
  import { DEV } from "../dev.js";
  import { assertValidFile } from "../load.js";
  import type { TileState, TilesetFile } from "../types.js";
  import {
    cellPlacementAffine,
    cssLength,
    naturalHeight,
    naturalRatio,
    originX,
    scaleFactor,
    visibleColumns,
    type GridGeometry,
    type Lattice,
  } from "./geometry.js";
  import { cssTransform, isIdentityTransform, maxSpill } from "./transform.js";
  import { coverRect } from "./edges.js";
  import {
    canvasPresentation,
    domGeometry,
    domLattice,
    uniformDrawList,
    uniformGeometry,
  } from "./uniform.js";
  import { assetTooSmall, cellTooSmall, WarnOnce } from "./warn.js";
  import { currentDpr, observeDpr, track } from "./measure.js";
  import { occlusionMask, stableMask, type OcclusionMask } from "./occlusion.js";
  import {
    legacyPropErrors,
    optionErrors,
    resolveOptions,
    sameTargets,
    type NormalizedTargets,
    type TilesetOptions,
  } from "./options.js";
  import type { RenderRect } from "./space.js";
  import { ImageBank } from "./images.js";
  import {
    assetKey,
    parseAssetKey,
    type AssetRef,
    type Drawable,
  } from "./provider.js";

  interface Props {
    /** Parsed, valid, and held stable by the host (**S3**). */
    file: TilesetFile;

    /**
     * Every setting, in one object — `TilesetOptions` in `./options.ts` documents
     * each field and its default, and `resolveOptions` is the only place a
     * default is written. `undefined` is accepted as well as absence so a
     * wrapper can forward its own optional `options` straight through.
     */
    options?: TilesetOptions | undefined;

    /**
     * The render box element — `08` §7, bindable and read-only in practice. Not in
     * `options` because Svelte cannot `bind:` into a field of an object prop.
     *
     * **The host measures; the renderer does not.** `07` **R5** forbids the
     * *renderer* consulting or measuring anything to compute a cell box, and it
     * never needs to. But converting a pointer event into render space is
     * `07` §8.2's explicitly-assigned *caller* work, and that requires the box's
     * position on screen. So the element is exposed and "an editor calling
     * `getBoundingClientRect()` on it is doing something **R5** does not touch".
     * `toRenderSpace` in `./space.ts` is that conversion, done once.
     *
     * This is the whole of what `09` needs from the component beyond `cellBox`
     * and `cellAt`. In particular there is **no exported grid**: an overlay shows
     * which cells an Operation *selects*, which `09` derives from the Operation
     * it is editing, never from the drawn output.
     *
     * **Under `"canvas"` this is the wrapper, not the canvas.** They are not the
     * same element and not the same size: the canvas is the *grid* (its visible
     * columns) and hangs off both sides by the designed bleed, while this is the
     * *box* — what `Wpx` means, and what **R9** clips against. Binding it to the
     * canvas would hand a pointer-to-render-space conversion a rect wider than the
     * render box, which is `07` §8.2's "single most likely place to get this
     * wrong" arriving by a new route.
     */
    box?: HTMLElement | null;
  }

  // There is no width prop: `07` §5.3 makes every quantity a fixed fraction of
  // Wpx, so placement is expressed in relative units and Wpx is whatever width
  // the host's CSS gives the element.
  //
  // There is no `config` prop and no `layout` prop: splitting the file across two
  // would hand the host a way to pair mismatched halves (§3.1). That is also why
  // the settings object is called `options` — `file.config` already has the name.
  //
  // `rest` exists only to catch the props that moved into `options` in 0.6.0.
  // Svelte drops an unknown prop silently, which here would mean a host's seed or
  // provider vanishing into a plausible picture.
  let { file, options, box = $bindable(null), ...rest }: Props = $props();

  /**
   * The options, checked in a development build and resolved to their defaults.
   *
   * Checked here and not in `resolveOptions` for **C5**'s reason: resolving trusts
   * its input, and the check is what earns the trust. Production skips it, as it
   * skips `assertValidFile`.
   */
  const resolved = $derived.by(() => {
    if (DEV) {
      const errors = [...legacyPropErrors(rest), ...optionErrors(options)];
      if (errors.length > 0) {
        throw new Error(
          "`<Tileset>`'s props are not valid:\n" + errors.map((e) => `  - ${e}`).join("\n"),
        );
      }
    }
    return resolveOptions(options);
  });

  // **One derived per field, and that is what keeps R12 true.** A host writing
  // `options={{ ... }}` inline hands over a new object whenever any field in it
  // changes. A `$derived` propagates only when its *value* changes, so unpacking
  // here means a change to `avoid.padding` reaches the mask and stops there,
  // instead of re-running `generate()` through a dependency on `options` itself.
  // Nothing below this block reads `resolved` or `options` again, except the one
  // `untrack`ed read in `reportAssetError`.
  const seedOption = $derived(resolved.seed);
  const loadSalt = $derived(resolved.loadSalt);
  const substrate = $derived(resolved.substrate);
  const sizing = $derived(resolved.sizing);
  const alignX = $derived(resolved.alignX);
  const alignY = $derived(resolved.alignY);
  const provider = $derived(resolved.provider);
  const padding = $derived(resolved.avoid?.padding ?? 0);

  // The targets are compared by content (`sameTargets`), because an inline
  // `targets: [a, b]` is a new array every time and each new identity would tear
  // down and re-register the tracker's observers. `lastTargets` is a plain
  // variable on purpose: it is a memo, not state.
  let lastTargets: NormalizedTargets | null = null;
  const targets = $derived.by(() => {
    const next = resolved.avoid?.targets ?? null;
    if (!sameTargets(lastTargets, next)) lastTargets = next;
    return lastTargets;
  });

  /**
   * `onAssetError`, read at call time and **untracked**. It is called from inside
   * `drawables`' derivation, and a tracked read there would make every new
   * identity of a host's inline callback re-resolve every asset.
   */
  function reportAssetError(ref: AssetRef, cause: unknown): void {
    untrack(() => resolved.onAssetError)?.(ref, cause);
  }

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
  const effectiveSeed = $derived(seedOption ?? checked.config.defaultSeed);

  // Regenerates when `file.config`, `seed`, or `loadSalt` changes, and on nothing
  // else — not a `provider` change, not a viewport resize, not hydration
  // (`08` §5.2, `07` §9.1), and **not a keep-out change**: the mask is applied at
  // paint, downstream of this. A viewport resize changes `s` and nothing else, so
  // every cell keeps its TileState and moves to a new rect.
  const grid = $derived(generate(checked.config, effectiveSeed, loadSalt));

  const layout = $derived(checked.layout);
  const rows = $derived(checked.config.rows);
  const columns = $derived(checked.config.columns);
  const ratio = $derived(naturalRatio(layout, rows));

  /**
   * The box's height under `"fixed"`, in CSS px: the design box at `s = 1`.
   * Constant, so it is known before anything is measured — which is what lets a
   * fixed-size tileset reserve exact space in the server HTML the way a fluid one
   * reserves its ratio.
   */
  const fixedHeight = $derived(naturalHeight({ layout, rows, columns, Wpx: 0, sizing: "fixed" }));

  /**
   * How far, in whole cells, any drawable in this grid spills past its own cell.
   * Culling widens by this so a scaled or rotated neighbour just outside the box
   * still paints the part of it that reaches in. Per grid, not per resize.
   */
  const spill = $derived(maxSpill(grid));

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
        reportAssetError(ref, cause);
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
    reportAssetError(
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
   * affine CSS lengths**, `cellPlacementAffine`: correct at every width with
   * nothing measured, per `07` §5.3. Under `"fluid"` with top alignment that is
   * bare percentages, byte-identical to what 0.5.0 emitted; `"fixed"` adds a px
   * term and a pinned percentage (`calc(50% + 12px)`), and a non-top `alignY` a
   * percentage `top`. That the initial HTML carries complete geometry in every
   * mode is the whole reason the `"dom"` substrate exists.
   *
   * **After measurement it is px from `domGeometry`'s square cell**, pinned in the
   * box at an integer origin. Neighbours share an edge here too — cell `x`'s right
   * edge is `originXDev + (x+1) * cellDev`, which is identically cell `x+1`'s left
   * edge (**R6**) — and the widths are equal as well as adjacent, so `object-fit:
   * cover` crops a square asset by nothing.
   *
   * **`domGeometry` and not `uniformGeometry`**, which is the one place this
   * substrate's geometry parts company with the canvas's: its cell is rounded
   * **up**, so the grid always covers its box and the residual can only ever be a
   * cut. `uniformGeometry`'s `round` left the residual's sign free, and at about
   * half of all widths that showed as a band of page backdrop down each side.
   * Under `"fixed"` at an integer DPR the ideal cell is already whole and the two
   * roundings agree — the residual this paragraph is about is then zero.
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
    const p = cellPlacementAffine({ layout, rows, columns, sizing, alignX, alignY }, x, y);
    return (
      `width: ${cssLength(p.side)}; ` +
      `margin-left: ${cssLength(p.left)}; ` +
      `margin-top: ${cssLength(p.marginTop)};` +
      (p.topPct === 0 ? "" : ` top: ${p.topPct}%;`)
    );
  }

  // ----------------------------------------------------------- measurement ---

  /**
   * What `measure.ts` reports, and nothing else about the page is read.
   *
   * Width and DPR are ADR-006's two numbers. Height is read so a non-top `alignY`
   * has something to align against. `keepout` is the rects of `options.avoid`'s
   * targets in render space, and stays `null` without it — in which case nothing
   * outside the box is measured at all.
   */
  let measuredWidth = $state(0);
  let measuredHeight = $state(0);
  let keepout = $state.raw<RenderRect[] | null>(null);
  let dpr = $state(currentDpr());

  $effect(() => observeDpr((next) => (dpr = next)));

  // One registration with the page's shared scheduler, re-made when the box or
  // the targets change (the targets by content — see `targets`). The three
  // writes happen in one callback, so the geometry and the mask below are derived
  // from one consistent measurement, in the same frame.
  $effect(() => {
    const el = box;
    const t = targets;
    if (el === null) return;
    return track(el, t, (m) => {
      measuredWidth = m.width;
      measuredHeight = m.height;
      keepout = m.rects;
    });
  });

  // `box` is the render box whichever substrate is drawing, and both branches of
  // the template bind it directly. Under `"canvas"` that is the *wrapper*, not
  // the canvas: since the split they are different elements of different widths,
  // and the box is the one that means `Wpx`.

  const geometry = $derived<GridGeometry>({
    layout,
    rows,
    columns,
    Wpx: measuredWidth,
    sizing,
    alignX,
    alignY,
    // Read only when it can matter, so a top-aligned grid does not re-derive
    // everything when its own extent changes the box's height.
    Hpx: alignY === "top" ? undefined : measuredHeight,
  });

  // ---------------------------------------------------------------- canvas ---
  //
  // ADR-006. Everything below is inert under `substrate="dom"`.

  let canvas = $state<HTMLCanvasElement | null>(null);
  const bank = new ImageBank();
  /** Bumped when a decode lands, so the paint effect re-runs. `bank` is plain. */
  let bankVersion = $state(0);

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
        reportAssetError({ ...ref, meta: metaByKey.get(key) ?? {} }, cause);
      },
    );
  });

  /**
   * The uniform square cell, and where the residual went — `uniform.ts`, and the
   * substance of the whole fix.
   *
   * `null` until the box has been measured, and **`null` under `"dom"`**. The gate
   * is on the substrate as well as on the measurement for `domCell`'s reason: the
   * width observer is not itself gated — `box` is bound in both branches — so
   * `measuredWidth` alone would leave this non-null under `"dom"`, computing a
   * quantisation it does not draw from.
   */
  const uniform = $derived(
    substrate === "canvas" && measuredWidth > 0 ? uniformGeometry(geometry, dpr) : null,
  );

  /**
   * The **DOM** substrate's cell — `domGeometry`, and the one thing it does not
   * share with the canvas.
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
   * Gated on the substrate as well as on the measurement so the canvas never
   * computes it, and so `null` still selects the affine placement that makes this
   * the SSR-complete substrate.
   */
  const domCell = $derived(
    substrate === "dom" && measuredWidth > 0 ? domGeometry(geometry, dpr) : null,
  );

  /**
   * Which columns the canvas rasterises — those that meet the box, widened by
   * `spill`. Computed on the **ideal** lattice, which is where the canvas presents
   * its cells (the presentation cancels the quantisation).
   *
   * Under `"fluid"` this is every column for any ordinary design, and then the
   * presentation below is 0.5.0's exactly. Under `"fixed"` in a narrow box it is a
   * handful, and the canvas stays the size of what can be seen instead of the size
   * of the grid — see `canvasPresentation`.
   */
  const canvasColumns = $derived(
    uniform === null
      ? null
      : visibleColumns(
          { originX: originX(geometry), originY: 0, pitch: scaleFactor(geometry) * layout.cellSize },
          columns,
          measuredWidth,
          spill,
        ),
  );

  const presentation = $derived(
    uniform !== null && canvasColumns !== null
      ? canvasPresentation(geometry, uniform, dpr, canvasColumns)
      : null,
  );

  /**
   * The DOM substrate's columns, culled the same way on its own lattice. Before
   * measurement — and so on the server — every column, since nothing is known
   * about the box yet and the affine placement is correct at every width.
   *
   * Culled cells are **unmounted**, not hidden: under `"fixed"` a 76-column grid on
   * a phone mounts about a tenth of its nodes. Keyed by cell index, so a resize
   * mounts and unmounts only the columns at the edges.
   */
  const domColumns = $derived(
    domCell === null
      ? { x0: 0, x1: columns }
      : visibleColumns(domLattice(domCell, dpr), columns, measuredWidth, spill),
  );

  /** The cells the DOM branch mounts, in row-major order (**R10**). */
  const shownCells = $derived.by(() => {
    const out: Array<{ cell: TileState; i: number; x: number; y: number }> = [];
    const { x0, x1 } = domColumns;
    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i]!;
      if (cell.tileId === null || cell.assetId === null) continue;
      const x = i % grid.columns;
      if (x < x0 || x >= x1) continue;
      out.push({ cell, i, x, y: Math.floor(i / grid.columns) });
    }
    return out;
  });

  // ------------------------------------------------------------ keep-out ---

  /**
   * The lattice each substrate actually paints on — the mask must agree with the
   * picture to the pixel, so it asks for this rather than recomputing the ideal
   * mapping. See `Lattice` in `geometry.ts`.
   */
  const lattice = $derived<Lattice | null>(
    substrate === "canvas"
      ? (presentation?.lattice ?? null)
      : domCell !== null
        ? domLattice(domCell, dpr)
        : null,
  );

  /**
   * The keep-out mask — `occlusion.ts`. `null` without `options.avoid`, and until
   * there is both a measurement and a lattice.
   *
   * `stableMask` hands back the previous object when the cells hidden did not
   * change. The rects move on every frame of a resize, the mask only when a rect
   * crosses a cell edge, and that identity is what stops the DOM branch touching
   * an attribute and the canvas repainting for a mask that did not move.
   * `lastMask` is a plain variable for `lastTargets`' reason: a memo, not state.
   */
  let lastMask: OcclusionMask | null = null;
  const mask = $derived.by((): OcclusionMask | null => {
    if (keepout === null || lattice === null) return null;
    lastMask = stableMask(lastMask, occlusionMask(lattice, columns, rows, keepout, padding));
    return lastMask;
  });

  /**
   * **Nothing is shown over the page until the mask exists.** With `avoid` set,
   * tiles drawn before the first measurement would sit on top of the text for a
   * frame — and under SSR for the whole of hydration — which is exactly the
   * failure the option exists to prevent. The canvas already draws nothing before
   * it is measured; the DOM branch hides its box. Without `avoid`, this is always
   * `false` and SSR is unchanged.
   */
  const pending = $derived(targets !== null && mask === null);

  function masked(i: number): boolean {
    return mask !== null && mask[i] === 1;
  }

  /**
   * The draw list, in device px on the raster's own pixel grid.
   *
   * `0` for the x origin, not `uniform.originXDev`: under `"canvas"` the canvas
   * *is* the grid — its visible columns — so there is no box to centre in. The
   * centring moved to the presentation, where it happens at the ideal fractional
   * `leftCss` and so reproduces the author's designed bleed to the pixel rather
   * than to the nearest device pixel.
   *
   * Recomputed when the grid, the width, or the DPR changes, and on nothing else
   * — in particular not when an image finishes decoding. Geometry is committed
   * before resolution is attempted and never revised as a result of it, which is
   * `07` **R5**'s substance and the reason a missing asset leaves a hole in a
   * laid-out grid rather than collapsing it.
   *
   * Gated on `presentation`, so it is the empty list under `"dom"`. Only the paint
   * effect reads it, and this is one object per non-empty visible cell — 760 of
   * them on the demo's 76x10 preset — rebuilt on every resize tick, which is not
   * work to do for a substrate that discards it.
   *
   * The mask is **not** applied here. It changes independently of geometry, and
   * filtering at paint keeps a mask change from rebuilding the list.
   */
  const items = $derived(
    presentation !== null
      ? uniformDrawList(geometry, grid, dpr, 0, assetKey, presentation)
      : [],
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
   * Reads `items`, `mask` and `bank.ready`, so it re-runs when any of them moves —
   * a decode completing repaints without recomputing geometry, and a mask change
   * repaints without rebuilding the draw list.
   *
   * **The mask arrives in the same frame as the geometry it was computed on**,
   * because `measure.ts` flushes inside the ResizeObserver callback, before paint,
   * and reports the width and the rects together. This whole effect then runs in
   * the microtask after that callback — still before paint — so a resize never
   * shows a frame of tiles over the text. That is what makes masking safe on a
   * substrate that repaints wholesale.
   */
  $effect(() => {
    if (substrate !== "canvas") return;
    const el = canvas;
    const list = items;
    const u = uniform;
    const pr = presentation;
    const hidden = mask;
    const holding = pending;
    // Read so the effect re-runs when a decode lands. `ImageBank` is a plain
    // object by design, so its map is not itself reactive.
    void bankVersion;
    const ready = bank.ready;
    if (el === null || u === null || pr === null) return;

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
    const bw = pr.rasterWidthDev;
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

    // `avoid` is set and there is no mask yet: draw nothing rather than draw over
    // the page. See `pending`.
    if (holding) return;

    for (const item of list) {
      // Hidden by the keep-out mask: the cell draws nothing, and nothing else
      // about the list changes — the same outcome as `R3`'s missing drawable,
      // reached for a different reason.
      if (hidden !== null && hidden[item.index] === 1) continue;
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
</script>

<!--
  The render box. **S9** — no padding and no border, so its content box and border
  box coincide and `Wpx` is unambiguous. Host styling applies from the outside;
  padding or a border on it is unsupported rather than interpreted.

  **S8** — it declares its natural aspect ratio and no explicit height, so height
  follows width at every width with no measurement and no script. Host CSS may
  override the height, and `07` §7.3's vertical bleed then costs one line —
  `options.align.y` choosing which rows that line crops. Under `sizing: "fixed"`
  the natural height is a constant rather than a ratio, and is reserved as one.

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

  **There were three substrates until 0.6.0.** `"svg"` — one inline `<svg>` under
  a single `viewBox` — measured nothing and so was the most SSR-complete, and it
  showed a backdrop hairline at every shared edge (+52% leak, the worst measured;
  `SUBPIXEL-GEOMETRY.md`). It was never going to be the default, and fixed sizing,
  alignment and the keep-out mask would each have had to be built a third time for
  it. It was removed rather than left behind at a lower feature level, which would
  have made "which options work with which substrate" a question every user had to
  ask.
-->
{#if substrate === "canvas"}
  <!--
    **Two elements, because the two jobs are now two things.**

    The wrapper is the *box*: it is what `Wpx` means, it carries **R9**'s clip, and
    it declares **S8**'s natural ratio so correct space is reserved before anything
    is drawn. The canvas is the *grid*: its backing store is exactly the grid in
    device pixels, and it is presented at the ideal fractional grid width, hanging
    off both sides by the bleed the author designed. `leftCss` is negative
    whenever there is bleed, which is what puts it there. Since 0.6.0 it is the
    grid's **visible columns** rather than all of them (`canvasPresentation`), which
    under `"fixed"` in a narrow box is the difference between a canvas the size of
    the screen and one many times wider.

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
    box of the right ratio — or, under `"fixed"`, of the right height, inline and
    only until then. That is the canvas substrate's known SSR cost, and it is why
    `"dom"` still exists.

    **Vertical alignment moves the canvas with `position: relative; top`**, never
    with a margin. A relative offset is visual only: the wrapper still takes its
    height from the canvas's unshifted box, so the height the shift is measured
    against does not move with the shift. A bottom-aligned margin would be a fixed
    point at any value.
  -->
  <div
    class="tileset"
    style={presentation === null
      ? sizing === "fixed"
        ? `height: ${fixedHeight}px;`
        : `aspect-ratio: ${ratio};`
      : ""}
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
      style={presentation === null
        ? ""
        : `width: ${presentation.widthCss}px; margin-left: ${presentation.leftCss}px;` +
          (presentation.topCss === 0 ? "" : ` position: relative; top: ${presentation.topCss}px;`)}
      bind:this={canvas}
    ></canvas>
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
    SSR-complete one. Under `"fixed"` the natural height is a constant, so the
    `.extent` carries it from the start instead and no ratio is declared at all.

    `visibility: hidden` while `pending`: with `options.avoid` set, nothing is shown
    over the page until the keep-out mask exists — which on the server means the
    whole of hydration. Space is still reserved, so nothing reflows when it appears.
  -->
  <div
    class="tileset"
    style={(domCell === null && sizing !== "fixed" ? `aspect-ratio: ${ratio};` : "") +
      (pending ? " visibility: hidden;" : "")}
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

      `shownCells` is already culled to the visible columns and stripped of empty
      cells, so this is one node per cell that can be seen.

      **`data-masked` is the keep-out mask**, and it is an attribute rather than part
      of `cellStyle` on purpose. The style string is rewritten on every resize; a
      mask folded into it would rewrite it on every mask change too. As a separate
      attribute, a mask change touches only the cells whose value flipped — which,
      because `stableMask` keeps the identity of an unchanged mask, is none at all
      on most frames of a resize. It is also a hook a host stylesheet can target,
      and a later fade can transition.
    -->
    {#each shownCells as { cell, i, x, y } (i)}
      {@const key = assetKey(cell.tileId!, cell.assetId!)}
      {#if !loadFailed.has(key)}
          <div
            class="cell"
            style={cellStyle(cell, x, y)}
            data-masked={masked(i) ? "" : undefined}
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
    {:else if sizing === "fixed"}
      <div class="extent" style="height: {fixedHeight}px"></div>
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

  /* The keep-out mask. `visibility` rather than `display: none`: it changes no
     layout, keeps the image decoded for when the cell is uncovered again, and
     takes the cell out of hit-testing. */
  .cell[data-masked] {
    visibility: hidden;
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
