/**
 * The canvas substrate's tile loop — one function, so the live canvas and an
 * exported image draw with the same code.
 *
 * `TilesetRenderer.#paint` owns everything around it: the memo that skips an
 * unchanged paint, sizing and clearing the backing store, smoothing, `pending`.
 * `renderImage` (`./image.ts`) owns the same for its offscreen raster. What is
 * left — which cells draw, the crop, alpha and the matrix — is here, so the two
 * cannot drift (the **S2** spirit: one way to draw a tileset, not a second one
 * for export).
 *
 * The development `assetTooSmall` warning is a callback rather than a
 * `WarnOnce` held here: the renderer keeps one per instance so a resize drag
 * does not repeat it, and an image export has nothing to say it to.
 */

import { coverRect } from "./edges.js";
import type { OcclusionMask } from "./occlusion.js";
import type { UniformItem } from "./uniform.js";

/** What `drawItems` draws with: the calls it makes and nothing else. */
export type PaintContext = Pick<
  CanvasRenderingContext2D,
  "drawImage" | "save" | "restore" | "transform" | "globalAlpha"
>;

/**
 * Draws `items` onto `ctx`, whose transform is the identity and whose backing
 * store is the raster the items were laid out for (device px).
 *
 * @param ready decoded pictures by asset key; a missing key draws nothing (R3).
 * @param mask the keep-out mask, or `null` for none.
 * @param onDraw called once per drawn item with its picture, before drawing.
 */
export function drawItems(
  ctx: PaintContext,
  items: readonly UniformItem[],
  ready: ReadonlyMap<string, HTMLImageElement>,
  mask: OcclusionMask | null,
  onDraw?: (item: UniformItem, img: HTMLImageElement) => void,
): void {
  for (const item of items) {
    // Hidden by the keep-out mask: the same outcome as R3's missing drawable,
    // reached for a different reason.
    if (mask !== null && mask[item.index] === 1) continue;
    const img = ready.get(item.key);
    // R3 -- a cell with no drawable draws nothing. No placeholder, and not a
    // sibling TileAsset, which would silently reweight D3's distribution.
    if (img === undefined) continue;

    onDraw?.(item, img);

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
