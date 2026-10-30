/**
 * What a framework wrapper renders on the server, where no renderer runs: the
 * render box as `TilesetRenderer` builds it **before its first measurement** —
 * the reserved space and nothing in it.
 *
 * **Why it exists (S8).** A wrapper builds its renderer in a client-side effect,
 * so without this a server-rendered page would ship an empty host and jump when
 * the tileset appeared. With it, the server HTML reserves exactly what the
 * renderer's box will reserve before measuring — the natural ratio, the fixed
 * height, or the reservation stylesheet's container queries when there are
 * responsive rules — so the swap from placeholder to box changes nothing on
 * screen. What follows the swap is the renderer's own settle after measurement,
 * which a page without a server render has as well (≤ half a CSS px under
 * canvas, `SUBPIXEL-GEOMETRY.md`).
 *
 * **No cells and no grid.** Every field below is read from stages that sit
 * before `generate()` in the model (the test holds it to that), so a server
 * render pays for the file check and the reservation, not for a grid. Drawing cells into the server HTML is the
 * deferred SSR route, and `affineCellStyle` in `./model.ts` remains its seam.
 *
 * Rejected: the renderer adopting a server-rendered box. That is the SSR route
 * itself — hydrating someone else's markup — and it would make the renderer's
 * constructor depend on what a framework happened to render.
 */

import type { TilesetFile } from "../types.js";
import { canvasBoxStyle, domBoxStyle, extentStyle, TilesetModel } from "./model.js";
import { copyOptions, type TilesetOptions } from "./options.js";

/**
 * The pre-measurement render box, as data a template can write out.
 *
 * Not named `Placeholder`: `svelte-package` names `Placeholder.svelte`'s
 * declared component `Placeholder` in its `.d.ts`, beside this type imported
 * under the same name, and the default export then resolved to the type —
 * every consumer's `<Tileset>` failed to typecheck against `dist`, while the
 * workspace, which reads source, saw nothing.
 */
export interface PlaceholderBox {
  /**
   * The responsive wrapper, present while there are rules: its id (the
   * reservation's selectors name it) and the reservation stylesheet.
   */
  wrapper: { id: string; css: string } | null;
  substrate: "canvas" | "dom";
  /** The box's `class`. */
  className: string;
  /** The box's inline style. */
  style: string;
  /** `.extent`'s inline style under `"dom"`, or `null` for none. */
  extent: string | null;
}

/**
 * The box `new TilesetRenderer(host, { id, file, options })` would have before
 * anything is measured.
 *
 * `id` must be the one the renderer will be given, so the reservation
 * stylesheet's selectors match both the placeholder's wrapper and, after the
 * swap, the renderer's.
 *
 * The DPR is 1 because nothing before measurement depends on it — the extent
 * reads it only once there is a measured grid — and a server has none to read.
 *
 * In a development build this throws on an invalid file or options object, as
 * the renderer's constructor does, so a server render is as loud as a client
 * one.
 */
export function placeholder(id: string, file: TilesetFile, options: TilesetOptions | undefined): PlaceholderBox {
  const model = new TilesetModel(id, {
    file,
    options: copyOptions(options),
    width: 0,
    height: 0,
    rects: null,
    dpr: 1,
  });
  const substrate = model.substrate;
  const hasRules = model.hasRules;
  // The measured geometry is `null` by definition here, and is written so rather
  // than read: the model's `presentation` reaches the grid (culling widens by
  // the grid's spill) before it can find the width is 0, so reading it ran
  // `generate()` on every server render and twice on every client mount.
  // `placeholder.test.ts` holds both to the renderer's own pre-measurement box.
  const at = { sizing: model.sizing, hasRules, ratio: model.ratio, fixedHeight: model.fixedHeight };
  return {
    wrapper: hasRules ? { id, css: model.reservation } : null,
    substrate,
    className: substrate === "dom" && model.overflow === "visible" ? "tileset overflow-visible" : "tileset",
    style:
      substrate === "canvas"
        ? canvasBoxStyle({ ...at, presentation: null })
        : domBoxStyle({ ...at, domCell: null, pending: model.pending }),
    extent: substrate === "dom" ? extentStyle(null, 1, model.sizing, model.fixedHeight) : null,
  };
}

/**
 * Takes the placeholder out of layout, ahead of the renderer's construction.
 *
 * A wrapper builds the renderer in an effect, while the placeholder its template
 * wrote is still in the host, and the framework removes the placeholder only on
 * its next flush. The renderer measures synchronously in its constructor, so in
 * between it would measure a box laid out *beside* the placeholder: below it in
 * a block (every `avoid` rect off by one tileset height, and the first mask on
 * the wrong cells) or sharing a flex row with it (half the width). Hidden first,
 * the first measurement is the one the page will keep.
 *
 * `display: none` rather than removing the nodes: they are the framework's, and
 * it removes them itself a moment later.
 */
export function setAside(host: Element): void {
  for (const el of Array.from(host.children)) {
    if (el instanceof HTMLElement || el instanceof SVGElement) el.style.display = "none";
  }
}
