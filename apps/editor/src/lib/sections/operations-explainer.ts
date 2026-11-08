/**
 * The "How operations work" popover's content — batch 01, T-07 (B-018, B-010),
 * text as Pol approved it in D-04 (A). Data, so `Explainer` stays a frame that
 * knows nothing about operations (`noise-explainer.ts` is the pattern).
 *
 * Each part of an operation is a `params` row. There are no measured figures,
 * so `shares` is empty and `Explainer` draws no bars.
 *
 * The advice answers B-010 (a rotation persists into a later tile operation):
 * that is how the engine composes, each cell keeping what earlier operations
 * wrote (`generate.ts`), so it is explained here rather than changed (T-12).
 */

import type { ExplainerContent } from "../ui/explainer.js";

export const OPERATIONS_EXPLAINER: ExplainerContent = {
  title: "How operations work",
  intro:
    "Operations run in order, from the top of the list to the bottom, and each one runs on every cell. An operation can only change the cells it selects, and a later one paints over what an earlier one wrote.",
  params: [
    {
      name: "Selection",
      text: "Which cells the operation changes: all of them, a checkerboard, a rectangle, every Nth row or column, a random share, or cells you paint by hand.",
    },
    {
      name: "Pattern",
      text: "Gives each selected cell a value: Random, Noise (smooth patches), Gradient (a slope across the selection) or Constant (the same everywhere).",
    },
    {
      name: "Attribute",
      text: "What the value changes: which tile is drawn, or its rotation, scale, offset or opacity.",
    },
    {
      name: "Blend",
      text: "How the value meets what earlier operations wrote: replace it, add to it, or multiply it.",
    },
  ],
  shares: [],
  sharesBy: "",
  advice:
    "A cell keeps everything earlier operations gave it. If an operation rotates a cell and a later one picks its tile, the new tile is drawn rotated. To change that, move the operations or select different cells.",
  note: "The number on a card is its place in the list. Use the ⋯ menu to move an operation earlier or later.",
};
