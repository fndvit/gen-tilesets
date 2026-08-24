/**
 * Controls generated from a `ParamSchema` — `09-editor.md` §7.1, **E9**.
 *
 * **Invariant E9** — *the mapping from `ParamSpec` to affordance is total. A
 * registered type declaring only a `ParamSchema` gets a working control with no
 * editor code written for it.*
 *
 * `05` §5.1 names `09` as one of three consumers of the parameter schema, and
 * `06` §7.4 gives the encoding as data "specifically so it can be walked rather
 * than only called". So the editor builds a Selection's or Source's controls
 * from its schema and has **no hand-written panel per registered type**.
 *
 * Totality is what makes `05` §3.1's *a new Source is a source file, a table
 * entry, a commit* true in practice: "a mapping with holes means every
 * registered type also requires an editor change, and the extension point is
 * then two changes wearing one name."
 *
 * ## §7.1's table
 *
 * | `ParamSpec`                      | Affordance                                             |
 * | -------------------------------- | ------------------------------------------------------ |
 * | `number` with both bounds        | a slider over the bounds                               |
 * | `number` with one bound or none  | a numeric field                                        |
 * | `integer` with both bounds       | a slider with integer steps, or a stepper where narrow |
 * | `integer` with one bound or none | a numeric field with integer steps                     |
 * | `enum`                           | a segmented control over `values`                      |
 * | `cellList`                       | **not generated** — §7.3                               |
 *
 * The rule is stated at the level of *bounds* rather than as a table of widgets
 * "so a registered type added later gets a working control with nothing written
 * for it".
 *
 * ## The one exception, and why it is not a hole
 *
 * `cellList` is "painted, not generated" (§7.3). `05` §5.1 flags it as "the
 * reason `09` cannot generate every control mechanically", and it is permitted
 * "because the schema names it explicitly rather than because the mapping ran
 * out". It is Step 7's brush.
 *
 * ## `editor.control` hints are not implemented, and cannot break this
 *
 * §7.2 allows a registration to carry `editor: { label, description, control }`.
 * No registration in `packages/tileset` declares one, so nothing is read here.
 * When one arrives, §7.2 fixes the failure mode in advance: "a `control` value
 * the editor does not recognize falls back to the mechanical mapping rather than
 * failing. This is the one place in the package where an unknown name is *not*
 * an error" — because it names an affordance rather than semantics, and an
 * unknown widget hint cannot change the picture.
 */

import type { ParamSpec } from "@fndvit/gen-tilesets";

export type Affordance =
  /** A slider over both bounds. `step` is `1` for an integer. */
  | { kind: "slider"; min: number; max: number; step: number; integer: boolean }
  /** A numeric field. `integer` fixes its step, never its legality. */
  | { kind: "number"; integer: boolean }
  /** A segmented control over `values` — the enum row, and the narrow-integer row. */
  | { kind: "segmented"; values: (string | number)[] }
  /** Not generated. The author paints it (§7.3). */
  | { kind: "cellList" };

/**
 * Where a bounded integer stops being a slider and becomes a stepper.
 *
 * §7.1 says "a slider with integer steps, **or a stepper where narrow**" and
 * does not define narrow. A **UI constant with no authority anywhere**, recorded
 * in `DECISIONS.md` D16. `octaves` is `1–3` and is the only V1 parameter it decides.
 */
const NARROW = 5;

/** Inclusive or exclusive; either end may be absent (`05` §5.1). */
function lowerBound(spec: ParamSpec): number | undefined {
  if (spec.type === "number") return spec.min ?? spec.exclusiveMin;
  if (spec.type === "integer") return spec.min;
  return undefined;
}

function upperBound(spec: ParamSpec): number | undefined {
  if (spec.type === "number") return spec.max ?? spec.exclusiveMax;
  if (spec.type === "integer") return spec.max;
  return undefined;
}

/**
 * **Total.** Every `ParamSpec` the encoding of `06` §7.4 admits returns an
 * affordance, and there is no fallthrough.
 */
export function affordanceFor(spec: ParamSpec): Affordance {
  if (spec.type === "cellList") return { kind: "cellList" };
  if (spec.type === "enum") return { kind: "segmented", values: spec.values };

  const min = lowerBound(spec);
  const max = upperBound(spec);
  const integer = spec.type === "integer";

  // "one bound or none" -- a field, because a slider needs a length.
  if (min === undefined || max === undefined) return { kind: "number", integer };

  // A narrow bounded integer reads better as a stepper than as a slider with
  // three positions. Enumerating it turns it into the segmented row above.
  if (integer && max - min + 1 <= NARROW) {
    const values: number[] = [];
    for (let v = min; v <= max; v++) values.push(v);
    return { kind: "segmented", values };
  }

  return {
    kind: "slider",
    min,
    max,
    // A slider needs a granularity; 100 positions is enough for `density` and
    // costs nothing, and typed entry is exact regardless. A UI constant.
    step: integer ? 1 : (max - min) / 100,
    integer,
  };
}

/**
 * A parameter's default — `05` §5.1, `06` §5.1.
 *
 * §7.1: "Defaults come from the schema. A parameter absent from the file shows
 * its default; **the editor writes it explicitly on save**" (§11.3, `06` §5.1:
 * "the defaults exist so hand-written fixtures stay short, not so saved files
 * can be sparse").
 *
 * Where the schema declares none, this picks the first value the spec admits,
 * because a draft has to hold *something* legal for the preview to keep drawing
 * (**E5**). That choice is the editor's and is not a spec default — it never
 * reaches a file except as a value the author saw in the control and accepted.
 */
export function defaultFor(spec: ParamSpec): string | number {
  if (spec.type === "enum") return spec.default ?? spec.values[0]!;
  if (spec.type === "cellList") return 0; // unused: cellList is not generated
  if (spec.default !== undefined) return spec.default;

  const min = lowerBound(spec);
  const max = upperBound(spec);
  if (min !== undefined) {
    // An exclusive lower bound cannot itself be the value.
    if (spec.type === "number" && spec.min === undefined && spec.exclusiveMin !== undefined) {
      return max === undefined ? min + 1 : (min + max) / 2;
    }
    return min;
  }
  return max ?? 0;
}

/**
 * Whether a value satisfies its spec — the same *refuse, never coerce* rule
 * `fields.ts` applies to the Layout fields (`06` §9.2).
 *
 * Used by the controls to decide whether a typed value may be committed to the
 * draft. `09` §7.5 makes the argument for the authoring ranges and it holds here
 * too: clamping typed input would be coercion "performed in the one place the
 * author is watching".
 */
export function admits(spec: ParamSpec, value: unknown): boolean {
  if (spec.type === "cellList") {
    return (
      Array.isArray(value) &&
      value.every(
        (cell) =>
          Array.isArray(cell) &&
          cell.length === 2 &&
          cell.every((n) => typeof n === "number" && Number.isInteger(n)),
      )
    );
  }

  if (spec.type === "enum") return spec.values.includes(value as string | number);

  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (spec.type === "integer" && !Number.isInteger(value)) return false;

  if (spec.type === "number") {
    if (spec.min !== undefined && value < spec.min) return false;
    if (spec.max !== undefined && value > spec.max) return false;
    if (spec.exclusiveMin !== undefined && value <= spec.exclusiveMin) return false;
    if (spec.exclusiveMax !== undefined && value >= spec.exclusiveMax) return false;
    return true;
  }

  if (spec.min !== undefined && value < spec.min) return false;
  if (spec.max !== undefined && value > spec.max) return false;
  return true;
}
