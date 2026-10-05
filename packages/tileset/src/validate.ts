/**
 * Validation — `06-config-schema.md` §5–§10.
 *
 * **Invariant C5** — validation is a separate function. `generate()` trusts its
 * input and its behaviour on an unvalidated config is undefined. Validity is a
 * property of the config and the config does not change between generations, so
 * folding this into `generate()` would pay an `O(config)` cost per
 * `O(rows × columns × operations)` call, on every resize, every reroll, every
 * frame of an editor preview.
 *
 * **Invariant C6** — errors only. No warnings, no severity axis, no partial
 * validity. `06` §10.4's four legal-but-suspicious configs are advisories and
 * belong to `09`; three of them are already built there.
 *
 * **It takes a parsed value, not text.** JSON syntax errors belong to whoever
 * called `JSON.parse`. That matters more than it sounds: the editor holds a live
 * `TilesetFile` in memory and validates it continuously, and an in-memory value
 * can hold what JSON cannot — `NaN`, `Infinity`, a function. Finiteness is
 * therefore checked rather than assumed from the value having come out of a
 * file. (`03` **D6** guards *computed* attribute values at the far end of the
 * pipeline; this guards authored ones.)
 *
 * ## Everything is checked; nothing is coerced
 *
 * **§9.2** — no clamping, no rounding, no truncation, no substituting a default
 * for a value that is present but wrong. Absent-with-a-declared-default is not
 * coercion, because nothing was rewritten: "coercion changes what the author
 * wrote, defaults supply what they did not write."
 *
 * ## Why it collects rather than throws
 *
 * `09` highlights every offending field at once. A validator that threw on the
 * first problem would make the editor's error list a function of key order.
 */

import { acceptedBlends, TARGETS } from "./registry/blends.js";
import type { ParamSchema, ParamSpec } from "./registry/registry.js";
import { selections } from "./registry/selections.js";
import { sources } from "./registry/sources.js";
import { activeRules, bandWidths, ruleOverride } from "./responsive.js";
import {
  coordinateBoundMessage,
  coordinateBoundOperations,
  reshape,
  SHAPE_FIELDS,
  shapeFieldProblem,
} from "./shape.js";
import type { Operation, TargetName, TilesetFile } from "./types.js";

/**
 * `06` §10.2, **C7**.
 *
 * `path` is an RFC 6901 JSON Pointer rather than a dotted path because arrays
 * are everywhere in this file — `operations`, `tiles`, `assets`, `palette`,
 * `range`, `cells` — and the pointer syntax indexes them without inventing a
 * convention. `/operations/2/mapping/range/1` locates a control; *"the second
 * range value in operation 3"* requires parsing English and counting from one.
 *
 * `message` is **not part of the contract** and may change freely. Branch on
 * `code`: matching on prose makes every reworded message a silent behaviour
 * change in a different package.
 */
export interface ValidationError {
  path: string;
  code: ErrorCode;
  message: string;
}

/**
 * `06` §10.3's V1 codes.
 *
 * The list is not closed — a new rule brings a new code — but a **published code
 * is never reassigned to different semantics** (`05` **X8** one level down). A
 * recycled code still matches and still branches, and sends `09`'s repair
 * affordance to the wrong field.
 */
export type ErrorCode =
  | "SCHEMA_VERSION_MISSING"
  | "SCHEMA_VERSION_UNKNOWN"
  | "MISSING_KEY"
  | "UNKNOWN_KEY"
  | "TYPE_MISMATCH"
  | "NOT_AN_INTEGER"
  | "NOT_FINITE"
  | "OUT_OF_RANGE"
  | "INVALID_IDENTIFIER"
  | "DUPLICATE_ID"
  | "EMPTY_ASSET_LIST"
  | "ZERO_WEIGHT_SUM"
  | "DANGLING_TILE_REF"
  | "UNKNOWN_TYPE_NAME"
  | "INVALID_TARGET_BLEND"
  | "COORDINATE_BOUND_RESIZE";

/** The one version this build knows — `06` §4.1, **C2**. 4 since 0.8.0 (`translateX`/`translateY`); 3 was 0.7.0 (`responsive`); 2 was ADR-005. */
export const SCHEMA_VERSION = 4;

/** `06` §5.3, **C10**. Excludes `:`, which `04` §4.3 concatenates with. */
const IDENTIFIER = /^[A-Za-z0-9_-]+$/;

/** `06` §5.2, **C9** — the salts' domain. */
const UINT32_MAX = 2 ** 32;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * RFC 6901 escaping: `~` becomes `~0` and `/` becomes `~1`, in that order.
 *
 * Reachable in V1 through an unknown key, since `06` §9.1 reports the key that
 * was not recognized and nothing constrains what an author may type. Doing it in
 * the other order would turn a literal `/` into `~1` and then into `~01`.
 */
