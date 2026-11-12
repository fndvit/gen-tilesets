/**
 * The sidebar's tile motif — batch 01, T-06 (B-004).
 *
 * The space below the last section, when the sections are short, shows a
 * quiet checkered field of flat squares that grows and shrinks with that
 * space. It is the package's own `<TileDecoration>` drawing a style built
 * here, so the editor decorates itself with the thing it makes.
 *
 * Pure and testable; `SidebarMotif.svelte` only measures and mounts it.
 *
 * **The look is three constants** (Pol will tweak it later), at the top on
 * purpose. The colour is written as a value, not `var(--…)`, because the tile
 * is a picture (`meta.src`, an SVG data URL) and a picture cannot read the
 * page's custom properties. It is `--grey-200`'s value, one step darker than
 * the sidebar's ground (`--grey-100`), so the field is felt more than seen.
 * No artwork: a flat square needs none (`DESIGN_SYSTEM.md`'s Figma rule is for
 * one-off artwork).
 */

import { SCHEMA_VERSION, type TilesetFile } from "@vit-foundation/gen-tilesets";

/** `--grey-200` (#e2e2e2): one step off the sidebar's `--grey-100` ground. */
export const MOTIF_COLOUR = "#e2e2e2";
/** CSS px per tile. */
export const MOTIF_CELL = 24;
/** Under this many whole rows of free space, nothing is drawn: a sliver reads as a glitch. */
export const MOTIF_MIN_ROWS = 2;

/**
 * A flat square in `colour`, as an SVG data URL a `Drawable` can carry.
 *
 * It states its `width` and `height`: an SVG with only a `viewBox` has no
 * intrinsic size, and the canvas substrate cannot decode it into a bitmap,
 * so it painted nothing. 64 px covers the cell at DPR 2 with room to spare
 * (the canvas substrate wants at least as many pixels as the cell it fills).
 */
export function squareSrc(colour: string = MOTIF_COLOUR): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 1 1"><rect width="1" height="1" fill="${colour}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * The decoration style: one tile, placed on every other cell by a
 * `checkerboard` Selection (procedural, so any size is legal for
 * `reshape`). Its `rows`, `columns` and `layout` are placeholders that every
 * placement overrides (`guides/decorations`).
 *
 * Nothing in it is random, so the seed changes nothing and every load looks
 * the same.
 */
export function motifStyle(colour: string = MOTIF_COLOUR, cell: number = MOTIF_CELL): TilesetFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: "0.0.0",
    layout: { cellSize: cell, referenceWidth: 2 * cell, yOffset: 0, horizontalAlignment: "gutter" },
    config: {
      rows: 2,
      columns: 2,
      defaultSeed: "sidebar-motif",
      assetSalt: 0,
      reseedAssetsOnLoad: false,
      tiles: [
        {
          id: "t1",
          name: "square",
          assets: [{ id: "a1", weight: 1, meta: { src: squareSrc(colour), width: 64, height: 64 } }],
        },
      ],
      operations: [
        {
          id: "op1",
          salt: 0,
          reseedOnLoad: false,
          selection: [{ type: "checkerboard", parity: 0 }],
          source: { type: "constant" },
          target: "tileId",
          mapping: { palette: [{ tileId: "t1", weight: 1 }] },
          blend: "set",
        },
      ],
    },
  };
}

/**
 * How many whole tiles fit a free space of `width` × `height` CSS px, or
 * `null` when fewer than `MOTIF_MIN_ROWS` rows (or no column) fit. Whole tiles
 * only: a decoration's width is exactly `columns * cellSize`, so it never
 * reaches past the space it was measured in, and so never adds a scrollbar.
 */
export function motifShape(
  width: number,
  height: number,
  cell: number = MOTIF_CELL,
): { rows: number; columns: number } | null {
  const columns = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  if (columns < 1 || rows < MOTIF_MIN_ROWS) return null;
  return { rows, columns };
}
