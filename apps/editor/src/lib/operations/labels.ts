/**
 * What the operation UI calls the registry's names, and the summary an
 * operation header shows, one cell per step.
 *
 * The registry names (`everyNth`, `cellList`, `scaleX`) stay in the file and in
 * code. The author sees words: Figma names the glyphs "Handpick" and
 * "Checkered". `rect` reads "Drag" (Pol, batch 02): the label names the
 * gesture that sets it, so the picker tells the author they can drag on the
 * preview; "Rect" named the shape and hid that.
 *
 * A name with no entry here is put in sentence case, so a Selection, Source or
 * param registered later still gets a readable label with no change here
 * (**E9**).
 */

import {
  isTileMapping,
  selections,
  type Operation,
  type ParamSpec,
  type Tile,
} from "@vit-foundation/gen-tilesets";
import { constantEntry } from "../../controls/palette.js";
import { mappingOf, STEPS, type Draft, type DraftLayer, type Step } from "../../draft.svelte.js";
import { rectParams } from "../../paint.js";

const NAMED: Record<string, string> = {
  cellList: "Handpick",
  checkerboard: "Checkered",
  // Sentence case gives "Every nth"; Pol asked for "Every Nth" (B-009), the one
  // name that overrides N3's plain sentence case below.
  everyNth: "Every Nth",
  rect: "Drag",
  // Sentence case gives "Row column", which reads as one thing; the slash says
  // it is one or the other, which is what its `axis` picks (B-009).
  rowColumn: "Row/Column",
  tileId: "Tile",
  valueNoise: "Noise",
};

/**
 * `cellsPerFeature` → `Cells per feature`, with the overrides above.
 *
 * Plain sentence case, with no exceptions (Pol, N3): `scaleX` → `Scale x`.
 * Keeping a one-letter word uppercase was offered and turned down, because one
 * rule is easier to predict than a rule with cases. "Every Nth" is not an
 * exception to the rule: it is a name in `NAMED` (B-009).
 */
export function labelFor(name: string): string {
  const named = NAMED[name];
  if (named !== undefined) return named;
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
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
  /** The selection's layer types, in order; empty while none is chosen (B-033). */
  selection: readonly string[];
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
    // Several layers read as one answer: "Drag + Random" (B-033).
    selection: parts.selection.length === 0 ? UNANSWERED : parts.selection.map(labelFor).join(" + "),
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
    selection: op.selection.map((layer) => layer.type),
    target: op.target,
    mapping: op.mapping,
    source: op.source.type,
    blend: op.blend,
  };
}

/** The summary parts of an open draft. The mapping shows once a Target is chosen. */
export function draftParts(draft: Draft): SummaryParts {
  return {
    selection: draft.layers.flatMap((layer) => (layer.type === null ? [] : [layer.type])),
    target: draft.target,
    mapping: draft.target === null ? null : mappingOf(draft),
    source: draft.sourceType,
    blend: draft.blend,
  };
}

/**
 * A selection layer's settings in a few words, for its row in the Selection
 * step (B-033, Block 3): `"3×2 at 0,0"`, `"5 cells"`, `"30%"`, `"every 3rd"`.
 *
 * **Driven by the parameters, not by the type's name**, so a Selection
 * registered later still gets a summary with no change here (**E9**):
 * - a `cellList` parameter counts its cells;
 * - the rectangle shape (`rectParams`, the one the preview drag recognises)
 *   reads as size and corner;
 * - a number on `[0, 1]` reads as a percentage, the way a density is thought of;
 * - anything else reads as `"name value"` pairs (`"parity 0"`).
 *
 * The two "every Nth" types are worded by name in `NTH_WORDING`, the way
 * `NAMED` words labels: "n 3, offset 0" is exact but reads as code. A layer
 * with no parameters (All) has nothing to add, so `""`; one with no type yet
 * reads `"choose…"`.
 */
export function layerSummary(layer: DraftLayer): string {
  if (layer.type === null) return "choose…";
  const schema = selections.get(layer.type).params;
  const p = layer.params;
  const worded = NTH_WORDING[layer.type]?.(p);
  if (worded !== undefined) return worded;
  if (rectParams(schema)) return `${p.width}×${p.height} at ${p.x},${p.y}`;
  return Object.entries(schema)
    .map(([name, spec]) => paramText(name, spec, p[name]))
    .join(", ");
}

/** One parameter's words: a count, a percentage, or `"name value"`. */
function paramText(name: string, spec: ParamSpec, value: unknown): string {
  if (spec.type === "cellList") {
    const n = Array.isArray(value) ? value.length : 0;
    return n === 1 ? "1 cell" : `${n} cells`;
  }
  if (spec.type === "number" && spec.min === 0 && spec.max === 1 && typeof value === "number") {
    return `${Math.round(value * 1000) / 10}%`;
  }
  return `${labelFor(name).toLowerCase()} ${String(value)}`;
}

/**
 * The "every Nth" Selections, worded: `"every 3rd"`, `"every 2nd column"`, and
 * `"every cell"` / `"every row"` at N = 1. A non-zero offset is appended, since
 * it moves which cells are picked.
 */
const NTH_WORDING: Record<string, (p: Record<string, unknown>) => string> = {
  everyNth: (p) => `${every(p.n, "cell")}${offsetText(p.offset)}`,
  rowColumn: (p) => `${every(p.n, String(p.axis))}${offsetText(p.offset)}`,
};

function every(n: unknown, unit: string): string {
  if (n === 1) return `every ${unit}`;
  const tail = unit === "cell" ? "" : ` ${unit}`;
  return `every ${typeof n === "number" ? ordinal(n) : String(n)}${tail}`;
}

function offsetText(offset: unknown): string {
  return offset === 0 || offset === undefined ? "" : `, offset ${String(offset)}`;
}

/** `1st`, `2nd`, `3rd`, `4th`, `11th`, `12th`, `13th`, `21st`. */
function ordinal(n: number): string {
  const teen = Math.abs(n) % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][Math.abs(n) % 10] ?? "th"}`;
}

/**
 * The Selection step's answer on its row while a layer is still untyped:
 * `"Drag + not set"`, in layer order. `null` when no layer has a type (the row
 * says "Not set") or when every layer has one (`summaryCells` answers).
 */
export function partialSelection(draft: Draft): string | null {
  const typed = draft.layers.filter((layer) => layer.type !== null).length;
  if (typed === 0 || typed === draft.layers.length) return null;
  return draft.layers.map((layer) => (layer.type === null ? "not set" : labelFor(layer.type))).join(" + ");
}

/**
 * Which layers have no type, for Save's hint: `"layer 2 has no type"`,
 * `"layers 2 and 3 have no type"`. `null` while there is only one layer, where
 * "Selection" alone already says it.
 */
export function untypedLayers(draft: Draft): string | null {
  if (draft.layers.length < 2) return null;
  const open = draft.layers.flatMap((layer, i) => (layer.type === null ? [i + 1] : []));
  if (open.length === 0) return null;
  if (open.length === 1) return `layer ${open[0]} has no type`;
  return `layers ${open.slice(0, -1).join(", ")} and ${open.at(-1)} have no type`;
}
