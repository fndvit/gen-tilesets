/**
 * `renderImage` — a tileset as a PNG, at a chosen width and density, with no
 * element on the page.
 *
 * **It drives `TilesetModel` directly.** The model reads four things from the
 * page (`ModelInputs`): the box's width, its height (only for a non-top
 * `alignY`), the keep-out rects (only with `avoid`) and the DPR. For an image
 * all four are known in advance — the chosen width, the grid's own height, no
 * rects, the chosen density — so there is nothing to measure. Rejected: mounting
 * a hidden `TilesetRenderer` off-screen and waiting for it to settle. It needs a
 * laid-out host, a DPR override and a public "settled" signal the live renderer
 * has no other use for (Pol, X3a).
 *
 * **It draws with the live canvas's code.** The model makes the same draw list,
 * `drawItems` (`./paint.ts`) paints it onto a raster exactly as `#paint` does,
 * and the raster is then scaled into the image the way CSS presents the live
 * canvas: one isotropic resample of one surface, offset by the bleed. Drawing
 * each tile straight into the image at its fractional position instead would
 * put the seams `SUBPIXEL-GEOMETRY.md` removes back in.
 *
 * **Failure is loud.** If any picture fails to resolve or load, it rejects with
 * one error naming every failed asset, and no PNG is made: an image with holes
 * looks like a finished export. Pictures load with `crossOrigin = "anonymous"`,
 * so a server that sends no CORS header fails that picture by name instead of
 * tainting the canvas and making `toBlob` throw a `SecurityError` that names
 * nothing (`ImageBank.sync`'s comment).
 *
 * `substrate`, `overflow`, `avoid` and `onAssetError` are not options: an image
 * is always the canvas, clipped to the box, with no page around it, and a
 * failure is the rejection.
 */

import type { TilesetFile } from "../types.js";
import { ImageBank, NaturalSizeChecks } from "./images.js";
import { TilesetModel } from "./model.js";
import type { TilesetOptions } from "./options.js";
import { drawItems } from "./paint.js";
import { parseAssetKey, type AssetProvider, type Drawable } from "./provider.js";

/** What `renderImage` takes. Every field but `width` and `density` is optional. */
export interface ImageOptions {
  /** The box's width in CSS px — the width the tileset is laid out at. */
  width: number;
  /**
   * Device px per CSS px. Stands in for the DPR, so the same options give the
   * same PNG on any screen. The output is `round(width * density)` px wide.
   */
  density: number;
  /** A CSS colour filled under the tiles. Left out, the gaps are transparent. */
  background?: string | undefined;
  seed?: TilesetOptions["seed"];
  loadSalt?: TilesetOptions["loadSalt"];
  provider?: AssetProvider | undefined;
  sizing?: TilesetOptions["sizing"];
  align?: TilesetOptions["align"];
  responsive?: TilesetOptions["responsive"];
}

/** An image's pixel size: what `renderImage` would produce. */
export interface ImageSize {
  width: number;
  height: number;
}

/** Where the presented raster lands in the image, in output px. */
interface Frame extends ImageSize {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The PNG's size for `file` at `options`, without loading a picture. It reads
 * the same model `renderImage` draws from, so a caller showing the size before
 * exporting cannot disagree with the file it gets.
 */
export function imageSize(file: TilesetFile, options: ImageOptions): ImageSize {
  const { width, height } = frameOf(modelFor(file, options), options.density);
  return { width, height };
}

/**
 * Renders `file` to a PNG. Resolves with the `Blob`; rejects when a picture
 * fails (naming every one), when the size is not a positive number, or when the
 * browser cannot encode the canvas.
 */
export async function renderImage(file: TilesetFile, options: ImageOptions): Promise<Blob> {
  const model = modelFor(file, options);
  const frame = frameOf(model, options.density);

  const failed: string[] = [];
  const causes: unknown[] = [];
  const fail = (key: string, cause: unknown) => {
    const ref = parseAssetKey(key);
    failed.push(ref === null ? key : `${ref.tileId}/${ref.assetId}`);
    causes.push(cause);
  };

  const sources = await settleDrawables(model.drawables, fail);
  const bank = new ImageBank(new NaturalSizeChecks(), { crossOrigin: "anonymous" });
  await loadAll(bank, sources, fail);
  if (failed.length > 0) {
    throw new Error(
      `renderImage: ${failed.length === 1 ? "a picture" : `${failed.length} pictures`} could not be ` +
        `loaded, so no image was made: ${failed.join(", ")}.`,
      { cause: causes },
    );
  }

  // The raster, exactly as `TilesetRenderer.#paint` sizes and fills it.
  const u = model.uniform!;
  const pr = model.presentation!;
  const raster = document.createElement("canvas");
  raster.width = pr.rasterWidthDev;
  raster.height = Math.max(1, u.rasterHeightDev);
  const rctx = context(raster);
  rctx.imageSmoothingEnabled = true;
  rctx.imageSmoothingQuality = "high";
  drawItems(rctx, model.items, bank.ready, null);

  // The box. Whatever of the raster falls outside it is simply not drawn: that
  // is the clip `overflow: hidden` gives the live box (R9).
  const out = document.createElement("canvas");
  out.width = frame.width;
  out.height = frame.height;
  const octx = context(out);
  if (options.background !== undefined) {
    octx.fillStyle = options.background;
    octx.fillRect(0, 0, frame.width, frame.height);
  }
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(raster, frame.x, frame.y, frame.w, frame.h);

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob((blob) => {
      if (blob === null) reject(new Error("renderImage: the browser could not encode the image as a PNG."));
      else resolve(blob);
    }, "image/png");
  });
}

