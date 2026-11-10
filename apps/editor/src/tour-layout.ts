/**
 * Where the tour draws (B-017, O3b): which elements a step cuts out, the
 * holes in the scrim, how far to scroll to show a target, and where the bubble
 * goes. Pure, so
 * `tour-layout.test.ts` can test it; `lib/Tour.svelte` measures the DOM and
 * passes the numbers in (CLAUDE.md, Testing).
 *
 * The rules are DESIGN_SYSTEM.md § "Onboarding: the tour", "The scrim and the
 * cut-out" and "Placement".
 */

import { placeBeside, type Box } from "./lib/ui/popover.js";
import { revealDelta, type Span } from "./lib/ui/reveal.js";
import type { TargetKey, TourStep } from "./tour.js";

export type { Box };

export interface Viewport {
  width: number;
  height: number;
}

/**
 * The elements a step cuts out, found by `find` (a `data-tour` lookup in the
 * app; injected so the tests need no DOM). When the step's first target is
 * missing and the step has a `fallback`, the fallback alone: the first target
 * is what the text is about, and a second one without it (step 6's picture,
 * without the card that explains it) would point at the wrong thing. Without a
 * fallback, whatever was found. Empty on Welcome.
 */
export function resolveTargets<T>(step: Pick<TourStep, "targets" | "fallback">, find: (key: TargetKey) => T | undefined): T[] {
  const [first] = step.targets;
  if (first === undefined) return [];
  if (find(first) === undefined && step.fallback !== undefined) {
    const fallback = find(step.fallback);
    return fallback === undefined ? [] : [fallback];
  }
  return step.targets.map(find).filter((el): el is T => el !== undefined);
}

/**
 * Whether the boxes (the targets' visible parts) can be seen in one window:
 * their span fits its height and width. When they can't, `Tour.svelte` cuts
 * out the step's `alone` target instead. Step 6's card and picture share the
 * window in two columns; stacked, the open card fills the window and the
 * picture is a window's height below it, so its ring would be off screen (O4).
 * Measured, not the 40rem media query, as `placeBubble` measures two columns.
 */
export function oneWindow(boxes: readonly Box[], viewport: Viewport): boolean {
  if (boxes.length < 2) return true;
  const top = Math.min(...boxes.map((b) => b.top));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  const left = Math.min(...boxes.map((b) => b.left));
  const right = Math.max(...boxes.map((b) => b.right));
  return bottom - top <= viewport.height && right - left <= viewport.width;
}

/**
 * The target's box grown by `pad` on every side (`--space-2`): the hole the
 * ring is drawn on.
 *
 * `Tour.svelte` draws each hole as a `<rect>` in an SVG mask over the window,
 * with its position in CSS (`x`, `y`, `width`, `height`), so a hole moves to
 * the next step's target with a transition. Rejected: one `path` for the scrim
 * with evenodd holes, which was the O3b plan; a path's `d` can be transitioned
 * only in Chromium, so the hole would jump while the bubble slid.
 */
export function cutout(box: Box, pad: number): Box {
  return { top: box.top - pad, bottom: box.bottom + pad, left: box.left - pad, right: box.right + pad };
}

/**
 * The part of `box` inside `within`: a target's visible part in its scroller.
 * An open operation card can be taller than the sidebar, and its hole and ring
 * would otherwise run on over the footer, which the step is not about.
 */
export function clip(box: Box, within: Box): Box {
  const top = Math.max(box.top, within.top);
  const left = Math.max(box.left, within.left);
  return {
    top,
    left,
    bottom: Math.max(top, Math.min(box.bottom, within.bottom)),
    right: Math.max(left, Math.min(box.right, within.right)),
  };
}

/**
 * The px to scroll a scroller (or the page) so `target` shows in `view`,
 * below `topInset` (a sticky section header over it). Unlike `revealDelta`
 * (`ui/reveal.ts`), which only scrolls down because the user just pressed what
 * it reveals, this also scrolls **up**: Back on the tour returns to a target
 * the last step scrolled past. Down, it is `revealDelta`'s rule: the bottom
 * into view, never the top out of it.
 */
