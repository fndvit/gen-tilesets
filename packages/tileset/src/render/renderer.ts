/**
 * `TilesetRenderer` — the tileset renderer as a plain class, with no framework.
 *
 * `TilesetModel` (`./model.ts`) derives everything; this owns everything that
 * holds an element or waits on something: the DOM it adds to the host, the
 * measurement, the DPR listener, the settling of lazy drawables, the image bank,
 * the canvas paint, the responsive wrapper with its reservation stylesheet, and
 * the development warnings. It is *the* renderer: `<Tileset>` and
 * `<TileDecoration>` are thin Svelte wrappers over it (0.9.0), so a host with no
 * Svelte — Observable Framework, a plain page — gets the same renderer rather
 * than a second one.
 *
 * ```ts
 * const r = new TilesetRenderer(el, { file, options });
 * r.update({ options: { ...options, seed: "b" } });
 * r.destroy();
 * ```
 *
 * Both substrates: `"canvas"` paints one `<canvas>`, `"dom"` keeps one `.cell`
 * element per shown cell (see `#cells`). Switching between them at runtime keeps
 * the box.
 *
 * ## The invariants it carries
 *
 * **S1 — one entry point.** It accepts a `TilesetFile` and calls `generate()`
 * (through the model) itself. Nothing in the package accepts a `Grid<TileState>`
 * as an input.
 *
 * **S2 — the editor's preview is this renderer on the editor's file**, drawing
 * the complete operation stack. Overlays draw *over* it, never instead of it.
 * There is no preview mode and no second renderer.
 *
 * **S3 — no validation on the draw path.** It reads `schemaVersion` and
 * `engineVersion` for nothing, substitutes nothing, and in a production build has
 * undefined behaviour on a file `06`'s `validate()` would reject. A host must
 * never hold an invalid file, not even between keystrokes. **In a development
 * build it asserts that, once per file** (`#checked` in `./model.ts`). S3 as
 * written forbade even that, and `08` §3.4 gave the reason: "a component that
 * validated would be doing at sixty frames per second what belongs at load,
 * once." That rules out validating *per frame*, which a stage keyed on `file`
 * does not do — it runs when the file changes, at the cadence of `generate()`
 * itself. **C5** is untouched: `generate()` still trusts its input and
 * validation still lives in `../load.ts`; this only calls it, so skipping
 * `loadTilesetFile()` stops being silent. This is `08` open question 3's
 * renderer half; `../dev.ts`'s build detection is still the provisional answer it
 * says it is.
 *
 * **S7 — no random number, no ambient state** on the draw path, which makes
 * **R12** structural: there is no draw to repeat on a regeneration, so `loadSalt`
 * cannot be redrawn. (`freshId` below draws one, for an instance id that never
 * reaches the grid.)
 *
 * **There were three substrates until 0.6.0.** `"svg"` — one inline `<svg>`
 * under a single `viewBox` — measured nothing and so was the most SSR-complete,
 * and it showed a backdrop hairline at every shared edge (+52% leak, the worst
 * measured; `SUBPIXEL-GEOMETRY.md`). It was never going to be the default, and
 * fixed sizing, alignment and the keep-out mask would each have had to be built a
 * third time for it. It was removed rather than left behind at a lower feature
 * level, which would have made "which options work with which substrate" a
 * question every user had to ask.
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
import type { TileState, TilesetFile } from "../types.js";
import { FlipFlop, inertCellSizeRules } from "./breakpoints.js";
import { coverRect } from "./edges.js";
import { ImageBank, NaturalSizeChecks } from "./images.js";
import { currentDpr, observeDpr, scopeOf, track, WRAPPER_ATTRIBUTE, type Measurement } from "./measure.js";
import {
  canvasBoxStyle,
  cellStyle as placeCell,
  domBoxStyle,
  extentStyle,
  TilesetModel,
  type Placement,
  type ShownCell,
} from "./model.js";
import type { OcclusionMask } from "./occlusion.js";
import { copyOptions, type NormalizedTargets, type TilesetOptions } from "./options.js";
import {
  assetKey,
  loadBlocked,
  parseAssetKey,
  recordLoadFailure,
  settledFor,
  type Drawable,
  type Settled,
} from "./provider.js";
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
 * never reaches the grid. It is drawn once, **on the first instance built
 * without an `id`** — not at module load. Drawn at load, importing the package
 * took a value from the host's `Math.random`, so a host that seeds it (the
 * demo's screenshot harness does, to pin its per-load `loadSalt`) drew a
 * different salt and a different picture. The Svelte wrappers always pass an
 * id, so under them it is never drawn at all.
 */