/**
 * A model at `options.width` and `options.density`, with the box as tall as the
 * grid.
 *
 * **Two steps, for a non-top `alignY`.** Alignment reads the box's height, and
 * an image's box is exactly as tall as its grid — the height the live box takes
 * once measured, when it has no height of its own (`canvasBoxStyle` writes none
 * then, and the in-flow canvas sets it). That height is read off the first
 * pass, which no height affects, and pushed back, so the grid sits at the top
 * whatever `alignY` says. A top-aligned model does not read `height` at all, so
 * the second push costs it nothing.
 *
 * The uid is a fixed `"gts-image"`: it names the model's reservation
 * stylesheet, which is never written to a page here.
 */
function modelFor(file: TilesetFile, o: ImageOptions): TilesetModel {
  if (!(o.width > 0) || !Number.isFinite(o.width)) {
    throw new RangeError(`renderImage: \`width\` must be a positive number of CSS px, not ${o.width}.`);
  }
  if (!(o.density > 0) || !Number.isFinite(o.density)) {
    throw new RangeError(`renderImage: \`density\` must be a positive number, not ${o.density}.`);
  }
  const options: TilesetOptions = {
    substrate: "canvas",
    seed: o.seed,
    loadSalt: o.loadSalt,
    provider: o.provider,
    sizing: o.sizing,
    align: o.align,
    responsive: o.responsive,
  };
  const model = new TilesetModel("gts-image", {
    file,
    options,
    width: o.width,
    height: 0,
    rects: null,
    dpr: o.density,
  });
  model.set({ height: frameOf(model, o.density).h / o.density });
  return model;
}

/**
 * The image's size and where the raster goes in it.
 *
 * **The height is the presented canvas's**, `height: auto` from the raster's
 * ratio, exactly as the live box gets it. Rejected: `width / naturalRatio` (or
 * `fixedHeight`). Those are the box's height *before* measurement, and they
 * ignore the rounding of `yOffset` to a device pixel, so at some sizes the
 * image would gain a hairline under the last row or lose a sliver of it.
 */
function frameOf(model: TilesetModel, density: number): Frame {
  const u = model.uniform;
  const pr = model.presentation;
  // Not reachable: the width is positive and the substrate is the canvas.
  if (u === null || pr === null) throw new Error("renderImage: the tileset has no canvas geometry.");
  const w = pr.widthCss * density;
  const h = (w * Math.max(1, u.rasterHeightDev)) / pr.rasterWidthDev;
  return {
    width: Math.max(1, Math.round(model.inputs.width * density)),
    height: Math.max(1, Math.round(h)),
    x: pr.leftCss * density,
    y: pr.topCss * density,
    w,
    h,
  };
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("renderImage: the browser gave no 2D canvas context.");
  return ctx;
}

/**
 * Waits for every drawable the grid needs and returns key → `src` for the ones
 * that resolved. Each rejection goes to `fail`; none ends the wait early, so the
 * error can name every failure, not just the first.
 */
export async function settleDrawables(
  drawables: ReadonlyMap<string, Drawable | Promise<Drawable>>,
  fail: (key: string, cause: unknown) => void,
): Promise<Map<string, string>> {
  const keys = [...drawables.keys()];
  const results = await Promise.allSettled(drawables.values());
  const sources = new Map<string, string>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") sources.set(keys[i]!, r.value.src);
    else fail(keys[i]!, r.reason);
  });
  return sources;
}

/**
 * Loads `wanted` into a fresh `bank` and resolves once every key has either
 * decoded or failed. Each failure goes to `fail`.
 *
 * Built on `sync`'s two callbacks rather than a new method on the bank: the
 * live renderer never waits for "all of them", so the count lives with the one
 * caller that does.
 */
export function loadAll(
  bank: ImageBank,
  wanted: ReadonlyMap<string, string>,
  fail: (key: string, cause: unknown) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let failures = 0;
    const check = () => {
      if (bank.ready.size + failures >= wanted.size) resolve();
    };
    bank.sync(wanted, check, (key, cause) => {
      failures++;
      fail(key, cause);
      check();
    });
    // Nothing wanted: no callback will come.
    check();
  });
}
