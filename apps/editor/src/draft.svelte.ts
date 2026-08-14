/**
 * The create-operation draft — `09-editor.md` §4.1, §4.2; `DECISIONS.md` D7.
 *
 * **The draft is transient UI state and is not in the file.** §4.1 puts such
 * state "beside the file, keyed by the identifiers the file already carries",
 * and **E4** forbids parking it in `meta`.
 *
 * ## Why it is not committed step by step
 *
 * **E5** requires every file-touching action to produce a *legal* file, and
 * `09` supplies no default Selection type, Source type, or Target for a new
 * Operation. A half-built Operation is not a legal one, so it cannot be in the
 * file — exactly as "in-flight input lives in the input control and reaches the
 * file only when it parses" (§4.2), applied to a compound value instead of a
 * number.
 *
 * The whole draft therefore commits as **one** `TilesetFile -> TilesetFile`
 * transition when it is complete.
 *
 * ## The id is allocated up front
 *
 * §4.3: an id is "assigned at creation and never reassigned". The draft holds it
 * from the moment it opens, which is what lets Step 8's overlay call
 * `selection()` against a shadow config — `{ ...config, operations: [...ops,
 * draft] }` — since that export resolves an Operation *by id*. A pure local
 * value; it touches no file.
 */

import {
  isAccepted,
  isTileMapping,
  paletteTotal,
  TARGETS,
  type AttributeName,
  type BlendName,
  type NumericMapping,
  type Operation,
  type PaletteEntry,
  type ParamSchema,
  type TargetName,
} from "@tileset/core";
import { defaultFor } from "./controls/affordance.js";
import { defaultNumericMapping, isTileTarget } from "./controls/mapping.js";

/**
 * The four steps, in the order the author walks them.
 *
 * The mapping is folded into the attribute step per §7.4 — "a numeric mapping is
 * two handles on the Target's slider track, and the author never sees the word
 * *mapping*".
 *
 * §7.4's collapse to a single handle under a `constant` Source, and §7.6's
 * advisory about a reordered palette under `random`, both make the attribute
 * step depend on the **Source**, which comes after it. The steps are therefore
 * navigable in any order once opened rather than being a one-way wizard, and the
 * mapping control re-reads the Source whenever it changes (`DECISIONS.md` D8).
 */
export type Step = "selection" | "attribute" | "source" | "blend";

export const STEPS: Step[] = ["selection", "attribute", "source", "blend"];

export interface Draft {
  /** Allocated at creation, never reassigned (§4.3). */
  id: string;
  step: Step;

  /**
   * Carried, not authored — the draft has no control for either.
   *
   * A create-draft holds `06` §5.1's defaults and an **edit**-draft holds
   * whatever the Operation it opened from had, so committing an edit preserves
   * a reroll (§8.3) the author did from the stack row. Writing `0`/`false` here
   * instead would silently undo that reroll on every parameter change, which is
   * `05` §6.1's complaint — a control that appears to do one thing and does
   * another — in the one gesture whose whole point is that it changes nothing
   * else.
   */
  salt: number;
  reseedOnLoad: boolean;
  /** `null` until the author picks one. No default is invented (`DECISIONS.md` D7). */
  selectionType: string | null;
  selectionParams: Record<string, unknown>;
  target: TargetName | null;
  sourceType: string | null;
  sourceParams: Record<string, unknown>;

  /**
   * `null` only while no Target has been chosen, and never after — the Target
   * carries the default (`04` §7.2), so `retarget` fills this in.
   *
   * That is not Q7's invented default. A Selection type, a Source type and a
   * Target have no default *anywhere in the spec*, so choosing one for the
   * author would be the editor deciding what the Operation does. A Blend's
   * default is in `04` §7.2's table, and §7.7 requires it to be *shown*: "for
   * any Target, show the default Blend, and reveal the accepted set only on
   * request".
   */
  blend: BlendName | null;

  /**
   * Both mapping shapes are held, and `target` picks which one is committed.
   *
   * `06` **C8** — "a Mapping's kind is determined by its Operation's `target`.
   * The file carries no kind tag." Keeping both here is a UI convenience only:
   * it lets the author change their mind about the Target and come back without
   * losing the palette they built. Exactly one ever reaches a file.
   */
  numeric: NumericMapping;
  palette: PaletteEntry[];
}

/**
 * Every parameter the schema declares, at its default — `05` §5.1, `06` §5.1.
 *
 * §7.1: "A parameter absent from the file shows its default; the editor writes
 * it explicitly on save." Materializing them here rather than at commit means
 * the control shows what the file will contain, with no gap between the two.
 */
export function defaultParams(schema: ParamSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(schema)) {
    // A `cellList` starts empty and is painted (§7.3, Step 7). `cellList` is the
    // one spec `defaultFor` has no number to give.
    out[name] = spec.type === "cellList" ? [] : defaultFor(spec);
  }
  return out;
}

