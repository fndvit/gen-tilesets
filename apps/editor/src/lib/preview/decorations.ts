/**
 * The preview's Decorations mode: the file drawn as a decoration style, through
 * the package's own `<TileDecoration>`, at fixed shapes.
 *
 * A file meant only for decorations used to be authored blind: the preview
 * drew it as a page tileset at a width, never at the 1×1, 3×2, 1×4 a host
 * places it at. This module is the arithmetic of that view; it holds no runes
 * so the tests can load it (`CLAUDE.md`, *Testing*). Like everything in
 * `view.svelte.ts`, none of it is ever written to the file (**E11**).
 */

import {
  coordinateBoundOperations,
  isCoordinateBound,
  reshapeErrors,
  type Operation,
  type TilesetFile,
} from "@vit-foundation/gen-tilesets";
import { labelFor } from "../operations/labels.js";

export interface Span {
  rows: number;
  columns: number;
}

/**
 * The Gallery's shapes. One of each kind a host actually gives a decoration:
 * a single tile, squares, portrait and landscape blocks (beside a heading or a
 * paragraph), and the two strips (a rule under a title, a margin down a page).
 * Seven, because at a fixed cell size of 44 they fit two rows of a 1024px
 * column, and at Fit they still read as tiles rather than as specks; more
 * would turn the gallery into a scroll. Fixed rather than editable:
 * the Custom view is where a specific shape is asked for (Pol), and a gallery
 * that changes under you is no longer a stable reference to judge edits by.
 */
export const GALLERY: readonly Span[] = [
  { rows: 1, columns: 1 },
  { rows: 2, columns: 2 },
  { rows: 3, columns: 2 },
  { rows: 2, columns: 3 },
  { rows: 3, columns: 3 },
  { rows: 1, columns: 4 },
  { rows: 4, columns: 1 },
];

/** CSS px per tile the bar offers beside Fit. 44 is the demo's and the docs' size. */
export const CELL_SIZES = [24, 44, 64, 96] as const;

/**
 * The cell setting that fills the preview area (`fitGallery`). The default:
 * at a fixed size the gallery was one strip across a mostly empty area (Pol).
 * The fixed sizes stay, because a cell size is what a host passes and an
 * author sometimes needs to see that exact one.
 */
export const FIT = "fit";
export type CellSetting = number | typeof FIT;
export const DEFAULT_CELL: CellSetting = FIT;

/**
 * Fit never goes past this. Uncapped, a 1×1 Custom spot fills the whole area
 * and stops reading as a decoration — ornament beside content — and becomes a
 * poster. 160 is a bit over the largest fixed size (96) by the same ratio the
 * fixed sizes step by.
 */
export const MAX_FIT_CELL = 160;

/** Fit never goes under this; below it the area scrolls, as at a fixed size. */
export const MIN_FIT_CELL = 8;

/** The layout's own lengths, measured from the CSS by the component (px). */
export interface GalleryMetrics {
  /** Between spots in a row, and between rows. */
  gap: number;
  /** A caption's height. */
  captionHeight: number;
  /** Between a spot and its caption. */
  captionGap: number;
}

export interface GalleryLayout {
  /** CSS px per tile. */
  cell: number;
  /** Indices into the spans, row by row, in order. */
  rows: number[][];
}

/**
 * The spans split into rows at `cell`: greedy, in order, a row taking spots
 * while they fit `width`. A spot wider than `width` on its own still gets a
 * row (it scales down, `max-width: 100%`).
 *
 * **Computed here and drawn as is, not left to `flex-wrap`**: Fit chooses a
 * cell by how many rows the spots take, so the rows drawn must be the rows it
 * counted. A browser wrapping by its own sub-pixel sums could break a row Fit
 * thought fitted, and the gallery would overflow.
 */
export function packRows(spans: readonly Span[], cell: number, width: number, gap: number): number[][] {
  const rows: number[][] = [];
  let used = 0;
  spans.forEach((span, i) => {
    const w = span.columns * cell;
    const row = rows[rows.length - 1];
    if (row && used + gap + w <= width) {
      row.push(i);
      used += gap + w;
    } else {
      rows.push([i]);
      used = w;
    }
  });
  return rows;
}

/** How tall the gallery is when `rows` are drawn at `cell`, captions and gaps included. */
export function galleryHeight(
  spans: readonly Span[],
  rows: readonly (readonly number[])[],
  cell: number,
  metrics: GalleryMetrics,
): number {
  const tallest = rows.map((row) => Math.max(...row.map((i) => spans[i]!.rows)) * cell);
  const spots = tallest.reduce((sum, h) => sum + h + metrics.captionGap + metrics.captionHeight, 0);
  return spots + Math.max(0, rows.length - 1) * metrics.gap;
}

/**
 * Fit: the largest whole-px cell, up to `MAX_FIT_CELL`, at which the spans
 * fit `area` without a scroll, and the rows they take there. Whole px so tile
 * edges land on pixels, as at the fixed sizes.
 *
 * A downward scan over every cell, not a bisection: rows change with the
 * cell, so "fits" is not monotone in it (a bigger cell can wrap into a shape
 * that fits where a smaller one did not). At most ~150 tries of seven spans.
 *
 * Nothing fits even at `MIN_FIT_CELL` (a tiny window): that cell, and the
 * area scrolls. The bar's readout says the cell actually used.
 */
