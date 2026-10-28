/**
 * `TilesetRenderer` — the tileset renderer as a plain class, with no framework.
 *
 * `TilesetModel` (`./model.ts`) derives everything; this owns everything that
 * holds an element or waits on something: the DOM it adds to the host, the
 * measurement, the DPR listener, the settling of lazy drawables, the image bank,
 * the canvas paint, the responsive wrapper with its reservation stylesheet, and
 * the development warnings. It is `Tileset.svelte`'s side of the split, moved out
 * of the component so that a host with no Svelte — Observable Framework, a plain
 * page — gets the same renderer rather than a second one.
 *
 * ```ts
 * const r = new TilesetRenderer(el, { file, options });
 * r.update({ options: { ...options, seed: "b" } });
 * r.destroy();
 * ```
 *
 * **Canvas only, for now.** Under `substrate: "dom"` it throws in a development
 * build and draws nothing in production; the DOM substrate is still
 * `Tileset.svelte`'s alone.
 *
 * ## Scheduling: one microtask, for everything
 *
 * Every trigger — a measurement, `update()`, a DPR change, a lazy drawable
 * settling, a decode landing — pushes its input to the model and queues **one**
 * microtask, which brings the DOM up to date and paints. Nothing renders
 * synchronously except the constructor's first render, so the box has its
 * reserved size on return.
 *
 * **Why that is the same frame as a synchronous render.** The browser runs
 * pending microtasks right after each `ResizeObserver` callback, before it
 * paints, and `measure.ts` flushes inside that callback. So a resize's mask and
 * geometry, which arrive in one measurement, are painted before the frame. The
 * component's paint `$effect` relied on exactly this; it ran in the microtask
 * after the callback too. The other paths:
 * - **Text moved** (a mutation, a font load): the scheduler flushes on
 *   `requestAnimationFrame`, and this paints in the microtask after it, still
 *   before paint.
 * - **`avoid` turned on by `update()`**: `#render` re-tracks *first*, and
 *   `track()` measures synchronously, so the rects are in the model before
 *   anything reads the mask.
 * - **Before any rects exist**: `pending` holds the paint, and the canvas draws
 *   nothing.
 * - **A new file or seed**: the mask is recomputed from the current rects
 *   against the new grid, in the same model read.
 * - **A decode**: paints with the current mask.
 *
 * Rejected: rendering synchronously inside `onMeasure`, as first planned. It is
 * the same frame by a second path, and it paints twice when a decode and a
 * measurement land together.
 *
 * **Repainting on change, without dirty flags.** The model's outputs keep their
 * identity until their inputs change, so `#render` keeps what it last applied
 * and compares. That is how the component's `$effect`s decided to re-run, so the
 * behaviour carries over without translation.
 */

import { DEV } from "../dev.js";
import type { TilesetFile } from "../types.js";
import { FlipFlop, inertCellSizeRules } from "./breakpoints.js";
import { coverRect } from "./edges.js";
import { ImageBank, NaturalSizeChecks } from "./images.js";
import { currentDpr, observeDpr, track, WRAPPER_ATTRIBUTE, type Measurement } from "./measure.js";
import { TilesetModel } from "./model.js";
import type { OcclusionMask } from "./occlusion.js";
import { copyOptions, type NormalizedTargets, type TilesetOptions } from "./options.js";
import { parseAssetKey, type Drawable } from "./provider.js";
import { injectStyles, InstanceStyle } from "./styles.js";
import type { CanvasPresentation, UniformGeometry, UniformItem } from "./uniform.js";
import { assetTooSmall, cellTooSmall, WarnOnce } from "./warn.js";

/** What a host hands the renderer. */
export interface TilesetRendererInputs {
  /** Parsed, valid, and held stable by the host (**S3**). */
  file: TilesetFile;
  /** Every setting; `TilesetOptions` documents each field and its default. */
  options?: TilesetOptions | undefined;
}

export interface TilesetRendererInit extends TilesetRendererInputs {
  /**
   * This instance's id, which scopes its reservation stylesheet. Defaults to a
   * fresh one. A framework that renders on the server passes its own SSR-stable
   * id (Svelte's `$props.id()`), so the server's reservation CSS and the
   * client's agree. It is written into a quoted attribute selector, so it must
   * not contain `"` or `\`.
   */
  id?: string;
}

/**
 * The random part keeps two copies of this package on one page — two bundles,
 * or two versions — from both naming an instance `gts-1`, which would give two
 * tilesets the same reservation selector.
 *
 * `Math.random()` is not **S7**'s concern: an id is not generated output and
 * never reaches the grid. It is drawn once, at module load.
 */