export function scrollDelta(view: Span, target: Span, topInset = 0): number {
  const above = target.top - (view.top + topInset);
  if (above < 0) return above;
  return revealDelta(view, target, topInset);
}

export interface BubblePlacement {
  top: number;
  left: number;
  width: number;
}

export interface BubbleInput {
  viewport: Viewport;
  /** The sidebar's box (`<aside>`). */
  sidebar: Box;
  /** The step's cut-outs, the one the text is about first. Empty on Welcome. */
  holes: readonly Box[];
  /** `--explainer-w`: the bubble's width beside the sidebar or in it. */
  width: number;
  /** `--space-4`: from the sidebar, from a cut-out, and inside the window. */
  margin: number;
  /** 16px: the bubble's side gutters when it spans the window. */
  gutter: number;
  /**
   * In the sidebar column rather than beside it: step 6, whose second cut-out
   * is the picture beside the sidebar, which a bubble there would cover.
   */
  inSidebar: boolean;
  /**
   * The bubble's height at a width. The height depends on the width (the text
   * wraps), and the width depends on where it goes, so placement asks rather
   * than being told. `Tour.svelte` sets the width and reads `offsetHeight`.
   */
  heightAt: (width: number) => number;
}

/**
 * Where the bubble goes (DESIGN_SYSTEM.md "Placement"):
 * - **Two columns:** beside the sidebar, level with the first cut-out, kept
 *   inside the window (`placeBeside`, as the Explainer is placed).
 * - **Step 6 in two columns:** in the sidebar column, below the card or above
 *   it, left-aligned with it.
 * - **Stacked, or no room beside:** below the first cut-out, or above it when
 *   it doesn't fit below, the window's width less `gutter` on each side.
 *
 * "Two columns" is measured as `placeBeside` measures it (is there room right
 * of the sidebar?), not the 40rem media query, for the reason it gives. A
 * bubble that fits on neither side of its cut-out goes where there is more
 * room, it goes to the window's bottom (`aboveOrBelow`). It never leaves the
 * window.
 */
export function placeBubble(input: BubbleInput): BubblePlacement {
  const { viewport, sidebar, holes, width, margin, gutter, inSidebar, heightAt } = input;
  const anchor = holes[0] ?? { top: viewport.height / 2, bottom: viewport.height / 2, left: 0, right: 0 };
  // Whether a bubble `width` wide fits right of the sidebar: placeBeside's horizontal test alone.
  const twoColumns = placeBeside(sidebar, anchor, viewport, { width, height: 0 }, margin) !== undefined;

  if (twoColumns && !inSidebar) {
    const height = heightAt(width);
    const beside = placeBeside(sidebar, anchor, viewport, { width, height }, margin)!;
    return { top: beside.top, left: beside.left, width };
  }

  if (twoColumns && inSidebar) {
    // Never wider than the room from the card's left edge to the sidebar's.
    const w = Math.min(width, sidebar.right - margin - anchor.left);
    return { top: aboveOrBelow(anchor, heightAt(w), viewport, margin), left: anchor.left, width: w };
  }

  const w = Math.max(0, viewport.width - 2 * gutter);
  return { top: aboveOrBelow(anchor, heightAt(w), viewport, margin), left: gutter, width: w };
}

/**
 * The bubble's top: `margin` under `anchor` if it fits there, else `margin`
 * over it if it fits there, else at the window's bottom, `margin` inside it.
 *
 * Fitting on neither side means the cut-out is tall: on step 6, operation 3's
 * open card fills the sidebar. The bubble then has to cover part of it, and
 * the bottom covers its end, where the palette runs on, rather than its head,
 * which names the operation the text is about. Rejected: the side with more
 * room, clamped, which put the bubble over the card's head at 1440 × 900.
 */
export function aboveOrBelow(anchor: Box, height: number, viewport: Viewport, margin: number): number {
  const below = anchor.bottom + margin;
  if (below + height <= viewport.height - margin) return below;
  const above = anchor.top - margin - height;
  if (above >= margin) return above;
  return Math.max(margin, viewport.height - margin - height);
}