export function newDraft(id: string): Draft {
  return {
    id,
    step: "selection",
    // `06` §5.1 makes both optional and §11.3 makes the editor write every field
    // explicitly anyway. Step 9's controls are on the stack row, not here.
    salt: 0,
    reseedOnLoad: false,
    selectionType: null,
    selectionParams: {},
    target: null,
    sourceType: null,
    sourceParams: {},
    blend: null,
    // Replaced the moment a numeric Target is chosen -- `defaultNumericMapping`
    // needs to know which attribute's default to use.
    numeric: { range: [0, 0] },
    // `06` §7.3 requires at least one entry with weights summing > 0. `null` is
    // a legal entry meaning *clear this cell* (`04` §6.3), so this is legal even
    // with an empty tile library.
    palette: [{ tileId: null, weight: 1 }],
  };
}

/**
 * Choosing a Target replaces the numeric mapping with one built from **that
 * attribute's** declared default (`03` **D4**), so a freshly targeted Operation
 * is a no-op rather than an immediate flip or fade.
 *
 * ## And it settles the Blend
 *
 * **Invariant O7** — the accepted set is the *Target's*, so a Target change can
 * strand a Blend the new Target does not accept. `multiply` on `scaleX`,
 * retargeted to `rotation`, is exactly `04` §7.2's vetoed pair.
 *
 * A Blend that survives the change is kept, because it is still a choice the
 * author made. One that does not falls back to the Target's declared default,
 * which is the same value a Target chosen for the first time gets. Either way
 * `(target, blend)` is a pair `06` §7 accepts, at every instant — **E5** applied
 * to the draft before it can reach a file.
 *
 * `isAccepted` is asked rather than a table consulted here: ADR-001's point is
 * that a Blend registered later joins every numeric Target at once, and "an
 * editor holding its own table would be the thing that failed to notice"
 * (`09` §7.7).
 */
export function retarget(draft: Draft, target: TargetName): void {
  draft.target = target;
  if (!isTileTarget(target)) draft.numeric = defaultNumericMapping(target as AttributeName);
  if (draft.blend === null || !isAccepted(target, draft.blend)) {
    draft.blend = TARGETS[target].default;
  }
}

/**
 * Whether the draft denotes a whole Operation.
 *
 * The mapping is not listed because it is derived from the Target: `06` **C8**
 * makes a Mapping's kind "determined by its Operation's `target`. The file
 * carries no kind tag." Step 6b adds it to this check.
 *
 * The `(target, blend)` pair is checked "against the table, not against prose"
 * (`06` §7, **O7**). `retarget` already maintains it and the control offers
 * nothing else, so this cannot fire from any gesture the editor has — which is
 * the point: it is the gate, not a second opinion, and a later Step that writes
 * either field inherits it rather than having to remember it.
 */
export function isComplete(draft: Draft): boolean {
  if (
    draft.selectionType === null ||
    draft.target === null ||
    draft.sourceType === null ||
    draft.blend === null
  ) {
    return false;
  }
  if (!isAccepted(draft.target, draft.blend)) return false;
  // `06` §7.3's rules on the mapping shape the Target selects. A palette needs at
  // least one entry and weights summing > 0, or `04` §6.3's walk can never
  // terminate on a winner.
  if (isTileTarget(draft.target)) {
    return draft.palette.length > 0 && paletteTotal(draft.palette) > 0;
  }
  return draft.numeric.range.every((n) => Number.isFinite(n));
}

/** The mapping the draft's Target selects — **C8**, discriminated by `target`. */
export function mappingOf(draft: Draft): Operation["mapping"] {
  return draft.target !== null && isTileTarget(draft.target)
    ? { palette: draft.palette }
    : draft.numeric;
}

/**
 * The draft as an Operation **`selection()` can resolve** — `09` §6.2, and Q7's
 * recorded consequence.
 *
 * The overlay calls `selection()` against a shadow config,
 * `{ ...config, operations: [...operations, shadow] }`, because that export
 * resolves an Operation **by id** and the draft is not in the file yet. "A pure
 * local value; it touches nothing."
 *
 * ## Why this is not `toOperation`
 *
 * The overlay is drawn while the author is on the *Selection* step (§6.1), which
 * is before a Target, a Source, or a mapping exists — so `toOperation` returns
 * `null` for exactly the state the overlay is most needed in. Waiting for
 * completeness would show the author nothing while they were choosing the thing
 * the overlay explains.
 *
 * ## The placeholders are never read, and that is checked rather than assumed
 *
 * `selection()` resolves an Operation and then reads `op.selection`, `op.id`,
 * `op.salt` and `op.reseedOnLoad` — the last two through `operationCtx`, whose
 * closure **O4** fixes at `{rows, columns, effectiveSeed, operationId, salt}`.
 * `target`, `mapping` and `blend` are not on that path. They are filled with the
 * cheapest legal values so the object types, and a change that made the export
 * read one of them would be a change to **O4**'s closed set.
 *
 * **This never reaches a file.** `toOperation` below is the only thing that
 * builds one for committing, and it still refuses an incomplete draft.
 */
