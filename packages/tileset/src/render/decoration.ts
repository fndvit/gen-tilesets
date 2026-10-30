/**
 * `TileDecorationRenderer` — a decoration as a plain class, with no framework.
 *
 * **One authored style, one placement of it.** A decoration is a small block of
 * tiles sitting in a page's margin — a 2x2 in a corner, a stepped 3x4 beside a
 * heading — drawn from a style that a dozen other decorations on the same page
 * share. `../shape.ts` carries the whole argument for why one config can serve
 * every size; this is the thin part.
 *
 * ```ts
 * const d = new TileDecorationRenderer(el, { style, rows: 2, columns: 2, cellSize: 48 });
 * d.update({ options: { seed: "corner" } });
 * d.destroy();
 * ```
 *
 * **It is `reshape` with one preset, plus a box.** The preset is `bleed: 0,
 * yOffset: 0`: a decoration is a block of whole cells with an edge the page can
 * see, so there is no design for a bleed to belong to, and a `yOffset` would
 * shave its visible top. Zero bleed is also what makes `cellSize` mean CSS px
 * (see {@link decorationWidth}). Until 0.7.0 this preset was the only way to
 * reach reuse at all (`decorationFile`); now it is one caller of the general
 * transform.
 *
 * **It is not a second renderer, and does not weaken S1.** `TilesetRenderer`
 * remains the one thing that draws and the one thing that calls `generate()`.
 * This is an ordinary consumer of it, exactly as the editor's preview is, and
 * adds no stage to the pipeline: it derives a `TilesetFile` and hands it over.
 *
 * What it adds over a `TilesetRenderer` on a reshaped file is the **box**, and
 * that is the part worth having in one place. The renderer has no width input
 * on purpose (`07` §5.3 makes every quantity a fixed fraction of `Wpx`, so the
 * host's CSS decides it), and a decoration's width is not a free choice: it is
 * `columns * cellSize`, the same product the preset writes into
 * `referenceWidth`. A host sizing the box by hand has two places to get one
 * number right, and getting it wrong reintroduces a bleed silently — the grid
 * still draws, just not at the tile size the author asked for.
 *
 * Rejected: keeping `TileDecoration.svelte` as a `<Tileset>` over `reshape`.
 * A page with no Svelte would then have no decorations.
 */

import { DEV } from "../dev.js";
import { reshape, reshapeErrors } from "../shape.js";
import type { Shape, TilesetFile } from "../types.js";
import { WRAPPER_ATTRIBUTE } from "./measure.js";
import type { TilesetOptions } from "./options.js";
import { TilesetRenderer } from "./renderer.js";

/** What a host hands a decoration. */
export interface TileDecorationInputs {
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
  /** CSS px per tile. See {@link decorationWidth} for why it is also the width. */
  cellSize: number;
  /**
   * `TilesetRenderer`'s options, passed straight through — `TilesetOptions`.
   *
   * **`options.seed` is what makes two decorations of the same size differ.**
   * `generate()` is pure in `(config, seed, loadSalt)`, so a distinct seed per
   * spot re-rolls every Operation and the asset walk alike. Omitted, every spot
   * of a given size draws the identical picture, which is occasionally what you
   * want.
   */
  options?: TilesetOptions | undefined;
}

export interface TileDecorationInit extends TileDecorationInputs {
  /** The inner renderer's id — `TilesetRendererInit.id`. */
  id?: string;
}

/**
 * The decoration box's inline style.
 *
 * `width` is `columns * cellSize` because that is what makes `cellSize` mean
 * CSS px: the preset sets `referenceWidth` to the same product, so `s = Wpx /
 * referenceWidth` is exactly 1 here and a tile is exactly `cellSize` px. It is
 * a `width` rather than a container query because a decoration declares its
 * tile size — that is the choice this whole feature is built around.
 *
 * `tileset.css` adds `max-width: 100%`, a default with a reason rather than a
 * hedge. A 6-column decoration at 96px is 576px wide, which overflows a phone,
 * and a page that scrolls sideways is a worse failure than a decoration whose
 * tiles came out smaller than declared — the tileset degrades gracefully into
 * that case, since every quantity is a fraction of `Wpx` and a narrower box is
 * simply a smaller `s`. A host that would rather keep the tile size can pass a
 * rule that switches to fixed sizing below the decoration's width —
 * `options.responsive`.
 *
 * No height: the tileset declares `aspect-ratio: naturalRatio`, which at zero
 * bleed and no `yOffset` is exactly `columns / rows`, and then takes its height
 * from its own child.
 */
