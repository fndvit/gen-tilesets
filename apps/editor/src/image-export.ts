/**
 * Export image's choices, kept free of runes so they can be tested
 * (`vitest.config.ts` runs without the Svelte plugin). The form that shows them
 * is `lib/sections/ExportImage.svelte`; the drawing is the package's
 * `renderImage` (`DESIGN_SYSTEM.md` *Export image*, *Export*).
 *
 * **The image is of the saved file, never the draft** (Pol, X0), so everything
 * here reads a `TilesetFile` and nothing reads the preview's state.
 */

import type { ResponsiveRule, TilesetFile } from "@vit-foundation/gen-tilesets";
import { imageSize, type ImageSize } from "@vit-foundation/gen-tilesets/render";
import { boundsOf } from "./lib/preview/width.js";

/** A size row's identity. `bound:768` and not `768`: see `SizeRow.key`. */
export type SizeKey = "design" | `bound:${number}`;

export interface SizeRow {
  /**
   * What the radio binds. Not the width: a bound equal to the design width
   * keeps its own row (the rule number is what the author looks for, Pol X3b),
   * so two rows can share one width.
   */
  key: SizeKey;
  /** The image's width in CSS px. */
  width: number;
  label: string;
  detail: string;
}

/**
 * The Size rows: Design width first, then one per breakpoint bound, ascending.
 *
 * **Design width is `layout.referenceWidth`, not the preview's width** (Pol,
 * X3b), so dragging the handles never changes the image. It is always shown,
 * the one row with no breakpoints and the fallback when a remembered bound is
 * gone.
 *
 * A bound is named by every rule that sets it, with the sidebar's own "Rule N"
 * numbers (`BreakpointsSection`): "Breakpoint 2 + 3". A rule with both a min
 * and a max width names two bounds, and both rows carry its number; the px
 * tells them apart. No "rule"/"base" label at the right (Pol, X1).
 */
export function sizeRows(rules: readonly ResponsiveRule[], designWidth: number): SizeRow[] {
  const bounds = boundsOf(rules).map((width): SizeRow => {
    const numbers = rules.flatMap((r, i) => (r.minWidth === width || r.maxWidth === width ? [i + 1] : []));
    return { key: `bound:${width}`, width, label: `Breakpoint ${numbers.join(" + ")}`, detail: px(width) };
  });
  return [{ key: "design", width: designWidth, label: "Design width", detail: px(designWidth) }, ...bounds];
}

/** The size the form opens on: the one used last if it still exists, else Design width. */
export function rememberedSize(rows: readonly SizeRow[], lastKey: SizeKey | null): SizeKey {
  return lastKey !== null && rows.some((r) => r.key === lastKey) ? lastKey : "design";
}

/**
 * `tileset-1000px@2x.png`. The width is written as it is, not rounded:
 * `referenceWidth` may be fractional (`fields.ts` `parseReferenceWidth` takes
 * any positive number), and a rounded name would claim a layout width the
 * image was not drawn at. The PNG's pixel size is in the File line beside it.
 */
export function fileName(width: number, density: number): string {
  return `tileset-${width}px@${density}x.png`;
}

/**
 * The PNG's pixel size, from the package's `imageSize`, which reads the same
 * model `renderImage` draws from, so the File line cannot disagree with the
 * file. Only the width and density are passed: the size follows the layout,
 * not the seed, load salt or provider the export also passes.
 */
export function pixelSize(file: TilesetFile, width: number, density: number): ImageSize {
  return imageSize(file, { width, density });
}

function px(width: number): string {
  return `${width} px`;
}
