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

  **In a development build it asserts that, once per file** — see `#checked` in
  `./model.ts`. S3 as originally written forbade this outright, and `08` §3.4 gave
  the reason: "a component that validated would be doing at sixty frames per
  second what belongs at load, once." That rules out validating **per frame**,
  which a stage keyed on `file` does not do — it runs when the file changes, at
  the same cadence as `generate()` itself. The cost the objection names is not the
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
  // The bundler puts this in `<head>`, server-rendered pages included, so a
  // Svelte host's first paint is already styled. `injectStyles` below finds it
  // there and adds nothing; it adds the rules only where this copy cannot reach,
  // such as a shadow root or an iframe (`./styles.ts`).
  import "./tileset.css";
  import { DEV } from "../dev.js";
  import type { TileState, TilesetFile } from "../types.js";
  import { coverRect } from "./edges.js";
  import { assetTooSmall, cellTooSmall, WarnOnce } from "./warn.js";
  import { currentDpr, observeDpr, track, WRAPPER_ATTRIBUTE } from "./measure.js";
  import { FlipFlop, inertCellSizeRules } from "./breakpoints.js";
  import { cellStyle as placeCell, domBoxStyle, extentStyle, TilesetModel, type ModelInputs } from "./model.js";
  import { copyOptions, legacyPropErrors, optionErrors, type TilesetOptions } from "./options.js";
  import type { RenderRect } from "./space.js";
  import { ImageBank, NaturalSizeChecks } from "./images.js";
  import { injectStyles } from "./styles.js";
  import {
    assetKey,
    loadBlocked,
    parseAssetKey,
    recordLoadFailure,
    settledFor as settledIn,
    type Drawable,
    type Settled,
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
   * What `measure.ts` reports, and nothing else about the page is read. See
   * `ModelInputs` in `./model.ts` for what each one is for.
   */
  let measuredWidth = $state(0);
  let measuredHeight = $state(0);
  let keepout = $state.raw<RenderRect[] | null>(null);
  let dpr = $state(currentDpr());

  // ------------------------------------------------------------------ model ---
  //
  // **Everything this component derives is `TilesetModel`'s** (`./model.ts`):
  // the options, the S3 assertion, the responsive rules, the grid, the geometry,
  // the keep-out mask and the draw list, each with the reasoning that shaped it.
  // What is left here is what owns an element or waits on something — the
  // measurement, the asset settling, the image bank, the paint — and the markup.
  //
  // **How runes drive a plain class without a second copy of the graph.** One
  // `$derived` gathers the inputs into a plain object, and each output below is
  // its own `$derived` that hands those inputs to the model and reads one output.
  // The model's stages memoize the way the chain did (`Object.is` per input), so a
  // read after a push that changed nothing it depends on costs a comparison, and
  // an output derived keeps its value — and so stops there — unless its output's
  // identity moved.
  //
  // **What this does not keep is the chain's scheduling.** Every output derived
  // depends on `inputs`, so every input change *marks* all of them, and every
  // effect reading any of them is dirty-checked, where the chain only reached the
  // effects downstream of what changed. Measured on the demo's sixteen tilesets,
  // script time per resize, against the chain: within noise under both substrates.
  // It was +12% (canvas) and +20% (dom) until the model stopped doing work the
  // chain never did — the mask's buffers without `avoid`, and a new cell list on
  // every frame of a resize — which the profile showed as Svelte bookkeeping
  // because that work fanned out through it. If it comes back, look there first.
  // The marking goes entirely when the component stops owning the DOM.
  //
  // **Why the model is set inside each output read, not once in `inputs`.** A
  // `$derived` may be evaluated speculatively — Svelte's async batches and `fork()`
  // evaluate one inside a batch that may never commit. `inputs` is therefore pure,
  // and each read sets the model to the inputs *it* sees before reading, so a
  // speculative read cannot leave the model holding inputs a committed read then
  // trusts. Setting identical inputs is a no-op (`TilesetModel.set`).
  //
  // Rejected: exporting the stage functions and keeping the `$derived` chain here.
  // That is two wirings of one graph, which is `07` **R1**'s drift by a new route.

  /**
   * The options, copied so that an edit made in place is seen — `copyOptions`
   * says why. Its own `$derived`, so the copy is made when an option changes and
   * not on every resize.
   */
  const opts = $derived(copyOptions(options));

  const inputs = $derived.by((): ModelInputs => {
    // The props that moved into `options` in 0.6.0 are a Svelte question, so they
    // are asked here; the options are asked again by the model, for a host that
    // has no component. Both here, so one throw reports everything that is wrong
    // with the props at once, as it did before the model existed.
    if (DEV) {
      const errors = [...legacyPropErrors(rest), ...optionErrors(opts)];
      if (errors.length > 0) {
        throw new Error(
          "`<Tileset>`'s props are not valid:\n" + errors.map((e) => `  - ${e}`).join("\n"),
        );
      }
    }
    return { file, options: opts, width: measuredWidth, height: measuredHeight, rects: keepout, dpr };
  });

  /** SSR-stable, so the server's reservation CSS and the client's agree. */
  const uid = $props.id();
  const model = new TilesetModel(uid, untrack(() => inputs));

  /** One model output, at the inputs this read sees. */
  function out<T>(at: ModelInputs, read: () => T): T {
    model.set(at);
    return read();
  }

  const substrate = $derived(out(inputs, () => model.substrate));
  const overflow = $derived(out(inputs, () => model.overflow));
  const targets = $derived(out(inputs, () => model.targets));
  const base = $derived(out(inputs, () => model.base));
  const rules = $derived(out(inputs, () => model.rules));
  const hasRules = $derived(out(inputs, () => model.hasRules));
  const ruleKey = $derived(out(inputs, () => model.ruleKey));
  const reservation = $derived(out(inputs, () => model.reservation));
  const sizing = $derived(out(inputs, () => model.sizing));
  const ratio = $derived(out(inputs, () => model.ratio));
  const fixedHeight = $derived(out(inputs, () => model.fixedHeight));
  const metaByKey = $derived(out(inputs, () => model.metaByKey));
  const drawables = $derived(out(inputs, () => model.drawables));
  const uniform = $derived(out(inputs, () => model.uniform));
  const domCell = $derived(out(inputs, () => model.domCell));
  const presentation = $derived(out(inputs, () => model.presentation));
  const shownCells = $derived(out(inputs, () => model.shownCells));
  const placement = $derived(out(inputs, () => model.placement));
  const mask = $derived(out(inputs, () => model.mask));
  const pending = $derived(out(inputs, () => model.pending));
  const items = $derived(out(inputs, () => model.items));
  /** `.extent`'s style, or `null` for none (`extentStyle`). */
  const extent = $derived(extentStyle(domCell, dpr, sizing, fixedHeight));

  /** `onAssetError`, read at call time — see `TilesetModel.report`. */
  const reportAssetError = model.report;

  // Development only: name the scrollbar feedback loop, and a rule that changes
  // nothing. Neither changes what is drawn.
  const flips = new FlipFlop();
  $effect(() => {
    const key = ruleKey;
    if (!DEV || !hasRules) return;
    if (flips.record(key, performance.now())) {
      console.warn(
        "<Tileset>: a responsive breakpoint is flipping back and forth on its own. Changing " +
          "`rows` probably adds or removes the page scrollbar, which moves the box back across " +
          "the breakpoint. `scrollbar-gutter: stable` on the page root stops it.",
      );
    }
  });
  $effect(() => {
    if (!DEV || !hasRules) return;
    for (const i of inertCellSizeRules(rules, base)) {
      warnings.say(
        `inert:${i}`,
        `<Tileset>: responsive rule ${i} changes only \`cellSize\`, and the tileset is fluid ` +
          "wherever it holds, so it changes nothing visible. Under fluid sizing the density knob is " +
          "`columns`; `cellSize` is CSS px only under `sizing: \"fixed\"`.",
      );
    }
  });

  // Keys whose <img> failed to load, and the `src` that failed (`provider.ts`
  // `recordLoadFailure` says why the `src`). `08` **S6**: the substrate
  // substitutes on its own — a broken <img> renders the browser's placeholder
  // glyph, which is a drawable the renderer did not choose, in a cell **R3**
  // says must draw nothing.
  let loadFailed = $state(new Map<string, string>());

  /**
   * A picture with no natural size is refused on the DOM substrate too, so it
   * agrees with canvas (`images.ts` `requireNaturalSize`). It shows until the
   * probe settles, about one frame.
   *
   * `cell` and `src` are parameters, so they are bound when `load` fires. The
   * template's `cell` and `drawable` are live bindings of a keyed `{#each}` and
   * `{#await}`: read in the probe's `.catch` instead, a reseed during the probe
   * had moved them to the cell's *new* asset, and the failure was recorded
   * against a healthy one.
   */
  function checkLoaded(cell: TileState, src: string, img: HTMLImageElement): void {
    sizeChecks.check(src, img).catch((cause: unknown) => handleLoadError(cell, src, cause));
  }

  function handleLoadError(cell: TileState, src: string, cause: unknown): void {
    if (cell.tileId === null || cell.assetId === null) return;
    const key = assetKey(cell.tileId, cell.assetId);
    const next = recordLoadFailure(loadFailed, key, src);
    if (next === null) return;
    loadFailed = next;
    reportAssetError(
      { tileId: cell.tileId, assetId: cell.assetId, meta: metaByKey.get(key) ?? {} },
      cause,
    );
  }

  /** The cell's whole inline style — `cellStyle` in `./model.ts` says why each part is what it is. */
  function cellStyle(cell: TileState, x: number, y: number): string {
    return placeCell(placement, cell, x, y);
  }

  // ----------------------------------------------------------- measurement ---

  // Before `track` registers, so the first measurement is of a styled box: the
  // box's `width: 100%` and `padding: 0` are what make its width `Wpx` (S9).
  $effect(() => {
    if (box !== null) injectStyles(box);
  });

  $effect(() => observeDpr((next) => (dpr = next)));

  // One registration with the page's shared scheduler, re-made when the box or
  // the targets change (the targets by content — see the model's `targets`). The
  // three writes happen in one callback, so the geometry and the mask are derived
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

  // ---------------------------------------------------------------- canvas ---
  //
  // ADR-006. Everything below is inert under `substrate="dom"`.

  let canvas = $state<HTMLCanvasElement | null>(null);
  // One set of checks for both substrates, so a src is probed once (`images.ts`).
  const sizeChecks = new NaturalSizeChecks();
  const bank = new ImageBank(sizeChecks);
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

  /**
   * What each pending drawable settled to, tagged with the promise it came from
   * so a newer promise for the same key is never judged by an older one's
   * outcome. The DOM substrate reads it in `loadBlocked`: a lazy provider's `src`
   * is not on the promise, and without this a cell whose drawable rejected or
   * whose `<img>` failed stayed mounted, empty, and still took a host's clicks.
   */
  let settled = $state(new Map<string, Settled>());

  /** `settled`'s entry for `value`, or nothing if it is pending or not a promise. */
  function settledFor(key: string, value: Drawable | Promise<Drawable> | undefined): Settled | undefined {
    return settledIn(settled, key, value);
  }

  // Runs on **both** substrates: canvas needs `sources` for the bank, and the DOM
  // needs `settled` to unmount a lazy cell that can never draw.
  $effect(() => {
    const seen = drawables;
    let live = true;

    const settle = (key: string, src: string): void => {
      if (!live) return;
      if (sources.get(key) === src) return;
      const next = new Map(sources);
      next.set(key, src);
      sources = next;
    };

    const record = (key: string, from: Promise<Drawable>, src: string | undefined): void => {
      if (!live) return;
      settled = new Map(settled).set(key, { from, src, rejected: src === undefined });
    };

    // Drop keys the config no longer references, so a deleted Tile stops drawing.
    if ([...sources.keys()].some((key) => !seen.has(key))) {
      sources = new Map([...sources].filter(([key]) => seen.has(key)));
    }
    if ([...settled.keys()].some((key) => !seen.has(key))) {
      settled = new Map([...settled].filter(([key]) => seen.has(key)));
    }

    for (const [key, value] of seen) {
      if (value instanceof Promise) {
        // A rejection is reported through `onAssetError` by `resolveDrawable`,
        // and a URL that fails to load is reported by the bank or the `<img>`.
        void value.then(
          (d) => {
            settle(key, d.src);
            record(key, value, d.src);
          },
          () => {
            record(key, value, undefined);
            // R3: a rejection draws nothing. A key re-resolved lazily kept its
            // previous src while pending, and without this it drew that
            // picture for good. `renderer.ts` `#settle` does the same.
            if (live && sources.has(key)) {
              const next = new Map(sources);
              next.delete(key);
              sources = next;
            }
          },
        );
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

  function masked(i: number): boolean {
    return mask !== null && mask[i] === 1;
  }

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

  Since 0.8.0 the DOM box can give that clip up: `options.overflow: "visible"`
  hands it to the host, whose own `overflow: hidden` on an ancestor is then the
  boundary, if it wants one. Both cases above come back into view with it, which is
  the price of seeing a translated tile whole and is documented on the option. It
  stays one boundary, never one per cell; it is only a question of whose.

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
<!--
  **The container wrapper exists only when rules do.** It is what the reservation
  stylesheet's `@container` queries measure, so the box reserves the height of
  the rule that will hold before anything is measured — including in the server
  HTML. `container-type: inline-size` is why it is conditional: inline-size
  containment gives an element no width from its content, so in a shrink-to-fit
  context (an inline-block, a flex item with an auto basis) the wrapper collapses
  to nothing. A tileset without rules keeps the DOM it had before 0.7.0; one with
  rules needs a parent with a definite width, and the README says so.

  `data-tileset-wrapper` is also what keeps `options.avoid`'s selectors resolving
  in the host's section rather than in here (`measure.ts`'s `scopeOf`).

  The stylesheet goes through `{@html}` because its selectors carry this
  instance's id; every value in it is a number or `$props.id()`'s, never text a
  page author wrote (`reservationCss`).
-->
{#snippet body()}
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
      style={presentation === null && !hasRules
        ? sizing === "fixed"
          ? `height: ${fixedHeight}px;`
          : `aspect-ratio: ${ratio};`
        : ""}
      aria-hidden="true"
      data-tileset-box=""
      data-measured={measuredWidth > 0 ? "" : undefined}
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
        data-tileset-canvas=""
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
    <!--
      `overflow-visible` is a class rather than part of `style`: the style string is
      geometry and `pending`, rewritten on every resize, and this changes only when
      the option does.
    -->
    <div
      class="tileset"
      class:overflow-visible={overflow === "visible"}
      style={domBoxStyle({ domCell, sizing, hasRules, ratio, pending })}
      aria-hidden="true"
      data-tileset-box=""
      data-measured={measuredWidth > 0 ? "" : undefined}
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

        **Keyed by `(x, y)`, not by the flat index.** A breakpoint that changes
        `columns` renumbers every flat index, and keying on it remounted every node
        and re-decoded every image. A cell present in both grids is the same cell —
        positional hashing gives it the same TileState — so it keeps its node.

        **`data-masked` is the keep-out mask**, and it is an attribute rather than part
        of `cellStyle` on purpose. The style string is rewritten on every resize; a
        mask folded into it would rewrite it on every mask change too. As a separate
        attribute, a mask change touches only the cells whose value flipped — which,
        because `stableMask` keeps the identity of an unchanged mask, is none at all
        on most frames of a resize. It is also a hook a host stylesheet can target,
        and a later fade can transition.

        **`data-x` / `data-y` are the cell's identity, and this is the interactive
        substrate.** The browser hit-tests each `.cell` by its border box under its
        transform — so by the drawn tile, translated, scaled and turned, not by its
        home square — and resolves overlaps by document order, which is paint order.
        Masked cells are `visibility: hidden` and take no hits. What the browser could
        not say is *which* cell was hit; a host delegating one listener on the box
        reads it here. The canvas is one element and stays decorative.

        **The hit area is the rest pose.** `.cell` carries the generated transform and
        must not be animated: a hover effect that scaled `.cell` itself would move the
        hit area under the pointer and flicker at the edge. Animate the `<img>`
        inside it, and the cell stays where it is hit.
      -->
      {#each shownCells as { cell, i, x, y } (`${x},${y}`)}
        {@const key = assetKey(cell.tileId!, cell.assetId!)}
        {#if !loadBlocked(loadFailed, key, drawables.get(key), settledFor(key, drawables.get(key)))}
            <div
              class="cell"
              data-tileset-cell=""
              style={cellStyle(cell, x, y)}
              data-x={x}
              data-y={y}
              data-masked={masked(i) ? "" : undefined}
            >
              <!--
                Geometry is computed and committed before resolution is attempted, and
                is never revised as a result of it (**R5**, §4.2). So: no layout shift
                as assets arrive, assets lazily loadable in any order, and a missing
                asset leaves a hole in a laid-out grid rather than collapsing it.
              -->
              {#await drawables.get(key) then drawable}
                <!-- `loadBlocked` above sees a lazy provider's `src` only once
                     `settled` records it, an effect later; this covers that gap. -->
                {#if drawable && loadFailed.get(key) !== drawable.src}
                  <img
                    src={drawable.src}
                    alt=""
                    loading="lazy"
                    draggable="false"
                    onerror={(e) => handleLoadError(cell, drawable.src, e)}
                    onload={(e) => checkLoaded(cell, drawable.src, e.currentTarget as HTMLImageElement)}
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
        relationship the canvas has with its wrapper. Under `overflow: "visible"`
        there is no clip for it to overflow into, but it is `width: 0` and draws
        nothing, so a host height still wins and only the tiles show past it.
      -->
      {#if extent !== null}
        <div class="extent" data-tileset-extent="" style={extent}></div>
      {/if}
    </div>
  {/if}
{/snippet}

{#if hasRules}
  <div {...{ [WRAPPER_ATTRIBUTE]: uid }} class="container">
    {@html `<style>${reservation}</style>`}
    {@render body()}
  </div>
{:else}
  {@render body()}
{/if}

