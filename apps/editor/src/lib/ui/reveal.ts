/**
 * How far to scroll so that something the user just opened can be seen
 * (B-020, batch 01 T-09). `Collapsible` calls it when its body has finished
 * sliding open.
 *
 * The rule: scroll down until the opened thing's bottom is in view, **but
 * never so far that its top leaves the top of the view**. A section taller
 * than the view ends with its header at the top instead, so the user still
 * sees what they opened and can read down from there. Nothing ever scrolls
 * up: the user just clicked the header, so it is already on screen.
 *
 * Rejected: `scrollIntoView({ block: "nearest" })`. It does the first half of
 * the rule, but for an element taller than the view it aligns the *bottom*
 * when it was below, so the header the user clicked leaves the screen. It also
 * cannot know that a stuck section header (T-08) covers the top of the view.
 */

/** A vertical span in one coordinate space (client px). */
export interface Span {
  top: number;
  bottom: number;
}

/**
 * The px to scroll down so `target` is revealed in `view`; 0 for none.
 *
 * `topInset` is how much of the view's top is covered by something stuck
 * there (an enclosing section's sticky header), which the target's top must
 * stay below. Less than a pixel of overflow is subpixel rounding, not hidden
 * content, and does not scroll.
 */
export function revealDelta(view: Span, target: Span, topInset = 0): number {
  const hidden = target.bottom - view.bottom;
  if (hidden < 1) return 0;
  const room = target.top - (view.top + topInset);
  if (room <= 0) return 0;
  return Math.min(hidden, room);
}

/** The parts of an element `scrollParent` reads, so a test can pass a plain object. */
export interface ScrollNode {
  parentElement: ScrollNode | null;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * The nearest ancestor of `node` that scrolls vertically and has something to
 * scroll, or null.
 *
 * Null means `Collapsible` is not inside a scroll container (a story page, a
 * dialog), and then nothing scrolls: the page itself is never scrolled from
 * here. The root element's computed `overflow-y` is `visible`, so it is never
 * returned, even in the narrow layout where the page scrolls; the sidebar has
 * its own scroller there too.
 */
export function scrollParent(
  node: ScrollNode | null,
  overflowY: (element: ScrollNode) => string = (element) =>
    getComputedStyle(element as unknown as Element).overflowY,
): ScrollNode | null {
  for (let at = node?.parentElement ?? null; at; at = at.parentElement) {
    const overflow = overflowY(at);
    if ((overflow === "auto" || overflow === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }
  return null;
}

/**
 * Scroll `element`'s scroll container so `element` is revealed (see the
 * module comment). Does nothing outside a scroll container.
 */
export function revealInScroller(element: HTMLElement, topInset: number, behavior: ScrollBehavior): void {
  const scroller = scrollParent(element) as HTMLElement | null;
  if (!scroller) return;
  // The visible part of the scroller: its padding box, inside any border.
  const box = scroller.getBoundingClientRect();
  const top = box.top + scroller.clientTop;
  const view = { top, bottom: top + scroller.clientHeight };
  const delta = revealDelta(view, element.getBoundingClientRect(), topInset);
  if (delta > 0) scroller.scrollBy({ top: delta, behavior });
}
