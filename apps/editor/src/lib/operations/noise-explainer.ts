/**
 * The "How noise works" popover's content — `DESIGN_SYSTEM.md` *Explainer
 * popover* (item 12, Pol N0–N1). Data, so `Explainer` stays a frame that knows
 * nothing about noise, and so the measured figures sit in one place with where
 * they came from.
 */

import type { ExplainerContent } from "../ui/explainer.js";

export const NOISE_EXPLAINER: ExplainerContent = {
  title: "How noise works",
  intro:
    "Noise gives every cell a value from 0 to 1 that changes smoothly, so nearby cells get similar values and the palette paints patches. The first entry takes the lowest values, the last the highest.",
  params: [
    {
      name: "Cells per feature",
      text: "About how many cells across one patch is. 2 speckles; 10 makes broad areas. It changes the size of the patches, not how much each entry paints.",
    },
    {
      name: "Octaves",
      text: "Adds layers of finer patches on top. Each layer pulls values toward the middle, so the middle entries cover more and the first and last less. Three equal entries paint about:",
    },
  ],
  /**
   * Measured against the engine in N1 (`fieldOf` + `coverageOf`): three equal
   * weights, Cells per feature 5, a 40×40 grid, averaged over 40 seeds. They
   * do not sum to exactly 100 because each is rounded. Re-measure if the
   * engine's noise changes; nothing here derives them.
   */
  shares: [
    { label: "1", shares: [23, 52, 26] },
    { label: "2", shares: [15, 68, 17] },
    { label: "3", shares: [12, 75, 14] },
  ],
  sharesBy: "Octaves",
  /** "About three times": measured the same way, ends at 3 under Octaves 2 paint 32/32/35. */
  advice:
    "Values below 0.1 or above 0.9 almost never happen, so give the first and last entries more weight if they should show: with 2 octaves, about three times the middle one evens it out.",
  note: "The ≈% belongs to the position in the list, not the tile. Swap two entries of equal weight and the tiles swap places; the shares stay.",
};
