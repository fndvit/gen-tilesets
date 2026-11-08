/**
 * The preview width's arithmetic, kept free of runes so it can be tested
 * (`vitest.config.ts` runs without the Svelte plugin). `view.svelte.ts` holds
 * the state; the bars and `PreviewFrame` read it.
 *
 * **Nothing here writes a field** (**E11**): the width, the backdrop and the
 * grid toggle are transient UI state beside the file (§4.1, **E4**).
 */

import { activeRules, type ResponsiveRule } from "@vit-foundation/gen-tilesets";

/**
 * The narrowest the frame may be dragged, in px.
 *
 * A **UI constant with no authority anywhere**, recorded in `DECISIONS.md` D17. It
 * exists so the handles cannot be dragged past each other, not because any
 * width is illegal: `07` §5.3 makes the layout correct at *every* `Wpx`, with
 * no minimum anywhere in the contract.
 */
export const MIN_WIDTH = 160;

/**
 * Preset widths, offered as a convenience (Figma's size bar: 360 / 768 / 1024 /
 * 1440; Fill follows them).
 *
 * §9.2: they "carry no spec content". **The term _breakpoint_ is reserved for
 * the file's `responsive` rules and is not used for these** — they select a
 * preview width and nothing in the file names them. UI constants; see
 * `DECISIONS.md` D17.
 */
export const PRESETS = [360, 768, 1024, 1440] as const;

/**
 * How much room each width handle needs beside the frame, in screen px: all of
 * `--handle-w` (24), because the hit area lies wholly outside the box edge, so
 * it never covers a cell the Handpick brush paints (Pol, P4).
 *
 * The handles are not inside the render box — `08` **S9** gives the
 * component's own element no padding and no border so `Wpx` is unambiguously
 * its width — so the column reserves the gutter instead.
 */
export const HANDLE = 24;

/** The default backdrop. */
export const WHITE = "#ffffff"; // part of the picture, not chrome, so not a token

/**
 * The column less the two handle gutters: what Fill fills and what the zoom
 * fits into.
 *
 * **Floored to a whole pixel.** `clientWidth` in a flex column is routinely
 * fractional, so Fill otherwise handed the render box a `Wpx` with a
 * fractional part nothing chose and no two layouts would agree on. It removes
 * one avoidable source of run-to-run variation, so the same file at the same
 * preset draws the same picture.
 */
export function roomFor(available: number): number {
  return Math.max(Math.floor(available) - 2 * HANDLE, MIN_WIDTH);
}

/**
 * `Wpx`: the room under Fill (`requested === null`), else the request.
 *
 * **Not clamped to what the editor can display.** An earlier version clamped it
 * to the column, so asking for 1024 in an 866px column silently produced an
 * 866px preview — the author judging a composition at a width the file was
 * never asked about (`07` §3's worst outcome in miniature). `zoomFor` shrinks
 * the picture to fit instead.
 */
export function widthFor(requested: number | null, room: number): number {
  return requested === null ? room : Math.max(requested, MIN_WIDTH);
}

/**
 * The **display zoom**, applied when `Wpx` exceeds the room the editor has.
 *
 * `07` §5.3 makes this exact rather than an approximation: every horizontal
 * quantity is a fixed fraction of `Wpx`, so shrinking the finished result to
 * fit changes nothing about the composition. **It is not `s`** — that is the
 * component's design-to-render scale. Only ever shrinks: magnifying a small
 * `Wpx` would show a picture at a size no visitor gets. 1 before the column is
 * measured.
 */
export function zoomFor(width: number, room: number, available: number): number {
  return width > 0 && available > 0 ? Math.min(1, room / width) : 1;
}

/** Every distinct bound the rules name, ascending — one breakpoint button each. */
export function boundsOf(rules: readonly ResponsiveRule[]): number[] {
  const all = rules.flatMap((r) => [r.minWidth, r.maxWidth]).filter((w): w is number => w !== undefined);
  return [...new Set(all)].sort((a, b) => a - b);
}

/**
 * The breakpoint the width is in: the smallest bound at or above it (Pol,
 * Stage 2). At 860 with bounds 768 / 1024 / 1440 that is 1024, and clicking a
 * button lands on its own bound, so the clicked one is the active one. `null`
 * above the largest bound.
 */
export function activeBound(bounds: readonly number[], width: number): number | null {
  return bounds.find((b) => b >= width) ?? null;
}

/** Which rules hold at a width, by 1-based number, or "base". */
export function holdingLabel(rules: readonly ResponsiveRule[], width: number): string {
  const active = activeRules(rules, width);
  return active.length === 0 ? "base" : `rule ${active.map((r) => rules.indexOf(r) + 1).join(" + ")}`;
}
