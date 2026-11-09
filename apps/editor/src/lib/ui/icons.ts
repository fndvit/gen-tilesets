/**
 * The editor's icon set: one family, one grid, one stroke.
 *
 * Iteration 2 replaces the Figma mix (a filled triangle for reorder, an outline
 * trash, a filled re-seed) with a single outline family, so every icon reads as
 * one voice. The paths are Lucide's (lucide.dev, ISC licence), drawn on its
 * 24-unit grid and rendered at 16px. A 2.25-unit stroke on that grid is 1.5px on
 * screen, with round caps and joins throughout.
 *
 * Paths are kept rather than files because an icon takes its colour from the
 * text around it: `Icon.svelte` draws every entry with `currentColor`, so no
 * icon carries a colour of its own.
 *
 * An icon names an action, never a decoration. Each one sits beside a word or
 * inside a control with an accessible name (`IconButton`'s `label`).
 */

export interface IconDef {
  /** Rendered size in px. */
  w: number;
  h: number;
  /** The path's coordinate frame, a square `box` units wide. */
  box: number;
  d: string;
  /** Stroke width in `box` units. */
  strokeWidth: number;
}

/** 1.5px at 16px on a 24-unit grid. */
const STROKE = 2.25;

const icon = (d: string): IconDef => ({ w: 16, h: 16, box: 24, d, strokeWidth: STROKE });

export const ICONS = {
  /** Disclosure. Points down; `Collapsible` turns it up when open. */
  fold: icon("m6 9 6 6 6-6"),
  /** Move an item earlier / later in a list. */
  up: icon("m5 12 7-7 7 7M12 19V5"),
  down: icon("M12 5v14m7-7-7 7-7-7"),
  /** Add. */
  plus: icon("M5 12h14M12 5v14"),
  /** Close a panel, remove a tile asset. */
  close: icon("M18 6 6 18M6 6l12 12"),
  /** Delete. */
  trash: icon(
    "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6",
  ),
  /**
   * Re-seed: anything that draws its randomness again (the seed, an operation's
   * salt, the asset channel, a fresh load). The shape, not a colour, says it.
   */
  reseed: icon(
    "M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22m-4-4 4 4-4 4" +
      "M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8m5.7 6.6 4-4-4-4",
  ),
  /** Undo the last edit. */
  undo: icon("M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"),
  /** Open a tileset from a file. */
  import: icon(
    "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4" +
      "a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
  ),
  /** Save the tileset out as a file. */
  export: icon("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"),
  /** Start a new tileset. */
  new: icon(
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M9 15h6M12 18v-6",
  ),
  /** More actions, in a menu. */
  more: icon(
    "M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M18 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0" +
      "M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  ),
  /** Drag to reorder: a palette entry's grip (Lucide grip-vertical). */
  grip: icon(
    "M8 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M8 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M8 19a1 1 0 1 0 2 0a1 1 0 1 0-2 0" +
      "M14 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 19a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  ),
  /** Change one thing for another: a palette entry's tile (Lucide arrow-right-left). */
  swap: icon("m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"),
  /** The tileset as a zip (Lucide archive). */
  archive: icon("M3 3h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"),
  /** The tileset as a picture: a PNG (Lucide image). */
  image: icon(
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM7 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0" +
      "M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
  ),
  /** Done. */
  check: icon("M20 6 9 17l-5-5"),
  /** An advisory: something worth knowing that blocks nothing (a notice, an inline advisory). */
  info: icon("M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 16v-4M12 8h.01"),
  /** A failure: something that did not work (a picture that did not load). */
  alert: icon("m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"),
  /** An operation drawn in the preview; press to hide it (batch 02 T-02). Lucide eye. */
  eye: icon(
    "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" +
      "M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  ),
  /** An operation hidden from the preview (batch 02 T-02). Lucide eye-off. */
  "eye-off": icon(
    "M10.73 5.08a10.74 10.74 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49" +
      "M14.08 14.16a3 3 0 0 1-4.24-4.24M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7" +
      " 10.75 10.75 0 0 1 4.45-5.14M2 2l20 20",
  ),
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
