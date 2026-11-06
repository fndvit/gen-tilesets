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

/** Whether a press on `target` is outside every one of `inside` (the panel, its trigger). */
export function pressedOutside(target: Node, inside: readonly ({ contains(node: Node): boolean } | undefined)[]): boolean {
  return !inside.some((el) => el?.contains(target) === true);
}
