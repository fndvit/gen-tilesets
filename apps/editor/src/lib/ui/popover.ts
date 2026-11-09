/**
 * Where a non-modal popover sits against its trigger, and whether a press
 * landed outside it — shared by `TilePicker` and `Explainer`
 * (`DESIGN_SYSTEM.md` *Tile picker*, *Explainer popover*).
 *
 * Both are placed `fixed` against the trigger's box, like `Menu`, so the
 * sidebar's scroll area cannot clip them. Moved out of `TilePicker.svelte` when
 * the Explainer needed the same rules (item 12), so the two cannot drift, and so
 * the rules are tested: vitest cannot load a `.svelte` file.
 */

/** The part of a `DOMRect` placement reads. */
export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * `top` is the edge the popover hangs from: the trigger's bottom, or its top
 * when `up`. `left` and `right` are the trigger's edges as CSS `left` and
 * `right` offsets, so a popover can align either side with it.
 */
export interface Placement {
  top: number;
  left: number;
  right: number;
  up: boolean;
}

/**
 * Under the trigger, unless fewer than `room` px are left below it in the
 * window; then above it.
 */
export function placeAt(anchor: Box, viewport: { width: number; height: number }, room: number): Placement {
  const up = viewport.height - anchor.bottom < room;
  return {
    top: up ? anchor.top : anchor.bottom,
    left: anchor.left,
    right: viewport.width - anchor.right,
    up,
  };
}

/**
 * An edge offset (a CSS `left`, or `right` measured from the window's right
 * edge) moved just enough that a panel `size` px wide stays `margin` px inside
 * a window `room` px wide. A panel wider than the room keeps the near margin.
 *
 * For a menu aligned with its trigger's far edge: Export's left-aligned menu,
 * on a 320px screen where the top bar has wrapped, would otherwise run off the
 * right edge (X4, WCAG 1.4.10).
 */
export function keepInside(offset: number, size: number, room: number, margin: number): number {
  return Math.max(margin, Math.min(offset, room - margin - size));
}

/** Whether a press on `target` is outside every one of `inside` (the panel, its trigger). */
export function pressedOutside(target: Node, inside: readonly ({ contains(node: Node): boolean } | undefined)[]): boolean {
  return !inside.some((el) => el?.contains(target) === true);
}

/**
 * Above or below the trigger, whichever side the panel fits on — or, when it
 * fits on neither, whichever side has more room (it then scrolls on that
 * side). Below wins a tie, because below is where the eye goes first.
 *
 * `height` is the panel's measured height, not a guess: the fixed 420px room
 * `Explainer` passed to `placeAt` opened "How operations work" upward into
 * less room than it had below (batch 02, T-03).
 */
export function placeOnLargerSide(anchor: Box, viewport: { width: number; height: number }, height: number): Placement {
  const below = viewport.height - anchor.bottom;
  const above = anchor.top;
  const up = below < height && above > below;
  return {
    top: up ? anchor.top : anchor.bottom,
    left: anchor.left,
    right: viewport.width - anchor.right,
    up,
  };
}

/** A panel placed beside the sidebar: CSS `top` and `left`, and the most it may be tall. */
export interface BesidePlacement {
  top: number;
  left: number;
  maxHeight: number;
}

/**
 * To the right of the sidebar, over the preview, level with its trigger when
 * it fits and otherwise moved up just enough to stay `margin` px inside the
 * window. A panel taller than the window sits at the top margin and scrolls
 * (`maxHeight`). `undefined` when a panel `size.width` wide does not fit
 * between the sidebar and the window's right margin.
 *
 * Batch 02 D-04 (A): a tall explainer is beside the sidebar, where the whole
 * window height is free, instead of above or below a trigger with half of it.
 * It covers only its own width of the preview (Pol: "not the full preview
 * width"), next to the controls it explains.
 *
 * "Does not fit" is measured, not the stacked layout's 40rem breakpoint: in
 * that layout the sidebar spans the window, so no room is left, and a window
 * just over 40rem whose preview column is narrower than the panel also falls
 * back, which a media query would miss. Level with the trigger rather than at
 * the window's top or centre, so the panel opens where the eye already is.
 */
export function placeBeside(
  sidebar: Box,
  anchor: Box,
  viewport: { width: number; height: number },
  size: { width: number; height: number },
  margin: number,
): BesidePlacement | undefined {
  const left = sidebar.right + margin;
  if (left + size.width > viewport.width - margin) return undefined;
  const maxHeight = Math.max(0, viewport.height - 2 * margin);
  const top = Math.max(margin, Math.min(anchor.top, viewport.height - margin - size.height));
  return { top, left, maxHeight };
}