let idPrefix: string | null = null;
let nextId = 1;

function freshId(): string {
  idPrefix ??= `gts-${Math.random().toString(36).slice(2, 7)}-`;
  return `${idPrefix}${nextId++}`;
}

/**
 * The canvas's inline style for a presentation, or none before measurement.
 *
 * `leftCss` is negative whenever there is bleed: the canvas is the grid's
 * visible columns at the ideal fractional width, hanging off both sides of the
 * box by the bleed the author designed.
 *
 * **Vertical alignment moves the canvas with `position: relative; top`**, never
 * with a margin. A relative offset is visual only: the box still takes its
 * height from the canvas's unshifted box, so the height the shift is measured
 * against does not move with the shift. A bottom-aligned margin would be a
 * fixed point at any value.
 *
 * No `height`, on purpose — `tileset.css` says why that is the one line not to
 * tidy.
 */
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

/** One mounted `.cell`, and what was last written to it. */
interface CellNode {
  el: HTMLDivElement;
  /** The cell and placement its `style` was computed from. */
  cell: TileState;
  placement: Placement;
  style: string;
  masked: boolean;
  /** The asset key and `src` of the `<img>` it holds; `undefined` src for none. */
  key: string | null;
  src: string | undefined;
  img: HTMLImageElement | null;
  /** The cell pass that last visited it; an older one is removed. */
  pass: number;
}

/** What the last cell pass was of, so a render that changed none of it skips the pass. */
interface CellsPainted {
  shown: readonly ShownCell[];
  placement: Placement;
  mask: OcclusionMask | null;
  drawables: ReadonlyMap<string, Drawable | Promise<Drawable>>;
  settled: ReadonlyMap<string, Settled>;
  loadFailed: ReadonlyMap<string, string>;
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
  /** The scope the tracker resolved `avoid` in, as of the last track. */
  #trackedScope: Element | null = null;
  #stopDpr: (() => void) | null = null;

  // --------------------------------------------------------------- the DOM ---

  /** Present while the options have responsive rules; the box is moved into it. */
  #wrapper: HTMLDivElement | null = null;
  #reservation: InstanceStyle | null = null;
  #boxStyle: string | null = null;
  #canvasStyle: string | null = null;
  #measured: boolean | null = null;
  /** The substrate whose elements are in the box, or `null` before the first render. */
  #mounted: "canvas" | "dom" | null = null;

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
   * What each pending drawable settled to, tagged with the promise it came from
   * so a newer promise for the same key is never judged by an older one's
   * outcome. The DOM substrate reads a lazy cell's `src` here, and `loadBlocked`
   * reads whether it rejected: without it a cell that can never draw stayed
   * mounted, empty, and still took a host's clicks. A new `Map` on change.
   *
   * Kept under both substrates, so a switch to `"dom"` finds it current.
   */
  #settled = new Map<string, Settled>();
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

  // ------------------------------------------------------------------ dom ---

