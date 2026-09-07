/**
 * The two asset rules, as development-build warnings —
 * `SUBPIXEL-GEOMETRY.md`, *The 1/cellDev law* and *The one ceiling that is real*.
 *
 * The investigation ends on two rules that are **independent**, and reading them
 * as one cost it several blind alleys:
 *
 * 1. **A ratio.** An asset must carry at least as many pixels as the largest cell
 *    it will be drawn into. A tile exported at 36x36 holds 1,296 pixels; presented
 *    in a 95 px cell it needs 9,025, and no canvas setting, draw path or substrate
 *    recovers the missing seven thousand. That softness is *missing information*
 *    and looks identical in every renderer.
 * 2. **An absolute.** A curve needs a cell large enough in device pixels that its
 *    antialiased edge is a small fraction of it. An edge costs roughly one device
 *    pixel whatever the cell size, so it is `1 / cellDev` of the shape: 1.05% at a
 *    95 px cell, **10%** at a 10 px one. Three draw paths at 16 device px are
 *    indistinguishable, so this one has **no renderer fix, because there is no
 *    renderer defect**.
 *
 * The second is the one nobody was tracking, and it is why a 76-column footer
 * preset looked worse than a coarse 8x4 despite a 4x better asset ratio.
 *
 * **These are usability thresholds, not correctness ones**, which is why they are
 * warnings in a development build and silent in production, and why they must not
 * route through `onAssetError` — that reports resolution and load *failures*, and
 * a legible-but-soft tile is neither. *Failure is loud* is untouched: nothing here
 * substitutes anything or changes what is drawn.
 *
 * Plain and rune-free, for the reason `measure.ts` gives, and in a `.ts` file
 * because `.svelte` cannot be unit-tested here.
 */

/**
 * Below this many device pixels a curve is knowingly soft.
 *
 * **Bracketed by two readings rather than measured**, and stated as such: at
 * `cellDev` 10 the fringe is 10% and plainly visible; at 38 it is 2.63% and
 * distinguishable from a 175 px cell only under magnification. The comfortable
 * threshold is somewhere above 20 and at most 40; the warning fires at the bottom
 * of that bracket so it reports the cases nobody would defend rather than every
 * case that is merely not ideal.
 */
export const SOFT_CELL_DEV = 20;

/**
 * Rule 1 — the ratio. `null` when the asset carries enough pixels.
 *
 * Compared against the **smaller** intrinsic dimension: `coverRect` crops the long
 * axis, so it is the short one that has to cover the cell. Zero or unknown
 * dimensions return `null` — an SVG with no intrinsic size is not evidence of
 * anything, and `coverRect` already handles it.
 */
export function assetTooSmall(
  tileId: string,
  assetId: string,
  naturalWidth: number,
  naturalHeight: number,
  cellDev: number,
): string | null {
  const px = Math.min(naturalWidth, naturalHeight);
  if (px <= 0 || cellDev <= 0 || px >= cellDev) return null;
  return (
    `[gen-tilesets] Tile "${tileId}" asset "${assetId}" is ${px}px, drawn at ${cellDev}px. ` +
    `Export it at ${cellDev}px or larger.`
  );
}

/** Rule 2 — the absolute. `null` when the cell is comfortable. */
export function cellTooSmall(cellDev: number): string | null {
  if (cellDev <= 0 || cellDev >= SOFT_CELL_DEV) return null;
  return (
    `[gen-tilesets] Cells are ${cellDev} device pixels. Curves look soft below about ` +
    `${SOFT_CELL_DEV}. Use fewer columns, or give the tileset a wider box.`
  );
}

/**
 * Says each thing once.
 *
 * Both warnings are computed on the draw path, which runs on every resize and
 * every decode. Without this they would be a console full of the same line, which
 * is how a real warning gets tuned out. Keyed rather than counted so a *second*
 * asset, or a genuinely new cell size, still reports.
 *
 * An instance rather than module state so a test can assert the deduplication
 * without the result depending on what some earlier test warned about.
 */
export class WarnOnce {
  readonly #said = new Set<string>();

  /** No-ops on a null message, so a caller can pass a check's result straight through. */
  say(key: string, message: string | null, sink: (m: string) => void = console.warn): void {
    if (message === null || this.#said.has(key)) return;
    this.#said.add(key);
    sink(message);
  }
}
