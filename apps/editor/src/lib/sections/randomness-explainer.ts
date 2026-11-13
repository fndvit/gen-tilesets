/**
 * The "How randomness works" popover's content — batch 01, T-07 (B-019), text
 * as Pol approved it in D-04 (A). Data, so `Explainer` stays a frame
 * (`noise-explainer.ts` is the pattern).
 *
 * Each control that draws again is a `params` row, named as the editor labels
 * it. There are no measured figures, so `shares` is empty and `Explainer`
 * draws no bars.
 */

import type { ExplainerContent } from "../ui/explainer.js";

export const RANDOMNESS_EXPLAINER: ExplainerContent = {
  title: "How randomness works",
  intro: "Everything random in the tileset follows from one seed. The same seed always gives the same picture.",
  params: [
    { name: "Seed", text: "Changes every operation at once. Type any word, or press New seed." },
    {
      name: "Re-seed (on an operation's card)",
      text: "New random values for that one operation. The others stay as they are.",
    },
    {
      name: "Reroll assets",
      text: "When a tile has several pictures, picks other pictures for the same cells. No operation changes.",
    },
    {
      name: "Assets on load / Reseed on load",
      text: "Make every visit to the page different. Assets on load picks other pictures on each load; an operation's Reseed on load gives it new values on each load.",
    },
  ],
  shares: [],
  sharesBy: "",
  advice: "Preview a fresh load shows what another visitor could see. It changes nothing in the file.",
  note: "Seeds and re-seeds are saved in the file, so the tileset looks the same wherever it is used, unless something reseeds on load.",
};
