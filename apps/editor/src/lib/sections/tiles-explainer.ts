/**
 * The "How tiles work" popover's content — batch 03, T-03 (B-025), text as
 * Pol approved it in D-01 ("picture" becomes "asset"; the formats and the
 * recommended size added). Data, so `Explainer` stays a frame that knows
 * nothing about tiles (`operations-explainer.ts` is the pattern).
 *
 * The formats are the ones the editor knows by name when it reads a tileset
 * zip back (`mimeOf` in `import.ts`). Upload… accepts any `image/*`, but only
 * these are promised, so only these are named. No size
 * was recommended anywhere before this: "twice the largest cell" is what keeps
 * an asset sharp at a device pixel ratio of 2.
 *
 * There are no measured figures, so `shares` is empty. D-01 has no note, so
 * `note` is empty and `Explainer` draws no hairline for it.
 */

import type { ExplainerContent } from "../ui/explainer.js";

export const TILES_EXPLAINER: ExplainerContent = {
  title: "How tiles work",
  intro:
    "Tiles are the assets the tileset is drawn with. They come in tile groups: operations choose a group, and each cell then shows one of that group's assets.",
  params: [
    {
      name: "Adding tiles",
      text: "Press + to open the tile gallery and pick from My tiles or the editor's collection; Upload… adds your own assets. You can also drop image files here: on the section to make a new group, on a group to add to it. Assets can be PNG, JPEG, WebP, AVIF, GIF or SVG. Use square assets at least twice your largest cell size, so they stay sharp on high-resolution screens; SVG stays sharp at any size.",
    },
    {
      name: "Tile groups",
      text: "A group is one tile with one or more variants. Operations choose the group, never one asset, so changing a group's variants changes every cell that uses it. A group an operation still uses can't be deleted.",
    },
    {
      name: "Weights",
      text: "A variant's weight sets how often it shows within its group; the percentage beside it is its share. Weight 0 never shows it. Reset weights makes them equal again.",
    },
  ],
  shares: [],
  sharesBy: "",
  advice:
    "Reroll assets, in Randomness, only swaps assets within each tile group; it never changes which group a cell has.",
  note: "",
};