const ID_PREFIX = `gts-${Math.random().toString(36).slice(2, 7)}-`;
let nextId = 1;

/** The canvas's inline style for a presentation, or none before measurement. */
function canvasStyle(pr: CanvasPresentation | null): string {
  if (pr === null) return "";
  return (
    `width: ${pr.widthCss}px; margin-left: ${pr.leftCss}px;` +
    (pr.topCss === 0 ? "" : ` position: relative; top: ${pr.topCss}px;`)
  );
}

/** What the last paint was of, so a render that changed none of it skips the canvas. */
interface Painted {
  items: readonly UniformItem[];
  uniform: UniformGeometry | null;
  presentation: CanvasPresentation | null;
  mask: OcclusionMask | null;
  pending: boolean;
  bankVersion: number;
}

export class TilesetRenderer {
  readonly #host: HTMLElement;
  readonly #model: TilesetModel;
  readonly #box: HTMLDivElement;
  readonly #canvas: HTMLCanvasElement;

  /** The host's options object as last handed in, copied on every `update()`. */
  #options: TilesetOptions | undefined;

  // ------------------------------------------------------------ lifecycle ---

  #destroyed = false;
  #queued = false;
  /**
   * True inside `#render`. A trigger that fires synchronously from inside it —
   * `track()`'s first measurement, `bank.sync`'s `onChange` for a dropped key —
   * does not queue another render: each lands before the reads that depend on
   * it, which is why `#render` does its work in the order it does.
   */
  #rendering = false;

  #untrack: (() => void) | null = null;
  /** `undefined` until the first track, so the first render always tracks. */
  #tracked: NormalizedTargets | null | undefined = undefined;
  #stopDpr: (() => void) | null = null;

  // --------------------------------------------------------------- the DOM ---

  /** Present while the options have responsive rules; the box is moved into it. */
  #wrapper: HTMLDivElement | null = null;
  #reservation: InstanceStyle | null = null;
  #boxStyle: string | null = null;
  #canvasStyle: string | null = null;
  #measured: boolean | null = null;

  // ------------------------------------------------------ async drawables ---

  /**
   * `(tileId, assetId)` -> `src`, for the bank. A new `Map` whenever it changes,
   * so `#render` sees the change by identity.
   *
   * A provider may be lazy — it returns `Drawable | Promise<Drawable>` — and the
   * canvas has no template to await in, so a pending drawable is awaited in
   * `#settle` and lands here when it settles. Skipping promises instead would
   * make every asynchronous provider draw nothing at all, silently.
   */
  #sources = new Map<string, string>();
  /** The drawables `#settle` last ran against. */
  #settledFrom: ReadonlyMap<string, Drawable | Promise<Drawable>> | null = null;
  /**
   * Bumped by every `#settle`. A promise's handler compares it to the epoch it
   * was subscribed under and drops the result if a later settle has run — the
   * component's per-run `live` flag, without a cleanup to call.
   */
  #epoch = 0;

  // --------------------------------------------------------------- canvas ---

  // One set of checks for both substrates, so a src is probed once (`images.ts`).
  readonly #sizeChecks = new NaturalSizeChecks();
  readonly #bank = new ImageBank(this.#sizeChecks);
  /** Bumped when a decode lands, so `#render` repaints. `bank` is plain. */
  #bankVersion = 0;
  /** The `#sources` the bank was last synced to. */
  #banked: ReadonlyMap<string, string> | null = null;
  #painted: Painted | null = null;

  // ------------------------------------------------------- development ---

  /**
   * The two asset rules, in a development build only — `SUBPIXEL-GEOMETRY.md`'s
   * *The 1/cellDev law* and *The one ceiling that is real*. Deliberately **not**
   * routed through `onAssetError`: that reports resolution and load failures,
   * and a legible-but-soft tile is neither.
   */
  readonly #warnings = new WarnOnce();
  readonly #flips = new FlipFlop();
  #lastRuleKey: string | null = null;
  #lastRules: unknown = null;

  /**
   * Appends the renderer's tree to `host`, measures it, and renders once,
   * synchronously, so the box has its reserved size when this returns.
   *
   * `host` is the caller's: it is never styled, replaced or emptied, and
   * `destroy()` leaves it as it was found. Give it a definite width — the box is
   * `width: 100%` of it.
   */
  constructor(host: HTMLElement, init: TilesetRendererInit) {
    const id = init.id ?? `${ID_PREFIX}${nextId++}`;
    if (DEV && /["\\]/.test(id)) {
      throw new Error(`TilesetRenderer: \`id\` must not contain \`"\` or \`\\\`; got ${JSON.stringify(id)}.`);
    }
    this.#host = host;
    this.#options = init.options;
    this.#model = new TilesetModel(id, {
      file: init.file,
      options: copyOptions(init.options),
      width: 0,
      height: 0,
      rects: null,
      dpr: currentDpr(),
    });
    // Before any element exists, so an invalid file or options object throws
    // here without leaving half a tree in the host.
    this.#check();

