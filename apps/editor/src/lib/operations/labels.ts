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
import { constantEntry } from "../../controls/palette.js";
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

/**
 * What a **step** is called, which is not what its registry name would label.
 *
 * Kept apart from `NAMED` on purpose: `NAMED` maps registry names, and a Source
 * registered later under the name `source` would be mislabelled "Pattern" if
 * the step's label lived there. The step's key stays `source` because it is the
 * file's `op.source`; the author sees "Pattern" (Pol, T0).
 */
export const STEP_LABELS: Record<Step, string> = {
  selection: "Selection",
  source: "Pattern",
  attribute: "Attribute",
  blend: "Blend",
};

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
 * `{ selection: "Checkered", source: "Random", attribute: "Opacity [0.5 - 1]", blend: "Set" }`.
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
        : `${labelFor(parts.target)} ${mappingText(painting(parts.mapping, parts.source), tiles)}`;
  return {
    selection: label(parts.selection),
    source: label(parts.source),
    attribute,
    blend: label(parts.blend),
  };
}

/**
 * The Operation in step order: `Checkered * Random * Opacity [0.5 - 1] * Set`. The cells of `summaryCells`, joined.
 */
export function summarize(parts: SummaryParts, tiles: readonly Tile[]): string {
  const cells = summaryCells(parts, tiles);
  return STEPS.map((step) => cells[step]).join(" * ");
}

/**
 * What an operation writes, for the title line of its card: the Target, and
 * the mapping's detail beside it. The card leads with this because it is what
 * the operation *does*; where and how come second (iteration 2).
 *
 * - A tile mapping: `detail` lists the palette's tile names (`"Pink, clear"`),
 *   and `tileIds` the entries in order, for thumbnails (`null` is clear).
 * - A numeric mapping: `detail` is the range, `"0.5 – 1"`, with its steps
 *   (`"0 – 270 · 4 steps"`), and `tileIds` is empty.
 *
 * `null` while no Target is chosen.
 */
export interface Writes {
  target: string;
  detail: string;
  tileIds: (string | null)[];
}

export function writesOf(parts: SummaryParts, tiles: readonly Tile[]): Writes | null {
  if (parts.target === null) return null;
  const target = labelFor(parts.target);
  const mapping = painting(parts.mapping, parts.source);
  if (mapping === null) return { target, detail: "", tileIds: [] };
  if (isTileMapping(mapping)) {
    return {
      target,
      detail: mapping.palette.map((e) => tileName(e.tileId, tiles)).join(", "),
      tileIds: mapping.palette.map((e) => e.tileId),
    };
  }
  const [min, max] = mapping.range;
  const range = min === max ? `${min}` : `${min} – ${max}`;
  const steps = mapping.steps === undefined ? "" : ` · ${mapping.steps} steps`;
  return { target, detail: `${range}${steps}`, tileIds: [] };
}

/** The Attribute step's answer as one line: `"Tile · Pink, Blue"`, `"Opacity · 0.5 – 1"`. */
export function writesText(writes: Writes | null): string {
  if (writes === null) return UNANSWERED;
  return writes.detail === "" ? writes.target : `${writes.target} · ${writes.detail}`;
}

/**
 * The mapping as it paints. Under `constant` only one tile entry ever paints
 * (`constantEntry`), and Save writes only that one (`mappingOf`). A file saved
 * before T3 can still hold the others; the card names what the operation
 * *does*, so it drops them too (Pol, T4) rather than listing tiles that never
 * appear. A palette with no weight (`-1`, which `06` §7.3 forbids) is shown as
 * written.
 */
function painting<M extends Operation["mapping"] | null>(mapping: M, source: string | null): M {
  if (mapping === null || source !== "constant" || !isTileMapping(mapping)) return mapping;
  const at = constantEntry(mapping.palette);
  return at < 0 ? mapping : { ...mapping, palette: [mapping.palette[at]!] };
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
