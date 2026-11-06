/**
 * The Pattern step's glyphs: a 4×4 grid of ink tints per Source, drawn as the
 * Selection glyphs are (43px slot, 10px cells at an 11px pitch), so the two
 * grids read as one family (Pol, T1).
 *
 * Hand-written rather than exported from Figma, like All and Checkered, because
 * Figma has no Pattern frame and the art is sixteen squares. Each one draws what
 * the Source *does* to a grid: Random scatters, Noise clumps, Gradient runs
 * corner to corner, Constant is one tint everywhere.
 *
 * Keyed by **registry name**. A Source registered later has no entry, and its
 * cell stays label-only (**E9**); nothing here needs to change for it.
 */

/** 0 = paper with an ink outline; 1–3 = lighter to darker ink. */
type Tint = 0 | 1 | 2 | 3;

const ART: Record<string, Tint[][]> = {
  random: [
    [3, 1, 2, 1],
    [1, 3, 1, 2],
    [2, 1, 3, 3],
    [1, 2, 1, 2],
  ],
  valueNoise: [
    [3, 3, 2, 1],
    [3, 2, 2, 1],
    [2, 2, 1, 1],
    [1, 1, 1, 2],
  ],
  gradient: [
    [3, 3, 2, 2],
    [3, 2, 2, 1],
    [2, 2, 1, 1],
    [2, 1, 1, 0],
  ],
  constant: [
    [2, 2, 2, 2],
    [2, 2, 2, 2],
    [2, 2, 2, 2],
    [2, 2, 2, 2],
  ],
};

/** Tokens, not hex: the glyph follows the theme like everything else. */
const FILL: Record<Tint, string> = {
  0: "var(--color-panel)",
  1: "var(--grey-300)",
  2: "var(--grey-500)",
  3: "var(--color-ink)",
};

/** The registry names that have artwork, in the order the grid shows them. */
export const PATTERN_ORDER = Object.keys(ART);

/**
 * The glyph as an SVG string, or `null` for a Source with no artwork.
 *
 * A string rather than markup in a component, so `OperationBody` can hand it to
 * `GlyphGrid` per item through `createRawSnippet` and this stays testable.
 */
export function patternSvg(name: string): string | null {
  const grid = ART[name];
  if (grid === undefined) return null;
  const cells = grid
    .flatMap((row, y) =>
      row.map((tint, x) => {
        const outline = tint === 0 ? ` stroke="var(--color-ink)" stroke-width="1"` : "";
        return `<rect x="${x * 11 + 0.5}" y="${y * 11 + 0.5}" width="10" height="10" fill="${FILL[tint]}"${outline}/>`;
      }),
    )
    .join("");
  return `<svg viewBox="0 0 44 44" width="43" height="43" aria-hidden="true">${cells}</svg>`;
}