export function toShadowOperation(draft: Draft): Operation | null {
  if (draft.selectionType === null) return null;
  return {
    id: draft.id,
    // **Read**, unlike the three placeholders below: `selection()` reaches these
    // through `operationCtx`, whose closure **O4** fixes at `{rows, columns,
    // effectiveSeed, operationId, salt}`. An edit-draft carrying `0` here would
    // draw a `random` Selection's overlay against a salt the committed Operation
    // does not have, so the overlay would disagree with the picture.
    salt: draft.salt,
    reseedOnLoad: draft.reseedOnLoad,
    selection: { type: draft.selectionType, ...draft.selectionParams },
    // Not read by `selection()`. Placeholders, not defaults.
    source: { type: "constant" },
    target: "opacity",
    mapping: { range: [1, 1] },
    blend: "set",
  };
}

/**
 * An existing Operation reopened as a draft — the inverse of `toOperation`.
 *
 * ## Why editing reuses the draft rather than writing to the file directly
 *
 * **E5** requires every file-touching action to produce a legal file, and the
 * intermediate states of an edit are not legal ones: retargeting from `tileId`
 * to `opacity` passes through a moment where the mapping is a palette and the
 * Target wants a range, which `06` **C8** has no way to express. So an edit
 * commits as **one** transition, exactly as a creation does, and the draft is
 * the thing that holds the in-flight compound value in both cases.
 *
 * ## What it preserves
 *
 * The **id** (§4.3 — never reassigned), and through it the Operation's hash
 * channels; its index, which `replaceOperation` maintains; and `salt` /
 * `reseedOnLoad`, which no step of the workflow authors. An edit therefore moves
 * the picture only as much as the edit implies.
 *
 * ## Why the unused mapping slot is not left empty
 *
 * `Draft` holds both mapping shapes and `target` picks which one commits (**C8**
 * again). An Operation carries only one, so the other is seeded from `newDraft`
 * — the same value a fresh draft has. That is what lets the author retarget from
 * `opacity` to `tileId` mid-edit and find a legal palette waiting, rather than
 * an empty one `isComplete` would reject for reasons the panel cannot explain.
 *
 * Parameters are un-spread here: `06` §7.1 spreads them as siblings of `type`,
 * so recovering them is `type` removed and the rest kept. `type` is reserved in
 * the parameter namespace, which is what makes that split unambiguous rather
 * than merely usually-right.
 *
 * ## Nothing here aliases the file
 *
 * The draft is mutated in place — §7.3's brush writes straight into
 * `selectionParams`, and the mapping controls write into `numeric` and
 * `palette`. Every container is therefore copied out of the Operation, not
 * borrowed from it. Sharing one would let a control edit `session.file` without
 * a transition, which is **E3** and **E6** both defeated by an assignment: the
 * picture would move with nothing on the undo stack to move it back.
 *
 * The copies are one level deep, which is the depth the controls write at. A
 * `cellList` is replaced wholesale rather than pushed into (`App.svelte`'s
 * `paintCells`), so its array is not shared even though this does not clone it.
 */
export function fromOperation(op: Operation): Draft {
  const fresh = newDraft(op.id);
  const { type: selectionType, ...selectionParams } = op.selection;
  const { type: sourceType, ...sourceParams } = op.source;
  const mapping = op.mapping;
  return {
    ...fresh,
    salt: op.salt ?? 0,
    reseedOnLoad: op.reseedOnLoad === true,
    selectionType,
    selectionParams,
    sourceType,
    sourceParams,
    target: op.target,
    blend: op.blend,
    numeric: isTileMapping(mapping)
      ? fresh.numeric
      : { ...mapping, range: [mapping.range[0], mapping.range[1]] },
    palette: isTileMapping(mapping) ? mapping.palette.map((entry) => ({ ...entry })) : fresh.palette,
  };
}

/**
 * The draft as the `Operation` it denotes — `04` §3, `06` §7.
 *
 * Parameters are **spread siblings of `type`** (`06` §7.1): "spread where the
 * schema knows the keys. Nest where it does not." `type` is reserved in the
 * parameter namespace, so no registered type may declare a parameter called
 * `type` and the collision is unstateable rather than merely unlikely.
 */
export function toOperation(draft: Draft): Operation | null {
  if (!isComplete(draft)) return null;
  const mapping = mappingOf(draft);
  return {
    id: draft.id,
    salt: draft.salt,
    reseedOnLoad: draft.reseedOnLoad,
    selection: { type: draft.selectionType!, ...draft.selectionParams },
    source: { type: draft.sourceType!, ...draft.sourceParams },
    target: draft.target!,
    mapping,
    blend: draft.blend!,
  };
}