function escape(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function at(path: string, ...tokens: (string | number)[]): string {
  return tokens.reduce<string>(
    (acc, token) => `${acc}/${typeof token === "number" ? token : escape(token)}`,
    path,
  );
}

// ---------------------------------------------------------------------------
// The collector
// ---------------------------------------------------------------------------

class Errors {
  readonly list: ValidationError[] = [];

  add(path: string, code: ErrorCode, message: string): void {
    this.list.push({ path, code, message });
  }

  /** Convenience for the commonest pair. Returns whether the type matched. */
  typed(path: string, value: unknown, expected: string, ok: boolean): boolean {
    if (!ok) this.add(path, "TYPE_MISMATCH", `expected ${expected}, got ${describe(value)}`);
    return ok;
  }
}

/** For messages only — never branched on. `null` is called out because §5.1 does. */
function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * A finite number. **`NaN` and `Infinity` are `NOT_FINITE`, not
 * `TYPE_MISMATCH`** — they *are* numbers, and §10 asks for them by name because
 * an in-memory config can hold them.
 */
function finite(e: Errors, path: string, value: unknown, what: string): value is number {
  if (!e.typed(path, value, what, typeof value === "number")) return false;
  if (!Number.isFinite(value)) {
    e.add(path, "NOT_FINITE", `${what} must be finite, got ${String(value)}`);
    return false;
  }
  return true;
}

/**
 * §5.2 — "a JSON number with no fractional part, within the safe-integer range".
 * A fractional value is an error, **never a truncation**: `salt: 0` and
 * `salt: 0.5` are the same input to every consumer, and the failure that
 * produces — the reroll button that visibly changes the file and does not change
 * the picture — is catchable only here.
 */
function integer(e: Errors, path: string, value: unknown, what: string): value is number {
  if (!finite(e, path, value, what)) return false;
  if (!Number.isSafeInteger(value)) {
    e.add(path, "NOT_AN_INTEGER", `${what} must be an integer, got ${String(value)}`);
    return false;
  }
  return true;
}

function inRange(
  e: Errors,
  path: string,
  value: number,
  what: string,
  test: boolean,
  bound: string,
): boolean {
  if (!test) e.add(path, "OUT_OF_RANGE", `${what} must be ${bound}, got ${String(value)}`);
  return test;
}

/** §5.2, **C9** — an integer in `[0, 2³²)`. */
function uint32(e: Errors, path: string, value: unknown, what: string): void {
  if (!integer(e, path, value, what)) return;
  inRange(e, path, value, what, value >= 0 && value < UINT32_MAX, "in [0, 2^32)");
}

function identifier(e: Errors, path: string, value: unknown, what: string): string | null {
  if (!e.typed(path, value, `${what} as a string`, typeof value === "string")) return null;
  if (!IDENTIFIER.test(value as string)) {
    e.add(path, "INVALID_IDENTIFIER", `${what} must match [A-Za-z0-9_-]+, got ${JSON.stringify(value)}`);
    return null;
  }
  return value as string;
}

/**
 * §9.1, **C4** — an unrecognized key is an error **at every depth**, and `meta`
 * is the sole exception (validated as an object, contents uninspected).
 *
 * The failure this prevents: `"opactiy": 0.5` in a mapping loads cleanly under a
 * permissive schema, the key is discarded, opacity stays at its default, and the
 * author is looking at a picture that does not match the file they just wrote,
 * with no error anywhere.
 */
function unknownKeys(e: Errors, path: string, object: Record<string, unknown>, known: string[]): void {
  for (const key of Object.keys(object)) {
    if (!known.includes(key)) {
      e.add(at(path, key), "UNKNOWN_KEY", `unrecognized key ${JSON.stringify(key)}`);
    }
  }
}

/**
 * A required key, present and not `undefined`.
 *
 * §5.1 — "**`null` is never a way to write 'absent'.**" A key present with a
 * `null` value is therefore *present*, and falls through to the type check that
 * reports `TYPE_MISMATCH`. Only a palette entry's `tileId` accepts it.
 */
function required(e: Errors, path: string, object: Record<string, unknown>, key: string): boolean {
  if (object[key] === undefined) {
    e.add(at(path, key), "MISSING_KEY", `required key ${JSON.stringify(key)} is absent`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Parameter schemas — §7.4
// ---------------------------------------------------------------------------

/**
 * One parameter against its `ParamSpec`.
 *
 * The schema is **data** (§7.4) precisely so this can walk it: "a function can
 * be called but not walked", and three consumers read it where only one runs it.
 */
function param(e: Errors, path: string, spec: ParamSpec, value: unknown): void {
  switch (spec.type) {
    case "number": {
      if (!finite(e, path, value, "a number")) return;
      const v = value;
      if (spec.min !== undefined) inRange(e, path, v, "value", v >= spec.min, `>= ${spec.min}`);
      if (spec.max !== undefined) inRange(e, path, v, "value", v <= spec.max, `<= ${spec.max}`);
      if (spec.exclusiveMin !== undefined) {
        inRange(e, path, v, "value", v > spec.exclusiveMin, `> ${spec.exclusiveMin}`);
      }
      if (spec.exclusiveMax !== undefined) {
        inRange(e, path, v, "value", v < spec.exclusiveMax, `< ${spec.exclusiveMax}`);
      }
      return;
    }
    case "integer": {
      if (!integer(e, path, value, "an integer")) return;
      const v = value;
      if (spec.min !== undefined) inRange(e, path, v, "value", v >= spec.min, `>= ${spec.min}`);
      if (spec.max !== undefined) inRange(e, path, v, "value", v <= spec.max, `<= ${spec.max}`);
      return;
    }
    case "enum": {
      // Not TYPE_MISMATCH: the admissible set is the constraint, and a string
      // outside it and a number outside it are the same mistake.
      if (!spec.values.includes(value as string | number)) {
        e.add(
          path,
          "OUT_OF_RANGE",
          `must be one of ${spec.values.map((v) => JSON.stringify(v)).join(", ")}`,
        );
      }
      return;
    }
    case "cellList": {
      // `05` §5.1's list type: a list of `[x, y]` integer pairs. §7.3 makes it
      // the one parameter `09` cannot build a control for mechanically, which is
      // about authoring rather than about its shape.
      if (!e.typed(path, value, "an array of [x, y] pairs", Array.isArray(value))) return;
      (value as unknown[]).forEach((cell, i) => {
        const cellPath = at(path, i);
        if (!e.typed(cellPath, cell, "a pair [x, y]", Array.isArray(cell) && cell.length === 2)) {
          return;
        }
        (cell as unknown[]).forEach((n, j) => integer(e, at(cellPath, j), n, "a coordinate"));
      });
      return;
    }
  }
}

/**
 * A tagged object's parameters — §7.1's spread siblings of `type`.
 *
 * "**Spread where the schema knows the keys. Nest where it does not.**" The
 * registry declares them, so they are checked exactly, and an absent parameter
 * with a registry default is absent-not-wrong (§5.1's last row).
 */
function taggedParams(
  e: Errors,
  path: string,
  object: Record<string, unknown>,
  schema: ParamSchema,
): void {
  unknownKeys(e, path, object, ["type", ...Object.keys(schema)]);
  for (const [name, spec] of Object.entries(schema)) {
    const value = object[name];
    // Absent is legal where the registry declares a default, and `cellList` has
    // no `default` field at all — an absent one is the empty list, which is what
    // a freshly created painted Selection is.
    if (value === undefined) {
      const optional = spec.type === "cellList" || spec.default !== undefined;
      if (!optional) {
        e.add(at(path, name), "MISSING_KEY", `required parameter ${JSON.stringify(name)} is absent`);
      }
      continue;
    }
    param(e, at(path, name), spec, value);
  }
}

/**
 * A `Selection` or a `Source` — the recursive tagged shape of `04` §4.5.
 *
 * `UNKNOWN_TYPE_NAME` is `05` **X7**'s load failure expressed as a validation
 * error, "and that is the whole of X7's enforcement: the engine never
 * substitutes a default because it never sees the config at all."
 */
function tagged(
  e: Errors,
  path: string,
  value: unknown,
  kind: "selection" | "source",
): void {
  if (!e.typed(path, value, `a ${kind} object`, isObject(value))) return;
  const object = value as Record<string, unknown>;
  if (!required(e, path, object, "type")) return;
  const typePath = at(path, "type");
  if (!e.typed(typePath, object.type, "a type name", typeof object.type === "string")) return;

  const registry = kind === "selection" ? selections : sources;
  const name = object.type as string;
  if (!registry.has(name)) {
    e.add(typePath, "UNKNOWN_TYPE_NAME", `no ${kind} registered as ${JSON.stringify(name)}`);
    // The parameters cannot be checked without a schema, and guessing one would
    // be the substitution X7 exists to refuse. The unknown key rule is skipped
    // with it, deliberately: reporting every parameter as unrecognized would
    // bury the one error that matters.
    return;
  }
  taggedParams(e, path, object, registry.get(name).params);
}

// ---------------------------------------------------------------------------
// Mapping — §7.3, C8
// ---------------------------------------------------------------------------

/**
 * The mapping the Operation's `target` selects. **C8** — "a Mapping's kind is
 * determined by its Operation's `target`. The file carries no kind tag."
 *
 * So a numeric mapping carrying `palette` is not a *wrong kind* error: it is an
 * unknown key at `/mapping/palette` and a missing key at `/mapping/range`, which
 * between them say precisely what is wrong. That falls out of validating against
 * the selected shape strictly, rather than being arranged for.
 */
function mapping(
  e: Errors,
  path: string,
  value: unknown,
  target: TargetName | null,
  tileIds: Set<string>,
): void {
  if (!e.typed(path, value, "a mapping object", isObject(value))) return;
  // Without a legal target there is no shape to check against — C8 leaves the
  // kind undetermined, and the target's own error is already reported.
  if (target === null) return;
  const object = value as Record<string, unknown>;

  if (TARGETS[target].type === "tile") {
    unknownKeys(e, path, object, ["palette"]);
    if (!required(e, path, object, "palette")) return;
    palette(e, at(path, "palette"), object.palette, tileIds);
    return;
  }

  unknownKeys(e, path, object, ["range", "steps"]);
  if (required(e, path, object, "range")) {
    const rangePath = at(path, "range");
    const range = object.range;
    if (e.typed(rangePath, range, "a two-element range", Array.isArray(range) && range.length === 2)) {
      // `min > max` is legal and reverses the map (`04` §6.2), so there is no
      // ordering check here. Only finiteness.
      (range as unknown[]).forEach((n, i) => finite(e, at(rangePath, i), n, "a range endpoint"));
    }
  }
  // Absent is a *meaning* — continuous, not stepped — which is why §5.1 gives it
  // no default value and why this is not a MISSING_KEY.
  if (object.steps !== undefined) {
    const stepsPath = at(path, "steps");
    if (integer(e, stepsPath, object.steps, "steps")) {
      // >= 2 because the stepped formula divides by `steps - 1` (`04` §6.2).
      inRange(e, stepsPath, object.steps as number, "steps", (object.steps as number) >= 2, ">= 2");
    }
  }
}

function palette(e: Errors, path: string, value: unknown, tileIds: Set<string>): void {
  if (!e.typed(path, value, "a palette array", Array.isArray(value))) return;
  const entries = value as unknown[];
  if (entries.length === 0) {
    // `04` §6.3's walk can never terminate on a winner without one entry.
    e.add(path, "OUT_OF_RANGE", "a palette needs at least one entry");
    return;
  }

  let total = 0;
  let summable = true;
  entries.forEach((entry, i) => {
    const entryPath = at(path, i);
    if (!e.typed(entryPath, entry, "a palette entry", isObject(entry))) {
      summable = false;
      return;
    }
    const object = entry as Record<string, unknown>;
    unknownKeys(e, entryPath, object, ["tileId", "weight"]);

    if (required(e, entryPath, object, "tileId")) {
      const idPath = at(entryPath, "tileId");
      // **The one place `null` is a value rather than an error** (§5.1, §7.3):
      // it means *clear this cell* (`02` §8.1, `04` §6.3).
      if (object.tileId !== null) {
        const id = identifier(e, idPath, object.tileId, "a tile reference");
        if (id !== null && !tileIds.has(id)) {
          e.add(idPath, "DANGLING_TILE_REF", `no Tile in the library has id ${JSON.stringify(id)}`);
        }
      }
    }

    if (required(e, entryPath, object, "weight")) {
      const weightPath = at(entryPath, "weight");
      if (finite(e, weightPath, object.weight, "a weight")) {
        const w = object.weight as number;
        if (inRange(e, weightPath, w, "a weight", w >= 0, ">= 0")) total += w;
        else summable = false;
      } else {
        summable = false;
      }
    } else {
      summable = false;
    }
  });

  // Only asserted where every weight was legal — otherwise this fires as a
  // second complaint about a value already reported, at a path the author
  // cannot act on.
  if (summable && total <= 0) {
    e.add(path, "ZERO_WEIGHT_SUM", "a palette's weights must sum to more than zero");
  }
}

// ---------------------------------------------------------------------------
// Tiles — §6
// ---------------------------------------------------------------------------

function tile(e: Errors, path: string, value: unknown, seen: Set<string>): string | null {
  if (!e.typed(path, value, "a Tile object", isObject(value))) return null;
  const object = value as Record<string, unknown>;
  unknownKeys(e, path, object, ["id", "name", "assets"]);

  let id: string | null = null;
  if (required(e, path, object, "id")) {
    id = identifier(e, at(path, "id"), object.id, "a Tile id");
    if (id !== null) {
      if (seen.has(id)) {
        e.add(at(path, "id"), "DUPLICATE_ID", `Tile id ${JSON.stringify(id)} is used more than once`);
      }
      seen.add(id);
    }
  }

  // Unconstrained by **C10** — not unique, not charset-limited, possibly empty.
  // **D1** guarantees a name collision cannot reach output, so the only cost is
  // authoring clarity and that is `09`'s problem.
  if (required(e, path, object, "name")) {
    e.typed(at(path, "name"), object.name, "a name string", typeof object.name === "string");
  }

  if (required(e, path, object, "assets")) assets(e, at(path, "assets"), object.assets);
  return id;
}

function assets(e: Errors, path: string, value: unknown): void {
  if (!e.typed(path, value, "an assets array", Array.isArray(value))) return;
  const list = value as unknown[];
  if (list.length === 0) {
    e.add(path, "EMPTY_ASSET_LIST", "a Tile needs at least one TileAsset (03 §4.1)");
    return;
  }

  const seen = new Set<string>();
  let total = 0;
  let summable = true;
  list.forEach((asset, i) => {
    const assetPath = at(path, i);
    if (!e.typed(assetPath, asset, "a TileAsset object", isObject(asset))) {
      summable = false;
      return;
    }
    const object = asset as Record<string, unknown>;
    unknownKeys(e, assetPath, object, ["id", "weight", "meta"]);

    if (required(e, assetPath, object, "id")) {
      // Unique **within its Tile only** — all `03` §4.2's canonical ordering
      // needs. Global uniqueness is neither required nor forbidden (§6).
      const id = identifier(e, at(assetPath, "id"), object.id, "a TileAsset id");
      if (id !== null) {
        if (seen.has(id)) {
          e.add(
            at(assetPath, "id"),
            "DUPLICATE_ID",
            `TileAsset id ${JSON.stringify(id)} is used more than once in this Tile`,
          );
        }
        seen.add(id);
      }
    }

    if (required(e, assetPath, object, "weight")) {
      const weightPath = at(assetPath, "weight");
      if (finite(e, weightPath, object.weight, "a weight")) {
        const w = object.weight as number;
        // Zero is legal and means *listed but never chosen* (`03` §4.1).
        if (inRange(e, weightPath, w, "a weight", w >= 0, ">= 0")) total += w;
        else summable = false;
      } else {
        summable = false;
      }
    } else {
      summable = false;
    }

    // **C4**'s sole exception: validated as an object, contents uninspected.
    // `07` gets a namespace it can fill without touching this schema.
    if (object.meta !== undefined) {
      e.typed(at(assetPath, "meta"), object.meta, "an object", isObject(object.meta));
    }
  });

  if (summable && total <= 0) {
    e.add(path, "ZERO_WEIGHT_SUM", "a Tile's asset weights must sum to more than zero (03 §4.1)");
  }
}

// ---------------------------------------------------------------------------
// Operations — §7
// ---------------------------------------------------------------------------

function operation(
  e: Errors,
  path: string,
  value: unknown,
  seen: Set<string>,
  tileIds: Set<string>,
): void {
  if (!e.typed(path, value, "an Operation object", isObject(value))) return;
  const object = value as Record<string, unknown>;
  unknownKeys(e, path, object, [
    "id",
    "salt",
    "reseedOnLoad",
    "selection",
    "source",
    "target",
    "mapping",
    "blend",
  ]);

  if (required(e, path, object, "id")) {
    const id = identifier(e, at(path, "id"), object.id, "an Operation id");
    if (id !== null) {
      if (seen.has(id)) {
        // **A correctness requirement, not tidiness.** `02` §6.3 namespaces hash
        // channels by `operationId`; two Operations sharing an id share both
        // channels, so their Sources return identical values at every cell and
        // their `random` Selections agree everywhere — `04` §4.3's correlation
        // bug arriving from another direction, with no symptom but a picture
        // oddly aligned with itself.
        e.add(at(path, "id"), "DUPLICATE_ID", `Operation id ${JSON.stringify(id)} is used more than once`);
      }
      seen.add(id);
    }
  }

  if (object.salt !== undefined) uint32(e, at(path, "salt"), object.salt, "salt");
  if (object.reseedOnLoad !== undefined) {
    e.typed(at(path, "reseedOnLoad"), object.reseedOnLoad, "a boolean", typeof object.reseedOnLoad === "boolean");
  }

  if (required(e, path, object, "selection")) tagged(e, at(path, "selection"), object.selection, "selection");
  if (required(e, path, object, "source")) tagged(e, at(path, "source"), object.source, "source");

  let target: TargetName | null = null;
  if (required(e, path, object, "target")) {
    const targetPath = at(path, "target");
    const names = Object.keys(TARGETS);
    if (typeof object.target === "string" && names.includes(object.target)) {
      target = object.target as TargetName;
    } else {
      e.add(targetPath, "OUT_OF_RANGE", `target must be one of ${names.join(", ")}`);
    }
  }

  if (required(e, path, object, "blend")) {
    const blendPath = at(path, "blend");
    // §7.2 — a **bare string**, never a tagged object. No V1 Blend takes
    // parameters, and everything about a Blend is looked up rather than authored.
    if (e.typed(blendPath, object.blend, "a Blend name string", typeof object.blend === "string")) {
      const blend = object.blend as string;
      if (target !== null) {
        // **Against the table, not against prose** (§7, **O7**) — and derived
        // from it, which is ADR-001's whole point: a Blend registered later
        // joins every numeric Target at once, and a validator holding its own
        // table would be the thing that failed to notice.
        const accepted = acceptedBlends(target);
        if (!accepted.includes(blend)) {
          e.add(
            blendPath,
            "INVALID_TARGET_BLEND",
            `target ${JSON.stringify(target)} accepts ${accepted.join(", ")}, not ${JSON.stringify(blend)}`,
          );
        }
      }
    }
  }

  if (required(e, path, object, "mapping")) {
    mapping(e, at(path, "mapping"), object.mapping, target, tileIds);
  }
}

// ---------------------------------------------------------------------------
// Layout — §8
// ---------------------------------------------------------------------------

function layout(e: Errors, path: string, value: unknown): void {
  if (!e.typed(path, value, "a Layout object", isObject(value))) return;
  const object = value as Record<string, unknown>;
  unknownKeys(e, path, object, ["cellSize", "referenceWidth", "yOffset", "horizontalAlignment"]);

  for (const key of ["cellSize", "referenceWidth"] as const) {
    if (!required(e, path, object, key)) continue;
    const keyPath = at(path, key);
    if (finite(e, keyPath, object[key], key)) {
      inRange(e, keyPath, object[key] as number, key, (object[key] as number) > 0, "> 0");
    }
  }

  if (required(e, path, object, "yOffset")) {
    const offsetPath = at(path, "yOffset");
    if (finite(e, offsetPath, object.yOffset, "yOffset")) {
      const v = object.yOffset as number;
      // **Validated rather than clamped.** `02` §7.4's "it is clamped" is the
      // constraint the editor imposes on input, not something the loader does:
      // "a loader that silently rewrites a value produces a picture the file
      // does not describe, and the author's next save writes the rewritten value
      // back over their own."
      inRange(e, offsetPath, v, "yOffset", v >= 0 && v < 1, "in [0, 1)");
    }
  }

  if (required(e, path, object, "horizontalAlignment")) {
    const key = at(path, "horizontalAlignment");
    const legal = object.horizontalAlignment === "column" || object.horizontalAlignment === "gutter";
    if (!legal) e.add(key, "OUT_OF_RANGE", 'horizontalAlignment must be "column" or "gutter"');
  }
}

// ---------------------------------------------------------------------------
// The config — §5
// ---------------------------------------------------------------------------

function config(e: Errors, path: string, value: unknown): void {
  if (!e.typed(path, value, "a TilesetConfig object", isObject(value))) return;
  const object = value as Record<string, unknown>;
  unknownKeys(e, path, object, [
    "rows",
    "columns",
    "defaultSeed",
    "assetSalt",
    "reseedAssetsOnLoad",
    "tiles",
    "operations",
  ]);

  for (const key of ["rows", "columns"] as const) {
    if (!required(e, path, object, key)) continue;
    const keyPath = at(path, key);
    if (integer(e, keyPath, object[key], key)) {
      inRange(e, keyPath, object[key] as number, key, (object[key] as number) >= 1, ">= 1");
    }
  }

  if (required(e, path, object, "defaultSeed")) {
    const seedPath = at(path, "defaultSeed");
    if (e.typed(seedPath, object.defaultSeed, "a seed string", typeof object.defaultSeed === "string")) {
      // Length >= 1: the empty string hashes to a legal uint32 and would render,
      // silently, as a seed nobody chose (§5).
      if ((object.defaultSeed as string).length === 0) {
        e.add(seedPath, "OUT_OF_RANGE", "defaultSeed must not be empty");
      }
    }
  }

  if (object.assetSalt !== undefined) uint32(e, at(path, "assetSalt"), object.assetSalt, "assetSalt");
  if (object.reseedAssetsOnLoad !== undefined) {
    e.typed(
      at(path, "reseedAssetsOnLoad"),
      object.reseedAssetsOnLoad,
      "a boolean",
      typeof object.reseedAssetsOnLoad === "boolean",
    );
  }

  // Both may be **empty** — that is the state a fresh editor document is in, and
  // it generates a grid of `tileId: null`, which is legal and renders nothing
  // (**G4**). Rejecting it would mean the editor cannot save an unfinished
  // document.
  const tileIds = new Set<string>();
  if (required(e, path, object, "tiles")) {
    const tilesPath = at(path, "tiles");
    if (e.typed(tilesPath, object.tiles, "a tiles array", Array.isArray(object.tiles))) {
      (object.tiles as unknown[]).forEach((t, i) => tile(e, at(tilesPath, i), t, tileIds));
    }
  }

  if (required(e, path, object, "operations")) {
    const opsPath = at(path, "operations");
    if (e.typed(opsPath, object.operations, "an operations array", Array.isArray(object.operations))) {
      const seen = new Set<string>();
      // Tile ids are collected first so a palette reference forward or backward
      // in the file resolves identically — the file has no ordering rule between
      // the two arrays and inventing one here would make a legal file's validity
      // depend on key order.
      (object.operations as unknown[]).forEach((op, i) => operation(e, at(opsPath, i), op, seen, tileIds));
    }
  }
}

// ---------------------------------------------------------------------------
// Responsive rules — 0.7.0
// ---------------------------------------------------------------------------

const RULE_CONDITIONS = ["minWidth", "maxWidth"] as const;

/**
 * The file's `responsive` rules — `responsive.ts` says what they mean.
 *
 * Four layers, each with its own path so the editor's repair affordance lands on
 * the right field:
 *
 * 1. **Each rule's own fields.** A condition is a width, `>= 0`; `minWidth <=
 *    maxWidth`. A shape field is checked by `shapeFieldProblem`, the same
 *    statement of its domain `reshapeErrors` reads, so a host rule and a file rule
 *    cannot disagree about what a legal `rows` is.
 * 2. **A rule must say when and what.** No condition is the base under another
 *    name — edit the base; no shape field is a rule that does nothing. Both are
 *    `MISSING_KEY` at the rule, because in each case something the author meant to
 *    write is absent.
 * 3. **`COORDINATE_BOUND_RESIZE`.** A rule that *names* `rows` or `columns` in a
 *    file whose stack holds a coordinate-bound Operation — one error per pair, at
 *    the rule's field, naming the Operation. A schema error rather than a
 *    decoration-contract message (`shape.ts`'s `reshapeErrors`) because the rules
 *    are now in the schema: the file itself promises a resize its own Operations
 *    cannot survive.
 * 4. **Every band resolves to a box.** `bleed`'s bound is relative (`columns -
 *    bleed > 0`), and the `columns` it is relative to may come from another rule,
 *    so it can only be checked against the resolved shape. `bandWidths` gives one
 *    width per band, which makes the check exhaustive rather than sampled. Run
 *    only on an otherwise-valid file: resolving a shape from a broken base would
 *    report the base's defect a second time, in a worse place.
 */
function responsive(e: Errors, path: string, value: unknown, file: Record<string, unknown>): void {
  if (!e.typed(path, value, "an array of rules", Array.isArray(value))) return;
  const rules = value as unknown[];

  const ops = pinningOperations(file);

  rules.forEach((rule, i) => {
    const rulePath = at(path, i);
    if (!e.typed(rulePath, rule, "a rule object", isObject(rule))) return;
    const r = rule as Record<string, unknown>;
    unknownKeys(e, rulePath, r, [...RULE_CONDITIONS, ...SHAPE_FIELDS]);

    for (const key of RULE_CONDITIONS) {
      if (r[key] === undefined) continue;
      const keyPath = at(rulePath, key);
      if (finite(e, keyPath, r[key], key)) inRange(e, keyPath, r[key] as number, key, (r[key] as number) >= 0, ">= 0");
    }
    if (
      typeof r.minWidth === "number" &&
      typeof r.maxWidth === "number" &&
      Number.isFinite(r.minWidth) &&
      Number.isFinite(r.maxWidth) &&
      r.minWidth > r.maxWidth
    ) {
      e.add(at(rulePath, "minWidth"), "OUT_OF_RANGE", `minWidth ${r.minWidth} is above maxWidth ${r.maxWidth}, so the rule never holds`);
    }
    if (r.minWidth === undefined && r.maxWidth === undefined) {
      e.add(rulePath, "MISSING_KEY", "a rule needs minWidth or maxWidth; a rule that always holds is the base, so edit the base");
    }

    let names = 0;
    for (const field of SHAPE_FIELDS) {
      if (r[field] === undefined) continue;
      names++;
      const problem = shapeFieldProblem(field, r[field]);
      if (problem !== null) e.add(at(rulePath, field), problem.code, problem.message);
    }
    if (names === 0) {
      e.add(rulePath, "MISSING_KEY", `a rule must set at least one of ${SHAPE_FIELDS.join(", ")}`);
    }

    for (const field of ["rows", "columns"] as const) {
      if (r[field] === undefined) continue;
      for (const op of ops) e.add(at(rulePath, field), "COORDINATE_BOUND_RESIZE", coordinateBoundMessage(op));
    }
  });
}

/**
 * The coordinate-bound Operations of a file not yet known to be valid.
 *
 * Only the well-shaped ones are looked at: a malformed Operation has its own
 * errors at its own path, and a second report of it here would be one defect
 * given two voices.
 */
function pinningOperations(file: Record<string, unknown>): Operation[] {
  const config = file.config;
  if (!isObject(config) || !Array.isArray(config.operations)) return [];
  const wellShaped = (config.operations as unknown[]).filter(
    (op): op is Operation =>
      isObject(op) && isObject(op.selection) && typeof op.selection.type === "string" && typeof op.id === "string",
  );
  return coordinateBoundOperations(wellShaped);
}

/** Layer 4 of {@link responsive}: every band of an otherwise-valid file resolves to a box. */
function everyBandHasABox(e: Errors, file: TilesetFile): void {
  const rules = file.responsive ?? [];
  for (const width of bandWidths(rules)) {
    const active = activeRules(rules, width);
    const out = reshape(file, ruleOverride(active));
    if (out.layout.referenceWidth > 0) continue;
    // Blame the last rule that set what the bound is made of.
    const culprit = [...active].reverse().find((r) => r.bleed !== undefined || r.columns !== undefined);
    const i = culprit === undefined ? 0 : rules.indexOf(culprit);
    e.add(
      at("/responsive", i),
      "OUT_OF_RANGE",
      `at a box width of ${width}px the rules resolve to ${out.config.columns} columns with a bleed that leaves no box ` +
        "(columns - bleed must be > 0)",
    );
    return;
  }
}

// ---------------------------------------------------------------------------
// The entry point — §10
// ---------------------------------------------------------------------------

/**
 * Validate a parsed `TilesetFile`. An **empty array means valid** — `06` §10.
 *
 * The `schemaVersion` check runs first and, when it fails, runs **alone**:
 * **C2** says the loader "never guesses a version from the fields present", and
 * reporting a hundred shape errors against a schema the file was not written for
 * would be exactly that guess, made loudly. `09` §12.4 gives
 * `SCHEMA_VERSION_UNKNOWN` its own message for the same reason — update the
 * editor, not the file.
 */
export function validate(file: unknown): ValidationError[] {
  const e = new Errors();
  if (!e.typed("", file, "a TilesetFile object", isObject(file))) return e.list;
  const object = file as Record<string, unknown>;

  if (object.schemaVersion === undefined) {
    e.add("/schemaVersion", "SCHEMA_VERSION_MISSING", "schemaVersion is required (06 C2)");
    return e.list;
  }
  if (object.schemaVersion !== SCHEMA_VERSION) {
    e.add(
      "/schemaVersion",
      "SCHEMA_VERSION_UNKNOWN",
      `this build knows schemaVersion ${SCHEMA_VERSION}, the file declares ${String(object.schemaVersion)}`,
    );
    return e.list;
  }

  unknownKeys(e, "", object, ["schemaVersion", "engineVersion", "config", "layout", "responsive"]);

  if (required(e, "", object, "engineVersion")) {
    // **C3** — required, advisory, and never validated against anything. A shape
    // rule only; content is unconstrained, and a hand-written fixture may put
    // anything in it. "`schemaVersion` gates loads. This field gates nothing."
    e.typed("/engineVersion", object.engineVersion, "a string", typeof object.engineVersion === "string");
  }

  if (required(e, "", object, "config")) config(e, "/config", object.config);
  if (required(e, "", object, "layout")) layout(e, "/layout", object.layout);
  if (object.responsive !== undefined) {
    responsive(e, "/responsive", object.responsive, object);
    if (e.list.length === 0) everyBandHasABox(e, object as unknown as TilesetFile);
  }

  return e.list;
}