    const doc = host.ownerDocument;
    this.#box = doc.createElement("div");
    this.#box.className = "tileset";
    this.#box.setAttribute("aria-hidden", "true");
    this.#box.setAttribute("data-tileset-box", "");
    this.#canvas = doc.createElement("canvas");
    this.#canvas.className = "presented";
    this.#canvas.setAttribute("data-tileset-canvas", "");
    this.#box.append(this.#canvas);

    this.#rendering = true;
    try {
      this.#structure();
      // Before `track`, so the first measurement is of a styled box: the box's
      // `width: 100%` and `padding: 0` are what make its width `Wpx` (S9).
      injectStyles(this.#box);
      this.#stopDpr = observeDpr(this.#onDpr);
      this.#render();
    } finally {
      this.#rendering = false;
    }
  }

  /**
   * The render box: what `Wpx` means and what **R9** clips against — the box,
   * not the canvas, which is the grid and hangs past it by the bleed. The same
   * element for the renderer's whole life, so a host may hold it, and
   * `toRenderSpace` converts pointer events against it.
   */
  get box(): HTMLElement {
    return this.#box;
  }

  /**
   * Replaces the file, the options, or both. A field left out keeps its value.
   *
   * The options are copied on every call, so an object edited in place and
   * handed in again is seen (`copyOptions` says why); the model's per-field
   * memos stop an unchanged copy at the unpacking, so nothing regenerates for it
   * (**R12**).
   *
   * The DOM catches up in a microtask. In a development build the file and the
   * options are checked here, so an invalid one throws to the caller rather than
   * from the microtask.
   */
  update(next: Partial<TilesetRendererInputs>): void {
    if (this.#destroyed) {
      if (DEV) throw new Error("TilesetRenderer: `update()` after `destroy()`.");
      return;
    }
    if ("options" in next) this.#options = next.options;
    this.#model.set({
      ...(next.file !== undefined ? { file: next.file } : {}),
      options: copyOptions(this.#options),
    });
    this.#check();
    this.#schedule();
  }

  /**
   * Stops everything and removes what the renderer added. Idempotent.
   *
   * The order is what makes it clean:
   * 1. The flag first. The queued render, the settle handlers and the bank's
   *    callbacks all check it, so nothing already in flight can paint, write a
   *    map or report after this.
   * 2. The measurement and the DPR listener, so no new callback arrives.
   * 3. The reservation sheet and the renderer's tree, leaving `host` as it was.
   */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#untrack?.();
    this.#untrack = null;
    this.#stopDpr?.();
    this.#stopDpr = null;
    this.#reservation?.remove();
    this.#reservation = null;
    (this.#wrapper ?? this.#box).remove();
    this.#wrapper = null;
  }

  // ------------------------------------------------------------- triggers ---

  readonly #onMeasure = (m: Measurement): void => {
    if (this.#destroyed) return;
    this.#model.set({ width: m.width, height: m.height, rects: m.rects });
    this.#schedule();
  };

  readonly #onDpr = (dpr: number): void => {
    if (this.#destroyed) return;
    this.#model.set({ dpr });
    this.#schedule();
  };

  #schedule(): void {
    if (this.#queued || this.#rendering || this.#destroyed) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.#destroyed) return;
      this.#rendering = true;
      try {
        this.#render();
      } finally {
        this.#rendering = false;
      }
    });
  }

  /**
   * Development only: the model's own checks — the file (**S3**) and the
   * options — read eagerly so they throw to whoever handed the input in. And
   * the one this renderer adds: the substrate it does not draw yet.
   */
  #check(): void {
    if (!DEV) return;
    void this.#model.checked;
    if (this.#model.substrate === "dom") {
      throw new Error(
        'TilesetRenderer: `substrate: "dom"` is not supported here yet. Use `<Tileset>` for it, or `"canvas"`.',
      );
    }
  }

  // --------------------------------------------------------------- render ---

  /**
   * Brings everything up to date with the model, in dependency order: the
   * structure, the measurement, the drawables, the bank, the attributes, and
   * the paint. Anything that fires synchronously along the way lands before the
   * step that reads it (see `#rendering`).
   */
  #render(): void {
    const model = this.#model;

    this.#structure();

    // One registration with the page's shared scheduler, re-made when the
    // targets change — by content; see the model's `targets`. The box never
    // changes, so it is not a reason to re-track.
    const targets = model.targets;
    if (targets !== this.#tracked) {
      this.#tracked = targets;
      this.#untrack?.();
      this.#untrack = track(this.#box, targets, this.#onMeasure);
    }

    if (model.drawables !== this.#settledFrom) this.#settle();

    const substrate = model.substrate;
    if (substrate === "canvas" && this.#sources !== this.#banked) {
      this.#banked = this.#sources;
      this.#bank.sync(this.#sources, this.#onDecoded, this.#onDecodeError);
    }

    if (DEV) this.#devChecks();

    // Production under "dom": nothing is drawn (see the header).
    if (substrate !== "canvas") return;

    const presentation = model.presentation;
    this.#attributes(presentation);
    this.#paint(presentation);
  }

  /**
   * The container wrapper exists only while rules do: it is what the
   * reservation's `@container` queries measure, so the box reserves the height
   * of the rule that will hold before anything is measured. `container-type:
   * inline-size` is why it is conditional — containment gives an element no
   * width from its content, so in a shrink-to-fit context it collapses.
   *
   * **The box is moved, never rebuilt**, so `box` keeps its identity and the
   * tracker keeps watching the element it registered. The wrapper changes the
   * box's parent, but not its width, and the `ResizeObserver` would see it if
   * it did. `data-tileset-wrapper` is also what keeps `options.avoid`'s
   * selectors resolving in the host's section (`measure.ts`'s `scopeOf`).
   */
  #structure(): void {
    const model = this.#model;
    if (model.hasRules) {
      if (this.#wrapper === null) {
        const wrapper = this.#host.ownerDocument.createElement("div");
        wrapper.className = "container";
        wrapper.setAttribute(WRAPPER_ATTRIBUTE, model.uid);
        if (this.#box.parentNode === this.#host) this.#box.replaceWith(wrapper);
        else this.#host.append(wrapper);
        wrapper.append(this.#box);
        this.#wrapper = wrapper;
        this.#reservation = new InstanceStyle(wrapper);
      }
      this.#reservation!.set(model.reservation);
    } else {
      if (this.#wrapper !== null) {
        this.#reservation?.remove();
        this.#reservation = null;
        this.#wrapper.replaceWith(this.#box);
        this.#wrapper = null;
      } else if (this.#box.parentNode !== this.#host) {
        this.#host.append(this.#box);
      }
    }
  }

  /**
   * Subscribes to the drawables the model resolved, and drops keys the config no
   * longer references, so a deleted Tile stops drawing.
   *
   * A rejection is reported through `onAssetError` by `resolveDrawable`, and a
   * URL that fails to load by the bank; nothing here reports.
   */
  #settle(): void {
    const seen = this.#model.drawables;
    this.#settledFrom = seen;
    const epoch = ++this.#epoch;

    let next: Map<string, string> | null = null;
    if ([...this.#sources.keys()].some((key) => !seen.has(key))) {
      next = new Map([...this.#sources].filter(([key]) => seen.has(key)));
    }
    for (const [key, value] of seen) {
      if (value instanceof Promise) {
        void value.then(
          (d) => {
            if (this.#destroyed || epoch !== this.#epoch || this.#sources.get(key) === d.src) return;
            this.#sources = new Map(this.#sources).set(key, d.src);
            this.#schedule();
          },
          () => {},
        );
      } else if ((next ?? this.#sources).get(key) !== value.src) {
        next ??= new Map(this.#sources);
        next.set(key, value.src);
      }
    }
    if (next !== null) this.#sources = next;
  }

  readonly #onDecoded = (): void => {
    if (this.#destroyed) return;
    this.#bankVersion++;
    this.#schedule();
  };

  readonly #onDecodeError = (key: string, cause: unknown): void => {
    if (this.#destroyed) return;
    const ref = parseAssetKey(key);
    if (ref === null) return;
    this.#model.report({ ...ref, meta: this.#model.metaByKey.get(key) ?? {} }, cause);
  };

  /** Each written only when its string changed, so a resize touches what moved. */
  #attributes(presentation: CanvasPresentation | null): void {
    const model = this.#model;
    // The box declares a ratio only until it has a canvas to measure, then takes
    // its height from the canvas — `Tileset.svelte`'s template comment says why
    // a permanent ratio would leave a hairline under the bottom row. With rules,
    // the reservation stylesheet declares it instead.
    const boxStyle =
      presentation === null && !model.hasRules
        ? model.sizing === "fixed"
          ? `height: ${model.fixedHeight}px;`
          : `aspect-ratio: ${model.ratio};`
        : "";
    if (boxStyle !== this.#boxStyle) {
      this.#boxStyle = boxStyle;
      this.#box.setAttribute("style", boxStyle);
    }
    const measured = model.inputs.width > 0;
    if (measured !== this.#measured) {
      this.#measured = measured;
      this.#box.toggleAttribute("data-measured", measured);
    }
    const cs = canvasStyle(presentation);
    if (cs !== this.#canvasStyle) {
      this.#canvasStyle = cs;
      this.#canvas.setAttribute("style", cs);
    }
  }

  /** Development only: name the scrollbar feedback loop, and a rule that changes nothing. */
  #devChecks(): void {
    const model = this.#model;
    if (!model.hasRules) return;
    const key = model.ruleKey;
    if (key !== this.#lastRuleKey) {
      this.#lastRuleKey = key;
      if (this.#flips.record(key, performance.now())) {
        console.warn(
          "TilesetRenderer: a responsive breakpoint is flipping back and forth on its own. Changing " +
            "`rows` probably adds or removes the page scrollbar, which moves the box back across " +
            "the breakpoint. `scrollbar-gutter: stable` on the page root stops it.",
        );
      }
    }
    const rules = model.rules;
    if (rules !== this.#lastRules) {
      this.#lastRules = rules;
      for (const i of inertCellSizeRules(rules, model.base)) {
        this.#warnings.say(
          `inert:${i}`,
          `TilesetRenderer: responsive rule ${i} changes only \`cellSize\`, and the tileset is fluid ` +
            "wherever it holds, so it changes nothing visible. Under fluid sizing the density knob is " +
            "`columns`; `cellSize` is CSS px only under `sizing: \"fixed\"`.",
        );
      }
    }
  }

  /**
   * Paint, when anything it reads moved: the draw list, the geometry, the
   * presentation, the mask, `pending`, or the bank.
   *
   * **The backing store is the grid, not the box**, and the context is left
   * unscaled: the draw list is already in device px. `Tileset.svelte` carries
   * the full reasoning for every line below; the two are the same paint until
   * the component wraps this class.
   */
  #paint(presentation: CanvasPresentation | null): void {
    const model = this.#model;
    const now: Painted = {
      items: model.items,
      uniform: model.uniform,
      presentation,
      mask: model.mask,
      pending: model.pending,
      bankVersion: this.#bankVersion,
    };
    const was = this.#painted;
    if (
      was !== null &&
      was.items === now.items &&
      was.uniform === now.uniform &&
      was.presentation === now.presentation &&
      was.mask === now.mask &&
      was.pending === now.pending &&
      was.bankVersion === now.bankVersion
    ) {
      return;
    }
    this.#painted = now;

    const u = now.uniform;
    const pr = now.presentation;
    if (u === null || pr === null) return;

    const el = this.#canvas;
    const bw = pr.rasterWidthDev;
    const bh = Math.max(1, u.rasterHeightDev);
    if (el.width !== bw) el.width = bw;
    if (el.height !== bh) el.height = bh;

    const ctx = el.getContext("2d");
    if (ctx === null) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    // Edges are integral, so smoothing costs nothing at the boundary and buys
    // quality inside a downscaled tile.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (DEV) this.#warnings.say(`cell:${u.cellDev}`, cellTooSmall(u.cellDev));

    // `avoid` is set and there is no mask yet: draw nothing rather than draw
    // over the page. See the model's `pending`.
    if (now.pending) return;

    const hidden = now.mask;
    const ready = this.#bank.ready;
    for (const item of now.items) {
      // Hidden by the keep-out mask: the same outcome as R3's missing drawable,
      // reached for a different reason.
      if (hidden !== null && hidden[item.index] === 1) continue;
      const img = ready.get(item.key);
      // R3 -- a cell with no drawable draws nothing. No placeholder, and not a
      // sibling TileAsset, which would silently reweight D3's distribution.
      if (img === undefined) continue;

      if (DEV) {
        // Keyed on the asset alone, so a resize drag does not repeat it per step.
        const ref = parseAssetKey(item.key);
        if (ref !== null) {
          this.#warnings.say(
            item.key,
            assetTooSmall(ref.tileId, ref.assetId, img.naturalWidth, img.naturalHeight, u.cellDev),
          );
        }
      }

      // R8 -- the destination is square, so a non-square source is centre-cropped
      // exactly as `object-fit: cover` would crop it.
      const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, item.side, item.side);
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
      // D11 / R7 -- built about the cell's own centre; R9 -- the box clips.
      if (m !== null) ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(img, sx, sy, sw, sh, item.dx, item.dy, item.side, item.side);
      ctx.restore();
    }
  }
}
