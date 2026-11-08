/**
 * Geometry for `ScrollArea.svelte`'s overlay handle, kept out of the component
 * so it can be tested.
 *
 * The handle's length is the visible share of the content, never shorter than
 * `minPx`, and its travel is the track minus that length. Dragging maps back
 * through the same ratio, so the handle stays under the pointer.
 */

export interface Thumb {
  /** Handle length in px. `0` means the content fits and there is no handle. */
  size: number;
  /** Distance from the top of the track in px. */
  offset: number;
}

/** The handle for a viewport `client` px tall showing `scroll` px of content, scrolled `top` px. */
export function thumbFor(client: number, scroll: number, top: number, minPx: number): Thumb {
  if (!(client > 0) || scroll <= client) return { size: 0, offset: 0 };
  const size = Math.min(client, Math.max(minPx, (client * client) / scroll));
  const travel = client - size;
  const ratio = Math.min(1, Math.max(0, top / (scroll - client)));
  return { size, offset: ratio * travel };
}

/** The `scrollTop` that puts the handle `deltaPx` further down than it was at `startTop`. */
export function scrollForDrag(
  client: number,
  scroll: number,
  startTop: number,
  deltaPx: number,
  minPx: number,
): number {
  const { size } = thumbFor(client, scroll, startTop, minPx);
  const travel = client - size;
  if (size === 0 || travel <= 0) return startTop;
  const max = scroll - client;
  return Math.min(max, Math.max(0, startTop + (deltaPx / travel) * max));
}
