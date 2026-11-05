/**
 * What the operation UI calls the registry's names, and the summary an
 * operation header shows, one cell per step.
 *
 * The registry names (`everyNth`, `cellList`, `scaleX`) stay in the file and in
 * code. The author sees words: Figma names the glyphs "Every Nth", "Handpick",
 * "Checkered". A name with no entry here is title-cased, so a Selection or
 * Source registered later still gets a readable label with no change here
 * (**E9**).
 */

import { isTileMapping, type Operation, type Tile } from "@vit-foundation/gen-tilesets";
import { mappingOf, STEPS, type Draft, type Step } from "../../draft.svelte.js";

const NAMED: Record<string, string> = {
  cellList: "Handpick",
  checkerboard: "Checkered",
  tileId: "Tile",
  valueNoise: "Noise",
};

/** `everyNth` → `Every Nth`, `scaleX` → `Scale X`, with the overrides above. */
export function labelFor(name: string): string {
  const named = NAMED[name];
  if (named !== undefined) return named;
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The parts of an Operation the summary reads, each `null` while unanswered. */
export interface SummaryParts {
  selection: string | null;
  target: string | null;
  mapping: Operation["mapping"] | null;
  source: string | null;
  blend: string | null;
}

/** Shown for a step that has no answer yet. */
export const UNANSWERED = "—";

/**
 * Each step's answer on its own, for the cell above that step's tab:
 * `{ selection: "Checkered", attribute: "Opacity [0.5 - 1]", source: "Random", blend: "Set" }`.
 *
 * A palette lists tile **names**, never ids; an empty entry (`tileId: null`)
 * is "clear", as `PaletteBar` names it. `steps` absent means continuous (§7.4), so only a
 * present one is shown.
 */
export function summaryCells(parts: SummaryParts, tiles: readonly Tile[]): Record<Step, string> {
  const label = (name: string | null): string => (name === null ? UNANSWERED : labelFor(name));
  const attribute =
    parts.target === null
      ? UNANSWERED
      : parts.mapping === null
        ? labelFor(parts.target)
        : `${labelFor(parts.target)} ${mappingText(parts.mapping, tiles)}`;
  return {
    selection: label(parts.selection),
    attribute,
    source: label(parts.source),
    blend: label(parts.blend),
  };
}

/**
 * `04` §3's sentence in step order, as Figma writes it:
 * `Checkered * Opacity [0.5 - 1] * Random * Set`. The cells of `summaryCells`, joined.
 */
export function summarize(parts: SummaryParts, tiles: readonly Tile[]): string {
  const cells = summaryCells(parts, tiles);
  return STEPS.map((step) => cells[step]).join(" * ");
}

function mappingText(mapping: Operation["mapping"], tiles: readonly Tile[]): string {
  if (isTileMapping(mapping)) {
    return `[${mapping.palette.map((e) => tileName(e.tileId, tiles)).join(", ")}]`;
  }
  const [min, max] = mapping.range;
  const steps = mapping.steps === undefined ? "" : ` × ${mapping.steps}`;
  return `[${min} - ${max}]${steps}`;
}

function tileName(id: string | null, tiles: readonly Tile[]): string {
  if (id === null) return "clear";
  return tiles.find((t) => t.id === id)?.name ?? id;
}

/** The summary parts of a committed Operation. */
export function partsOf(op: Operation): SummaryParts {
  return {
    selection: op.selection.type,
    target: op.target,
    mapping: op.mapping,
    source: op.source.type,
    blend: op.blend,
  };
}

/** The summary parts of an open draft. The mapping shows once a Target is chosen. */
export function draftParts(draft: Draft): SummaryParts {
  return {
    selection: draft.selectionType,
    target: draft.target,
    mapping: draft.target === null ? null : mappingOf(draft),
    source: draft.sourceType,
    blend: draft.blend,
  };
}