export function decorationWidth(columns: number, cellSize: number): string {
  return `width: ${columns * cellSize}px;`;
}

/**
 * The file a decoration draws: `style` reshaped by the preset.
 *
 * **Development-loud, production-trusting** — the same arrangement the renderer
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
export function reshapeDecoration(style: TilesetFile, rows: number, columns: number, cellSize: number): TilesetFile {
  const shape: Partial<Shape> = { rows, columns, cellSize, bleed: 0, yOffset: 0 };
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
}

export class TileDecorationRenderer {
  /**
   * The decoration box. `data-tileset-wrapper` marks it as the package's, so an
   * `options.avoid` selector resolves in the section the decoration sits in
   * rather than in here, where the only thing to find is the render box
   * (`measure.ts`'s `scopeOf`; `RESPONSIVE-HOSTING.md` §8.2).
   * `.decoration[data-tileset-decoration]` is what `tileset.css` styles.
   *
   * No public getter, unlike `TilesetRenderer.box`: that exists so an editor can
   * convert a pointer event into render space (`07` §8.2), and a decoration is
   * `aria-hidden` ornament that nothing points at.
   */
  readonly #el: HTMLDivElement;
  readonly #renderer: TilesetRenderer;
  #inputs: TileDecorationInputs;
  /**
   * The reshaped file, kept until the style or the shape changes. A fresh file
   * per `update()` would regenerate the grid every time, because the model
   * memoizes on the file's identity — an `options`-only update must keep it.
   */
  #file: TilesetFile;
  #destroyed = false;

  /**
   * Appends the decoration box to `host` and draws into it. In a development
   * build a style that cannot be placed at this shape throws here, before any
   * element is added.
   */
  constructor(host: HTMLElement, init: TileDecorationInit) {
    this.#inputs = { style: init.style, rows: init.rows, columns: init.columns, cellSize: init.cellSize, options: init.options };
    this.#file = reshapeDecoration(init.style, init.rows, init.columns, init.cellSize);

    const el = host.ownerDocument.createElement("div");
    el.className = "decoration";
    el.setAttribute("style", decorationWidth(init.columns, init.cellSize));
    el.setAttribute("data-tileset-decoration", "");
    el.setAttribute(WRAPPER_ATTRIBUTE, "");
    // Attached before the renderer is built, so its first measurement is of a
    // box with a page around it and `avoid` resolves in the page at once.
    host.append(el);
    this.#el = el;
    try {
      this.#renderer = new TilesetRenderer(el, {
        file: this.#file,
        options: init.options,
        ...(init.id !== undefined ? { id: init.id } : {}),
      });
    } catch (cause) {
      el.remove();
      throw cause;
    }
  }

  /**
   * Replaces any of the inputs; a field left out keeps its value. The style
   * and the shape are reshaped again only if one of them changed by identity.
   * In a development build a reshape error throws here, and nothing changes.
   */
  update(next: Partial<TileDecorationInputs>): void {
    if (this.#destroyed) {
      if (DEV) throw new Error("TileDecorationRenderer: `update()` after `destroy()`.");
      return;
    }
    const was = this.#inputs;
    const now: TileDecorationInputs = {
      style: next.style ?? was.style,
      rows: next.rows ?? was.rows,
      columns: next.columns ?? was.columns,
      cellSize: next.cellSize ?? was.cellSize,
      options: "options" in next ? next.options : was.options,
    };
    const reshaped =
      now.style !== was.style || now.rows !== was.rows || now.columns !== was.columns || now.cellSize !== was.cellSize;
    // Computed before anything is committed, so a throw leaves the old picture.
    const file = reshaped ? reshapeDecoration(now.style, now.rows, now.columns, now.cellSize) : this.#file;
    this.#inputs = now;
    if (reshaped) {
      this.#file = file;
      const width = decorationWidth(now.columns, now.cellSize);
      if (this.#el.getAttribute("style") !== width) this.#el.setAttribute("style", width);
    }
    this.#renderer.update({ file, options: now.options });
  }

  /** Stops the renderer and removes the decoration box, leaving `host` as it was found. Idempotent. */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#renderer.destroy();
    this.#el.remove();
  }
}