  /**
   * The mounted cells, keyed by `"x,y"` — not by the flat index, which a
   * breakpoint that changes `columns` renumbers. A cell present in both grids
   * is the same cell (positional hashing gives it the same TileState), so it
   * keeps its element and its decoded `<img>`.
   */
  readonly #cells = new Map<string, CellNode>();
  #cellPass = 0;
  #cellsPainted: CellsPainted | null = null;
  /**
   * Keys whose `<img>` failed to load, and the `src` that failed (`provider.ts`
   * `recordLoadFailure` says why the `src`). **S6**: a broken `<img>` renders
   * the browser's placeholder glyph, a drawable the renderer did not choose, in
   * a cell **R3** says must draw nothing. A new `Map` on change.
   *
   * Never pruned, as in the component: a key the config dropped and later
   * references again with the same `src` would otherwise mount, fail, and
   * report a second time.
   */
  #loadFailed = new Map<string, string>();
  /** `<img>`s taken out of a cell; their late failures report nothing (`#retire`). */
  readonly #retired = new WeakSet<HTMLImageElement>();
  #extent: HTMLDivElement | null = null;
  #extentStyle: string | null = null;
  #overflowVisible = false;

  // ------------------------------------------------------- development ---

  /**
   * The two asset rules, in a development build only — `SUBPIXEL-GEOMETRY.md`'s
   * *The 1/cellDev law* and *The one ceiling that is real*. Deliberately **not**
   * routed through `onAssetError`: that reports resolution and load failures,
   * and a legible-but-soft tile is neither.
   */
  readonly #warnings = new WarnOnce();
  readonly #flips = new FlipFlop();
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
    const id = init.id ?? freshId();
    // In every build, not only development: the id is written into the
    // reservation stylesheet's selectors, so one carrying a quote could close
    // the selector and write rules of its own. One regex per instance is not a
    // cost worth trusting the input for.
    if (/["\\]/.test(id)) {
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

    // **The render box.** S9 — no padding and no border (`tileset.css`), so its
    // content box and border box coincide and `Wpx` is unambiguous. Host
    // styling applies from the outside; padding or a border on it is
    // unsupported rather than interpreted.
    //
    // S8 — it declares its natural aspect ratio and no explicit height, so
    // height follows width with no measurement and no script (until measured:
    // `canvasBoxStyle`, `domBoxStyle`). Host CSS may override the height, and
    // `07` §7.3's vertical bleed then costs one line, `options.align.y` choosing
    // which rows that line crops. Under `sizing: "fixed"` the natural height is a
    // constant, reserved as one.
    //
    // R9 — the render box is the only clipping boundary. That disposes of two
    // cases without special-casing them: `yOffset`'s clipping of row 0 is the
    // box's top edge meeting a negative `originY`, and the horizontal bleed is
    // its side edges meeting a negative `originX`. Since 0.8.0 the DOM box can
    // hand that clip to the host (`options.overflow: "visible"`), whose own
    // ancestor is then the boundary if it wants one; both cases above come back
    // into view with it. It stays one boundary, never one per cell.
    //
    // §4.5 — the output is decorative: the box is `aria-hidden` and every
    // `<img>` has `alt=""`. Meaningful content is never a tile.
    const doc = host.ownerDocument;
    this.#box = doc.createElement("div");
    this.#box.className = "tileset";
    this.#box.setAttribute("aria-hidden", "true");
    this.#box.setAttribute("data-tileset-box", "");
    // ADR-006 — **the canvas is the grid; the box is the box.** Two elements
    // because these are two jobs: the box is what `Wpx` means, carries R9's clip
    // and reserves S8's space; the canvas's backing store is exactly the grid in
    // device px — its visible columns since 0.6.0 (`canvasPresentation`), which
    // under `"fixed"` in a narrow box is the difference between a canvas the size
    // of the screen and one many times wider.
    //
    // **One canvas for the renderer's life**, restyled as it is measured, never
    // replaced. Building a new one at the first measurement would discard the
    // backing store for a difference of one attribute.
    this.#canvas = doc.createElement("canvas");
    this.#canvas.className = "presented";
    this.#canvas.setAttribute("data-tileset-canvas", "");

    this.#rendering = true;
    try {
      this.#structure();
      // Before `track`, so the first measurement is of a styled box: the box's
      // `width: 100%` and `padding: 0` are what make its width `Wpx` (S9).
      injectStyles(this.#box);
      this.#stopDpr = observeDpr(this.#onDpr);
      this.#render();
    } catch (cause) {
      // No instance reaches the caller to `destroy()`, so this does: otherwise
      // the box stays in the host and the tracker and the DPR listener keep a
      // half-built renderer alive for the life of the page.
      this.destroy();
      throw cause;
    } finally {
      this.#rendering = false;
    }
  }

  /**
   * The render box: what `Wpx` means and what **R9** clips against — the box,
   * not the canvas, which is the grid and hangs past it by the bleed. The same
   * element for the renderer's whole life, so a host may hold it, and
   * `toRenderSpace` converts pointer events against it.
   *
   * **The host measures; the renderer does not.** `07` **R5** forbids the
   * renderer consulting or measuring anything to compute a cell box. Converting
   * a pointer event into render space is `07` §8.2's caller work, and it needs
   * the box's position on screen, so the element is exposed: "an editor calling
   * `getBoundingClientRect()` on it is doing something **R5** does not touch".
   * Handing out the canvas instead would give that conversion a rect wider than
   * the render box — §8.2's "single most likely place to get this wrong".
   *
   * That is the whole of what `09` needs beyond `cellBox` and `cellAt`. There is
   * **no exported grid**: an overlay shows the cells an Operation *selects*,
   * derived from the Operation, never from the drawn output.
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
   *
   * An `<img>` still loading in a removed cell is retired (`#retire`), so a
   * late failure reports nothing.
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
    for (const node of this.#cells.values()) this.#unmountCell(node);
    this.#cells.clear();
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
   * options — read eagerly so they throw to whoever handed the input in.
   */
  #check(): void {
    if (!DEV) return;
    void this.#model.checked;
    // The rules too: one that reshapes a file that cannot be reshaped throws
    // from `rules`, which nothing else here reads before the microtask.
    void this.#model.rules;
  }

  // --------------------------------------------------------------- render ---

  /**
   * Brings everything up to date with the model, in dependency order: the
   * structure, the measurement, the drawables, the bank, the substrate's
   * elements, the attributes, and the paint or the cell pass. Anything that fires synchronously along the way lands before the
   * step that reads it (see `#rendering`).
   */
  #render(): void {
    const model = this.#model;

    this.#structure();

    // The box is styled before it is measured, as the component's template is:
    // a box measured bare reads a height of 0 (no ratio, no extent), and a
    // non-top `alignY` would place the first cell pass against it. Done again
    // below, once the measurement and the drawables are in.
    const substrate = model.substrate;
    this.#mount(substrate);
    this.#boxAttributes(substrate);

    // One registration with the page's shared scheduler, re-made when the
    // targets change — by content; see the model's `targets` — or when the
    // scope they resolve in does. The box never changes, but its ancestors can:
    // a renderer built on a detached element (the Observable case) is tracked
    // before it has a page around it, and the tracker reads the scope once, at
    // `track()`. The first measurement after attaching renders, and re-tracks
    // here. Only with targets: without them nothing is resolved in a scope.
    const targets = model.targets;
    const scope = targets === null ? null : scopeOf(this.#box);
    if (targets !== this.#tracked || scope !== this.#trackedScope) {
      this.#tracked = targets;
      this.#trackedScope = scope;
      this.#untrack?.();
      this.#untrack = track(this.#box, targets, this.#onMeasure);
    }

    if (model.drawables !== this.#settledFrom) this.#settle();

    if (substrate === "canvas" && this.#sources !== this.#banked) {
      this.#banked = this.#sources;
      this.#bank.sync(this.#sources, this.#onDecoded, this.#onDecodeError);
    }

    if (DEV) this.#devChecks();

    this.#boxAttributes(substrate);
    if (substrate === "canvas") this.#paint(model.presentation);
    else this.#paintCells();
  }

  /** The box's attributes and the substrate's non-cell elements, each written only on change. */
  #boxAttributes(substrate: "canvas" | "dom"): void {
    const model = this.#model;
    if (substrate === "canvas") {
      const presentation = model.presentation;
      this.#attributes(canvasBoxStyle(model));
      const cs = canvasStyle(presentation);
      if (cs !== this.#canvasStyle) {
        this.#canvasStyle = cs;
        this.#canvas.setAttribute("style", cs);
      }
    } else {
      this.#attributes(domBoxStyle(model));
      this.#domBox();
    }
  }

  /**
   * Puts the substrate's elements in the box and takes the other's out. The box
   * itself stays (C4), so `box` keeps its identity across a switch.
   *
   * The canvas is kept while detached, its backing store released, and
   * forgotten by `#painted` so a switch back repaints it. The cells are not
   * kept: a switch back to `"dom"` is rare, and holding every `<img>` of a
   * substrate that is not drawing would be memory spent on nothing.
   */
  #mount(substrate: "canvas" | "dom"): void {
    if (substrate === this.#mounted) return;
    this.#mounted = substrate;
    if (substrate === "dom") {
      this.#canvas.remove();
      this.#canvas.width = 0;
      this.#canvas.height = 0;
      this.#painted = null;
      return;
    }
    for (const node of this.#cells.values()) this.#unmountCell(node);
    this.#cells.clear();
    this.#cellsPainted = null;
    this.#extent?.remove();
    this.#extent = null;
    this.#extentStyle = null;
    if (this.#overflowVisible) {
      this.#overflowVisible = false;
      this.#box.classList.remove("overflow-visible");
    }
    this.#box.prepend(this.#canvas);
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
        wrapper.className = "tileset-container";
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
    if ([...this.#settled.keys()].some((key) => !seen.has(key))) {
      this.#settled = new Map([...this.#settled].filter(([key]) => seen.has(key)));
    }
    for (const [key, value] of seen) {
      if (value instanceof Promise) {
        void value.then(
          // Every change of `drawables` re-subscribes the promises it shares with
          // the last one (the cache keeps them), so most settles repeat what is
          // already recorded: those copy nothing and schedule nothing.
          (d) => {
            if (this.#destroyed || epoch !== this.#epoch) return;
            const was = this.#settled.get(key);
            const recorded = was !== undefined && was.from === value && was.src === d.src;
            if (recorded && this.#sources.get(key) === d.src) return;
            if (!recorded) this.#settled = new Map(this.#settled).set(key, { from: value, src: d.src, rejected: false });
            if (this.#sources.get(key) !== d.src) this.#sources = new Map(this.#sources).set(key, d.src);
            this.#schedule();
          },
          // A key re-resolved lazily keeps drawing its previous src on the
          // canvas while the promise is pending, so a meta edit does not flash.
          // A rejection must drop it: R3, the cell draws nothing — not the old
          // picture.
          () => {
            if (this.#destroyed || epoch !== this.#epoch) return;
            const was = this.#settled.get(key);
            const recorded = was !== undefined && was.from === value && was.rejected;
            if (recorded && !this.#sources.has(key)) return;
            if (!recorded) this.#settled = new Map(this.#settled).set(key, { from: value, src: undefined, rejected: true });
            if (this.#sources.has(key)) {
              const next = new Map(this.#sources);
              next.delete(key);
              this.#sources = next;
            }
            this.#schedule();
          },
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
    // `parseAssetKey`, not `key.split(" ")`, which the component once had: the
    // key has never contained a space — `assetKey` joins with `\0` — so the
    // `assetId` came back `undefined`, the guard returned, and a failed decode
    // reported nothing. Silent, the opposite of this package's posture.
    const ref = parseAssetKey(key);
    if (ref === null) return;
    this.#model.report({ ...ref, meta: this.#model.metaByKey.get(key) ?? {} }, cause);
  };

  /** Each written only when its string changed, so a resize touches what moved. */
  #attributes(boxStyle: string): void {
    if (boxStyle !== this.#boxStyle) {
      this.#boxStyle = boxStyle;
      this.#box.setAttribute("style", boxStyle);
    }
    const measured = this.#model.inputs.width > 0;
    if (measured !== this.#measured) {
      this.#measured = measured;
      this.#box.toggleAttribute("data-measured", measured);
    }
  }

  /** Development only: name the scrollbar feedback loop, and a rule that changes nothing. */
  #devChecks(): void {
    const model = this.#model;
    if (!model.hasRules) return;
    // `record` ignores a key equal to the last, so calling it every render is fine.
    if (this.#flips.record(model.ruleKey, performance.now())) {
      console.warn(
        "TilesetRenderer: a responsive breakpoint is flipping back and forth on its own. Changing " +
          "`rows` probably adds or removes the page scrollbar, which moves the box back across " +
          "the breakpoint. `scrollbar-gutter: stable` on the page root stops it.",
      );
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
   * unscaled: the draw list is already in device px, and scaling by the DPR to
   * draw in CSS px would put integer arithmetic back into floating point for no
   * gain. There is no origin to round and nothing to centre: every coordinate
   * is an exact multiple of `cellDev`, and the residual between grid and box is
   * carried by the CSS width the canvas is presented at — one isotropic
   * resample of one surface, where no internal edge exists to seam.
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

  // ------------------------------------------------------------------ dom ---

  /**
   * The box's DOM-only parts: the `overflow-visible` class, and `.extent`.
   *
   * `overflow-visible` is a class rather than part of `style`: the style is
   * geometry and `pending`, rewritten on resize, and this changes only when the
   * option does.
   *
   * `.extent` is the box's only in-flow child, and it exists to carry a height
   * (`extentStyle` in `./model.ts`). Cells are `position: absolute` — **R6**'s
   * shared edge is arithmetic between two margins, not a flow relationship — so
   * without it `height: auto` would collapse the box. An inline height on the
   * box would beat a host's stylesheet and break **S8**'s vertical bleed; a
   * child leaves the host's `height` winning, with this simply overflowing into
   * **R9**'s clip — the relationship the canvas has with the box. Under
   * `overflow: "visible"` there is no clip for it to overflow into, but it is
   * `width: 0` and draws nothing, so a host height still wins and only the tiles
   * show past it. It is kept last, after every cell (`#paintCells` inserts
   * before it).
   */
  #domBox(): void {
    const model = this.#model;
    const visible = model.overflow === "visible";
    if (visible !== this.#overflowVisible) {
      this.#overflowVisible = visible;
      this.#box.classList.toggle("overflow-visible", visible);
    }
    const style = extentStyle(model.domCell, model.inputs.dpr, model.sizing, model.fixedHeight);
    if (style === null) {
      this.#extent?.remove();
      this.#extent = null;
      this.#extentStyle = null;
      return;
    }
    if (this.#extent === null) {
      this.#extent = this.#box.ownerDocument.createElement("div");
      this.#extent.className = "extent";
      this.#extent.setAttribute("data-tileset-extent", "");
    }
    if (style !== this.#extentStyle) {
      this.#extentStyle = style;
      this.#extent.setAttribute("style", style);
    }
    if (this.#box.lastChild !== this.#extent) this.#box.append(this.#extent);
  }

  /**
   * Brings the `.cell` elements up to date: one per shown cell that can draw,
   * in row-major document order (**R10** — later rows paint on top, and a
   * host's hit-test resolves overlaps the same way). Three passes:
   *
   * 1. **Visit** each shown cell, reusing its node or creating one, and write
   *    what changed: the style when its cell or the placement did (and only if
   *    the string differs), `data-masked` only on a flip, the `<img>` only when
   *    the cell's `src` did.
   * 2. **Remove** every node the visit did not reach.
   * 3. **Order** with a cursor: each node should follow the one before it, and
   *    is moved only if it does not. Removing first is what makes this cheap —
   *    a resize inserts the new edge columns and moves nothing else, and a
   *    breakpoint that changes `columns` keeps the relative order of the cells
   *    both grids share (row-major order of `(x, y)` does not depend on
   *    `columns`), so it too only inserts.
   *
   * Rejected: rebuilding the list each render, which remounts and re-decodes
   * every image — the thing keying exists to stop; and a minimal-move diff
   * (longest increasing subsequence), which nothing here needs, since shared
   * cells never change relative order.
   *
   * Skipped whole when nothing it reads changed, which is most frames of a
   * resize with no breakpoint and no measured geometry change — and every
   * decode, which the DOM substrate does not wait on.
   */
  #paintCells(): void {
    const model = this.#model;
    const now: CellsPainted = {
      shown: model.shownCells,
      placement: model.placement,
      mask: model.mask,
      drawables: model.drawables,
      settled: this.#settled,
      loadFailed: this.#loadFailed,
    };
    const was = this.#cellsPainted;
    if (
      was !== null &&
      was.shown === now.shown &&
      was.placement === now.placement &&
      was.mask === now.mask &&
      was.drawables === now.drawables &&
      was.settled === now.settled &&
      was.loadFailed === now.loadFailed
    ) {
      return;
    }
    this.#cellsPainted = now;

    const pass = ++this.#cellPass;
    const order: HTMLDivElement[] = [];
    for (const shown of now.shown) {
      const node = this.#visit(shown, now);
      if (node === null) continue;
      node.pass = pass;
      order.push(node.el);
    }

    for (const [id, node] of this.#cells) {
      if (node.pass === pass) continue;
      this.#unmountCell(node);
      this.#cells.delete(id);
    }

    const box = this.#box;
    let next: ChildNode | null = box.firstChild;
    for (const el of order) {
      if (next !== el) box.insertBefore(el, next);
      else next = el.nextSibling;
    }
  }

  /**
   * One shown cell's node, brought up to date; `null` if it is not mounted.
   *
   * **Not mounted at all** when it can never draw — its provider rejected, or
   * its `src` failed to load (`loadBlocked`). An empty `.cell` would still take
   * a host's clicks, since the drawn tile is the unit of hitting.
   *
   * Geometry is written before resolution is attempted and is never revised by
   * it (**R5**, §4.2): no layout shift as assets arrive, and a missing asset
   * leaves a hole in a laid-out grid rather than collapsing it.
   */
  #visit({ cell, i, x, y }: ShownCell, now: CellsPainted): CellNode | null {
    const key = assetKey(cell.tileId!, cell.assetId!);
    const value = now.drawables.get(key);
    const settled = settledFor(now.settled, key, value);
    if (loadBlocked(now.loadFailed, key, value, settled)) return null;
    const id = `${x},${y}`;

    let node = this.#cells.get(id);
    if (node === undefined) {
      // **`data-x` / `data-y` are the cell's identity, and this is the
      // interactive substrate.** The browser hit-tests each `.cell` by its border
      // box under its transform — by the drawn tile, translated, scaled and
      // turned, not by its home square — and resolves overlaps by document order,
      // which is paint order. What it cannot say is *which* cell was hit; a host
      // delegating one listener on the box reads it here. The canvas is one
      // element and stays decorative.
      //
      // **The hit area is the rest pose.** `.cell` carries the generated
      // transform and must not be animated: a hover effect that scaled `.cell`
      // would move the hit area under the pointer and flicker at the edge.
      // Animate the `<img>` inside it, and the cell stays where it is hit.
      const el = this.#box.ownerDocument.createElement("div");
      el.className = "cell";
      el.setAttribute("data-tileset-cell", "");
      el.setAttribute("data-x", String(x));
      el.setAttribute("data-y", String(y));
      const style = placeCell(now.placement, cell, x, y);
      el.setAttribute("style", style);
      node = { el, cell, placement: now.placement, style, masked: false, key: null, src: undefined, img: null, pass: 0 };
      this.#cells.set(id, node);
    } else if (node.cell !== cell || node.placement !== now.placement) {
      node.cell = cell;
      node.placement = now.placement;
      const style = placeCell(now.placement, cell, x, y);
      if (style !== node.style) {
        node.style = style;
        node.el.setAttribute("style", style);
      }
    }

    // An attribute, not part of the style: the style is rewritten on resize, and
    // a mask folded into it would be rewritten on every mask change too. This
    // way a mask change touches only the cells that flipped. Masked cells are
    // `visibility: hidden` (`tileset.css`), so they take no hits either.
    const masked = now.mask !== null && now.mask[i] === 1;
    if (masked !== node.masked) {
      node.masked = masked;
      node.el.toggleAttribute("data-masked", masked);
    }

    // A pending lazy drawable has no `src` yet: the cell is laid out and empty
    // until `#settle` records one and schedules the render that mounts it. A
    // `src` that failed never gets here: `loadBlocked` unmounted the cell.
    //
    // A new `<img>` when the asset changes even if the `src` does not — two
    // assets may share a URL — because the `<img>`'s handlers name the asset
    // they report against, and must name the one the cell now shows.
    const src = value === undefined ? undefined : value instanceof Promise ? settled?.src : value.src;
    if (src !== node.src || key !== node.key) {
      if (node.img !== null) this.#retire(node.img);
      node.img = src === undefined ? null : this.#image(cell, src);
      node.key = key;
      node.src = src;
      if (node.img !== null) node.el.append(node.img);
    }
    return node;
  }

  #unmountCell(node: CellNode): void {
    if (node.img !== null) this.#retire(node.img);
    node.el.remove();
  }

  /**
   * Detaches an `<img>` the renderer no longer shows, and silences it. Removing
   * it does not stop its request, and a late `error` (or a late size probe)
   * would otherwise record a failure for a `src` no cell shows any more — which
   * overwrites the key's entry for the `src` it does show, unblocking cells
   * known to be broken — and report it. The component never had this: it
   * swapped `src` on the same `<img>`, which aborts the old request.
   */
  #retire(img: HTMLImageElement): void {
    img.onerror = null;
    img.onload = null;
    this.#retired.add(img);
    img.remove();
  }

  /**
   * A cell's `<img>`. Its handlers close over **this** `cell` and `src`, bound
   * when the element is made: a reseed that changes the cell's asset makes a new
   * `<img>` with new closures, so a late failure of the old one is recorded
   * against the old asset and never blames the new one — and the old `<img>` is
   * retired anyway (`#retire`). (`Tileset.svelte` read them from live template
   * bindings and had to work around exactly that.)
   *
   * `loading` before `src`: set after, the fetch has already started eagerly.
   */
  #image(cell: TileState, src: string): HTMLImageElement {
    const img = this.#box.ownerDocument.createElement("img");
    img.setAttribute("alt", "");
    img.setAttribute("loading", "lazy");
    img.setAttribute("draggable", "false");
    img.onerror = (e) => this.#onImageError(img, cell, src, e);
    // A picture with no natural size is refused here too, so the DOM agrees with
    // the canvas (`images.ts` `requireNaturalSize`). It shows until the probe
    // settles, about one frame.
    img.onload = () => {
      this.#sizeChecks.check(src, img).catch((cause: unknown) => this.#onImageError(img, cell, src, cause));
    };
    img.src = src;
    return img;
  }

  #onImageError(img: HTMLImageElement, cell: TileState, src: string, cause: unknown): void {
    // The probe's rejection can land after its `<img>` was retired.
    if (this.#destroyed || this.#retired.has(img) || cell.tileId === null || cell.assetId === null) return;
    const key = assetKey(cell.tileId, cell.assetId);
    const next = recordLoadFailure(this.#loadFailed, key, src);
    if (next === null) return;
    this.#loadFailed = next;
    this.#model.report({ tileId: cell.tileId, assetId: cell.assetId, meta: this.#model.metaByKey.get(key) ?? {} }, cause);
    this.#schedule();
  }
}
