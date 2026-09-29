/**
 * Client coordinates to **render space** — `07` §8.2's caller work, now done in
 * the package.
 *
 * Render space is "rendered pixels, relative to the render box's top-left corner.
 * Not design px, not client or page coordinates", and `07` §8.2 calls converting
 * into it "the single most likely place to get this wrong". It used to live in
 * the editor's `paint.ts`, because the brush was its only caller. The keep-out
 * mask is a second one, and **R1**'s rule for the coordinate mapping applies to
 * this conversion for the same reason: two copies drift, and nothing reports the
 * drift. So there is one, here, and the editor imports it.
 *
 * ## The ratio is the display zoom, and it is not `s`
 *
 * A `getBoundingClientRect()` is post-transform and the laid-out width is
 * pre-transform, so their ratio **is** any ancestor's CSS scale — recovered from
 * the element rather than passed in, which means no caller can pass the wrong one.
 * The editor's `PreviewFrame` scales the whole preview down this way (`DECISIONS.md`
 * D18); a host page that scales a section containing a tileset is the same case.
 *
 * `s = Wpx / referenceWidth` is a different scaling entirely and lives in
 * `geometry.ts`. Conflating the two is how a click lands on the wrong cell at
 * every width but one.
 *
 * The vertical uses the same ratio deliberately: the zoom is uniform, so a
 * separate vertical ratio would be the same number computed twice — and would
 * divide by zero on a zero-height box, which is the state a box is in for one
 * frame at startup.
 */

import type { CellBox } from "./geometry.js";

/** A rect in render space. The same four edges `cellBox` returns. */
export type RenderRect = CellBox;

/**
 * What the conversion needs from the render box, and nothing more.
 *
 * A plain record rather than the element, so the arithmetic is testable with no
 * DOM. `metricsOf` is the only part that touches one.
 */
export interface BoxMetrics {
  /** `getBoundingClientRect()` — **on screen**, so it includes any display zoom. */
  clientLeft: number;
  clientTop: number;
  clientWidth: number;
  /**
   * The **laid-out** width, which a CSS transform does not affect. `offsetWidth`
   * is one source and is rounded to an integer; `ResizeObserver`'s
   * `borderBoxSize` is another and is not — the tracker in `measure.ts` passes
   * that one, since a rounded width makes the zoom off by up to half a pixel in
   * the width.
   */
  layoutWidth: number;
}

/**
 * The render box's metrics.
 *
 * `08` **S9** is what makes this unambiguous: the component owns the element and
 * styles it with no padding and no border, so its content box and border box
 * coincide and `offsetWidth` **is** `Wpx`.
 */
export function metricsOf(box: HTMLElement): BoxMetrics {
  const rect = box.getBoundingClientRect();
  return {
    clientLeft: rect.left,
    clientTop: rect.top,
    clientWidth: rect.width,
    layoutWidth: box.offsetWidth,
  };
}

function zoomOf(box: BoxMetrics): number {
  return box.clientWidth > 0 && box.layoutWidth > 0 ? box.clientWidth / box.layoutWidth : 1;
}

/** A client point in render space. */
export function toRenderSpace(
  box: BoxMetrics,
  clientX: number,
  clientY: number,
): { px: number; py: number } {
  const zoom = zoomOf(box);
  return {
    px: (clientX - box.clientLeft) / zoom,
    py: (clientY - box.clientTop) / zoom,
  };
}

/**
 * A client rect — any element's `getBoundingClientRect()` — in render space.
 *
 * Both rects are measured in the same client coordinates, so scrolling moves them
 * together and cancels out: nothing here reads a scroll offset.
 */
export function rectToRenderSpace(
  box: BoxMetrics,
  rect: { left: number; top: number; right: number; bottom: number },
): RenderRect {
  const zoom = zoomOf(box);
  return {
    left: (rect.left - box.clientLeft) / zoom,
    top: (rect.top - box.clientTop) / zoom,
    right: (rect.right - box.clientLeft) / zoom,
    bottom: (rect.bottom - box.clientTop) / zoom,
  };
}