export function fitGallery(
  spans: readonly Span[],
  area: { width: number; height: number },
  metrics: GalleryMetrics,
): GalleryLayout {
  for (let cell = MAX_FIT_CELL; cell > MIN_FIT_CELL; cell--) {
    const rows = packRows(spans, cell, area.width, metrics.gap);
    const fitsWidth = rows.every((row) => rowWidth(spans, row, cell, metrics.gap) <= area.width);
    if (fitsWidth && galleryHeight(spans, rows, cell, metrics) <= area.height) return { cell, rows };
  }
  return { cell: MIN_FIT_CELL, rows: packRows(spans, MIN_FIT_CELL, area.width, metrics.gap) };
}

function rowWidth(spans: readonly Span[], row: readonly number[], cell: number, gap: number): number {
  return row.reduce((sum, i) => sum + spans[i]!.columns * cell, 0) + (row.length - 1) * gap;
}

/** The Custom view's starting shape, the docs' example. */
export const DEFAULT_CUSTOM: Span = { rows: 3, columns: 2 };

/**
 * The largest rows or columns Custom takes. A decoration is ornament beside
 * content; past a dozen tiles it is a page tileset, which the Page mode
 * already previews. Also keeps a stray "200" from mounting 40,000 cells.
 */
export const MAX_SPAN = 12;

/**
 * Custom's rows/columns field: a whole number in `[1, MAX_SPAN]`, else `null`
 * — refused, never clamped, as every numeric field in the editor (`fields.ts`,
 * **E5**): the field holds the text and the view keeps its last good value.
 */
export function parseSpan(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 && n <= MAX_SPAN ? n : null;
}

/**
 * The seed a spot draws with. `options.seed` is what makes two decorations of
 * one size differ (`TileDecorationInputs.options`), so each spot gets its own,
 * and Reroll spots moves them all.
 *
 * **A string fixed by position and reroll count, never random**: an edit to
 * the file must redraw each spot with the *same* seed, or every weight drag
 * would reshuffle the gallery and nothing could be compared before and after.
 * Determinism in `(style, seed, loadSalt)` is the package's; this keeps the
 * seed half of it still.
 */
export function spotSeed(index: number, reroll: number): string {
  return `decoration-${index}-${reroll}`;
}

/**
 * Why the file cannot be drawn as a decoration at this shape, or `[]`.
 *
 * Exactly the check `reshapeDecoration` throws on in a development build
 * (`packages/tileset/src/render/decoration.ts`), with the same shape it uses,
 * asked first so the preview can say it in place instead of the component
 * throwing. In practice it fires for a `rect` or `cellList` operation, and its
 * message names it. Nothing is drawn then: drawing the file without that
 * operation would show a picture no host could get (failure is loud).
 */
export function decorationErrors(file: TilesetFile, span: Span, cellSize: number): string[] {
  return reshapeErrors(file, { rows: span.rows, columns: span.columns, cellSize, bleed: 0, yOffset: 0 });
}

/**
 * An operation a decoration cannot place, named as its card names it: its
 * number in the stack and its pinning layers' labels ("Drag", "Handpick"),
 * never its id or registry type, which the editor shows nowhere.
 */
export interface BoundOperation {
  id: string;
  /** 1-based, as the card's index square. */
  index: number;
  labels: string[];
}

/**
 * The operations that stop the file being a decoration style: those with a
 * coordinate-bound selection layer (`rect`, `cellList`). Read from the
 * registry's own declaration through the package's `coordinateBoundOperations`
 * / `isCoordinateBound`, never a list of names, as `orphans.ts` `atRisk` does
 * and for the same reason.
 *
 * `numbered` is the stack the cards number. The preview draws a file with
 * the hidden operations left out, and counting in that file would give a card
 * below a hidden one the wrong number; so the caller passes the saved stack.
 *
 * This is what the preview *says*; whether it draws is `decorationErrors`'s
 * call. They are kept apart because `reshapeErrors` is the package's authority
 * and could one day refuse for another reason, which must still stop the draw
 * even though this list would be empty.
 */
export function boundOperations(
  file: TilesetFile,
  numbered: readonly Operation[] = file.config.operations,
): BoundOperation[] {
  return coordinateBoundOperations(file.config.operations).map((op) => ({
    id: op.id,
    index: numbered.findIndex((o) => o.id === op.id) + 1,
    labels: [
      ...new Set(op.selection.filter((layer) => isCoordinateBound([layer])).map((layer) => labelFor(layer.type))),
    ],
  }));
}

/**
 * A spot's caption, columns first: width × height, as an image size reads and
 * as the package's own decoration errors put it ("cannot be placed at 2 x 3").
 */
export function spanLabel(span: Span): string {
  return `${span.columns} × ${span.rows}`;
}
