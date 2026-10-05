/**
 * `<Tileset>`'s options — every setting the component takes, in one typed object.
 *
 * The component has three props: `file` (the data), `options` (this), and the
 * bindable `box`, which stays apart because Svelte cannot `bind:` into a field of
 * an object prop.
 *
 * **Named `options`, not `config`.** `file.config` is already `TilesetConfig`,
 * the engine's input, and a `config` prop beside it would give one word two
 * meanings on one line of markup. `Tileset.svelte` also records "there is no
 * `config` prop" for a reason that still holds: the file is never split across
 * two props.
 *
 * **One way to say each thing.** Before 0.6.0 `seed`, `loadSalt`, `provider`,
 * `onAssetError` and `substrate` were top-level props. They are not kept as
 * aliases: two spellings would need a precedence rule, and a rule nobody reads is
 * a silent wrong picture. Passing one throws in a development build, naming its
 * new place (`legacyPropErrors`).
 *
 * **Defaults live in `resolveOptions` and nowhere else**, so the table in the
 * README and the behaviour cannot drift apart without a test noticing.
 *
 * Every field accepts `undefined` as well as absence, and they mean the same
 * thing: the package compiles under `exactOptionalPropertyTypes`, where `seed?:
 * string` would reject a host forwarding its own optional `seed` — the exact
 * spread workaround `<TileDecoration>` used to need.
 */

import { shapeFieldProblem, SHAPE_FIELDS } from "../shape.js";
import type { ResponsiveRule, TilesetFile } from "../types.js";
import type { AlignX, AlignY, Sizing } from "./geometry.js";
import { defaultProvider, type AssetProvider, type AssetRef } from "./provider.js";

export type Substrate = "canvas" | "dom";

/** Whether the render box clips the grid. See {@link TilesetOptions.overflow}. */
export type Overflow = "hidden" | "visible";

/**
 * A responsive rule written by the host: a file rule's shape fields, plus the two
 * render-space settings a page commonly wants to change at a width.
 *
 * `sizing` and `align` are here and not in a file rule for the reason
 * `geometry.ts` gives on `Sizing`: they are how a page *hosts* a design, not part
 * of the design, and one file may be hosted fluid in a hero and fixed in a
 * sidebar.
 */
export interface HostRule extends ResponsiveRule {
  sizing?: Sizing | undefined;
  align?: { x?: AlignX | undefined; y?: AlignY | undefined } | undefined;
}

/** A CSS selector, one element, or several. See {@link TilesetOptions.avoid}. */
export type AvoidTargets = string | Element | Iterable<Element>;

export interface TilesetOptions {
  /**
   * The seed. Absent means `file.config.defaultSeed` (`07` §9.2), so with no
   * options at all the picture is fixed (**S4**).
   */
  seed?: string | undefined;

  /**
   * Per-load variation, drawn **once per render session by the host** and held
   * (`07` **R12**). Default `0`. Never draw it at module scope under SSR — see the
   * README.
   */
  loadSalt?: number | undefined;

  /**
   * What draws the grid. Default `"canvas"`.
   *
   * - `"canvas"` — one bitmap. Seamless by construction (adjacent tiles are
   *   neighbouring pixels of one surface, so no host CSS can open a boundary),
   *   and the cheaper of the two for large grids. Draws nothing until the box is
   *   measured, so the server HTML is an empty box of the right size.
   * - `"dom"` — one element per cell. Hit-testable per cell, and SSR-complete: the
   *   server HTML carries every cell's geometry. Its grid can overhang the box by
   *   up to a device pixel per cell, clipped at the sides.
   */
  substrate?: Substrate | undefined;

  /**
   * Whether the render box clips what is drawn past it. Default `"hidden"`, which
   * is **R9**: the box is the only clipping boundary. **`substrate: "dom"` only.**
   *
   * - `"hidden"` — a tile translated, scaled or turned past the edge is cut there.
   * - `"visible"` — the box clips nothing, and every cell that is built paints
   *   wherever its tile lands. That shows more than the moved tiles: the designed
   *   side bleed, the extra columns culling builds outside the box for tiles that
   *   reach in (`maxSpill`, so the picture ends raggedly a column or so past each
   *   side), and the top of row 0 that `yOffset` crops. Rows are never culled, so
   *   below the box it is exactly the tiles that moved there.
   *
   * The clip is handed to the host, not removed: `overflow: hidden` on any
   * ancestor puts one back wherever the page wants it, and the box keeps its size
   * either way.
   *
   * Not on the canvas substrate, and passing it there is an error rather than a
   * no-op: a canvas cannot paint outside its own bitmap. Rejected: an enlarged
   * raster hanging past the box. It would move the canvas's presentation geometry
   * (`uniform.ts`), which `SUBPIXEL-GEOMETRY.md` is the record of getting right.
   *
   * Not a `HostRule` field: it is how one placement hosts the design, and no case
   * for changing it at a width has come up.
   */
  overflow?: Overflow | undefined;

  /**
   * How cells respond to the box's width. Default `"fluid"`.
   *
   * - `"fluid"` — cells scale with the box, so the picture is one design at every
   *   width (`07` §5.3).
   * - `"fixed"` — cells stay `layout.cellSize` CSS px at every width and the box
   *   crops the grid, on the side `align.x` says. Author the grid for the widest
   *   box it will be shown in: a wider box shows page backdrop beside the grid,
   *   because columns are never added.
   */
  sizing?: Sizing | undefined;

  /**
   * Which edge of the design box stays put when the render box differs from it.
   *
   * - `x` — default `"center"`. Only matters under `sizing: "fixed"`: under
   *   `"fluid"` the design box *is* the render box, so all three are the same
   *   picture. `"left"` crops from the right, `"right"` from the left, `"center"`
   *   both sides equally.
   * - `y` — default `"top"`. Only matters when the host gives the tileset a height
   *   of its own (a `100vh` hero, say): `"top"` crops the bottom rows, `"bottom"`
   *   the top ones, `"center"` both.
   */
  align?: { x?: AlignX | undefined; y?: AlignY | undefined } | undefined;

  /**
   * **DOM-aware visibility — opt-in.** Hide every tile whose cell overlaps one of
   * these elements, and keep doing so as they move, resize, rewrap, or come and
   * go. Absent means the full tileset, and nothing but the box is measured.
   *
   * - `targets` — a selector, resolved inside the tileset's **parent element**
   *   (the section it sits in) and re-resolved when that subtree changes; or an
   *   element, or several, used as given.
   * - `padding` — CSS px of clearance around each target. Default `0`.
   *
   * Tracked: the box resizing, a target resizing, the section's subtree changing
   * (elements added or removed, `class`/`style` toggled, text edited), and web
   * fonts finishing loading. **Not tracked**: a target moved by a CSS animation or
   * transition, which changes no size — call `refresh()` from
   * `@fndvit/gen-tilesets/render` when one settles.
   */
  avoid?:
    | {
        targets: AvoidTargets;
        padding?: number | undefined;
      }
    | undefined;

  /**
   * Shape overrides by the render box's width — **replaces** `file.responsive`
   * wholesale when present, and `[]` turns the file's rules off. Absent means the
   * file's own rules, if it has any.
   *
   * Replaced rather than merged: two rule lists meeting would need a precedence
   * rule between them, on top of the cascade within each, and a host that wants
   * the file's rules plus one more can spread them — `[...file.responsive ?? [],
   * mine]` — which says exactly what it means.
   *
   * A host rule may also set `sizing` and `align`, which a file rule may not. See
   * `HostRule`.
   */
  responsive?: readonly HostRule[] | undefined;

  /**
   * `(tileId, assetId)` → drawable. Default `defaultProvider`, which reads
   * `meta.src`. Use `prefixedProvider(base)` anywhere but the site root.
   */
  provider?: AssetProvider | undefined;

  /** `08` **S6**. Fires for a resolution failure and a load failure alike. */
  onAssetError?: ((ref: AssetRef, cause: unknown) => void) | undefined;
}

/** A keep-out target list with its shape decided once. */
export type NormalizedTargets =
  | { kind: "selector"; selector: string }
  | { kind: "elements"; elements: readonly Element[] };

/** {@link TilesetOptions} with every default filled in. */
export interface ResolvedOptions {
  seed: string | undefined;
  loadSalt: number;
  substrate: Substrate;
  overflow: Overflow;
  sizing: Sizing;
  alignX: AlignX;
  alignY: AlignY;
  avoid: { targets: NormalizedTargets; padding: number } | null;
  /** `undefined` means "the file's own". See {@link effectiveRules}. */
  responsive: readonly HostRule[] | undefined;
  provider: AssetProvider;
  onAssetError: ((ref: AssetRef, cause: unknown) => void) | undefined;
}

/** The documented defaults, as data. `resolveOptions({})` is exactly this. */
export const DEFAULT_OPTIONS: Readonly<ResolvedOptions> = Object.freeze({
  seed: undefined,
  loadSalt: 0,
  substrate: "canvas",
  overflow: "hidden",
  sizing: "fluid",
  alignX: "center",
  alignY: "top",
  avoid: null,
  responsive: undefined,
  provider: defaultProvider,
  onAssetError: undefined,
});

export function resolveOptions(o: TilesetOptions | undefined): ResolvedOptions {
  const d = DEFAULT_OPTIONS;
  if (o === undefined) return { ...d };
  return {
    seed: o.seed ?? d.seed,
    loadSalt: o.loadSalt ?? d.loadSalt,
    substrate: o.substrate ?? d.substrate,
    overflow: o.overflow ?? d.overflow,
    sizing: o.sizing ?? d.sizing,
    alignX: o.align?.x ?? d.alignX,
    alignY: o.align?.y ?? d.alignY,
    avoid:
      o.avoid === undefined
        ? null
        : { targets: normalizeTargets(o.avoid.targets), padding: o.avoid.padding ?? 0 },
    responsive: o.responsive ?? d.responsive,
    provider: o.provider ?? d.provider,
    onAssetError: o.onAssetError ?? d.onAssetError,
  };
}

const NO_RULES: readonly HostRule[] = Object.freeze([]);

/**
 * The rules in force, in one line of precedence: the host's if it gave any
 * (`[]` included), otherwise the file's, otherwise none.
 *
 * `reshape()` has already dropped a file's rules by the time a reshaped file gets
 * here, so "a reshaped file has no rules of its own" needs no case of its own.
 */
export function effectiveRules(
  file: TilesetFile,
  host: readonly HostRule[] | undefined,
): readonly HostRule[] {
  return host ?? file.responsive ?? NO_RULES;
}

/**
 * The render-space half of the cascade: `sizing` and `align` over the host's
 * base options, in rule order, a later rule winning field by field — the same
 * cascade `ruleOverride` runs over the shape fields.
 */
export function renderOverride(
  base: { sizing: Sizing; alignX: AlignX; alignY: AlignY },
  active: readonly HostRule[],
): { sizing: Sizing; alignX: AlignX; alignY: AlignY } {
  let { sizing, alignX, alignY } = base;
  for (const r of active) {
    sizing = r.sizing ?? sizing;
    alignX = r.align?.x ?? alignX;
    alignY = r.align?.y ?? alignY;
  }
  return { sizing, alignX, alignY };
}

/**
 * Decide a target list's shape.
 *
 * `nodeType` is tested **before** iterability, because some elements are
 * iterable — an `HTMLSelectElement` iterates its options — and a single `<select>`
 * passed as a target means the select, not its options.
 */
export function normalizeTargets(t: AvoidTargets): NormalizedTargets {
  if (typeof t === "string") return { kind: "selector", selector: t };
  if (typeof (t as Element).nodeType === "number") {
    return { kind: "elements", elements: [t as Element] };
  }
  return { kind: "elements", elements: [...(t as Iterable<Element>)] };
}

/**
 * Whether two target lists name the same elements: equal selectors, or the same
 * elements in the same order.
 *
 * This is what lets a host write `avoid: { targets: [a, b] }` inline. The array is
 * a new object on every render of the host, and without this comparison every
 * one of those would tear down and re-register the tracker's observers.
 */
export function sameTargets(a: NormalizedTargets | null, b: NormalizedTargets | null): boolean {
  if (a === b) return true;
  if (a === null || b === null || a.kind !== b.kind) return false;
  if (a.kind === "selector") return a.selector === (b as typeof a).selector;
  const be = (b as typeof a).elements;
  return a.elements.length === be.length && a.elements.every((el, i) => el === be[i]);
}

const SUBSTRATES: readonly string[] = ["canvas", "dom"];
const OVERFLOWS: readonly string[] = ["hidden", "visible"];
const SIZINGS: readonly string[] = ["fluid", "fixed"];
const ALIGN_X: readonly string[] = ["left", "center", "right"];
const ALIGN_Y: readonly string[] = ["top", "center", "bottom"];
const KNOWN = new Set([
  "seed",
  "loadSalt",
  "substrate",
  "overflow",
  "sizing",
  "align",
  "avoid",
  "responsive",
  "provider",
  "onAssetError",
]);
const RULE_KEYS = new Set<string>(["minWidth", "maxWidth", ...SHAPE_FIELDS, "sizing", "align"]);

/**
 * Everything wrong with an options object, as messages naming the field.
 *
 * **Separate from `resolveOptions`, for C5's reason**: resolving trusts its input
 * the way `generate()` does, and this is the check that makes the trust earned.
 * `<Tileset>` runs it in a development build and throws on any message; in
 * production it is not called. It reports and never coerces — a `substrate:
 * "svg"` is an error naming the two that exist, not a quiet fall back to
 * `"canvas"`.
 *
 * `unknown` rather than `TilesetOptions`: the types already reject all of this at
 * compile time, and the check exists for what arrives without them — plain
 * JavaScript, a cast, a value read from a CMS.
 */
export function optionErrors(o: unknown): string[] {
  if (o === undefined) return [];
  if (o === null || typeof o !== "object") return ["`options` must be an object."];
  const errors: string[] = [];
  const r = o as Record<string, unknown>;

  for (const key of Object.keys(r)) {
    if (!KNOWN.has(key)) errors.push(`\`options.${key}\` is not an option.`);
  }

  const oneOf = (path: string, v: unknown, allowed: readonly string[]): void => {
    if (v !== undefined && !(typeof v === "string" && allowed.includes(v))) {
      errors.push(
        `\`${path}\` is ${JSON.stringify(v)}; it must be one of ${allowed.map((a) => `"${a}"`).join(", ")}.`,
      );
    }
  };

  if (r.seed !== undefined && typeof r.seed !== "string") {
    errors.push("`options.seed` must be a string.");
  }
  if (r.loadSalt !== undefined && !(typeof r.loadSalt === "number" && Number.isFinite(r.loadSalt))) {
    errors.push("`options.loadSalt` must be a finite number.");
  }
  oneOf("options.substrate", r.substrate, SUBSTRATES);
  oneOf("options.overflow", r.overflow, OVERFLOWS);
  // Absent `substrate` is `"canvas"`, so `{ overflow: "visible" }` alone is this
  // error too: ignoring the field would be a quiet wrong picture.
  if (r.overflow === "visible" && (r.substrate ?? DEFAULT_OPTIONS.substrate) === "canvas") {
    errors.push('`options.overflow: "visible"` needs `substrate: "dom"`: a canvas cannot draw outside itself.');
  }
  oneOf("options.sizing", r.sizing, SIZINGS);

  if (r.align !== undefined) {
    if (r.align === null || typeof r.align !== "object") {
      errors.push("`options.align` must be an object with `x` and/or `y`.");
    } else {
      const a = r.align as Record<string, unknown>;
      for (const key of Object.keys(a)) {
        if (key !== "x" && key !== "y") errors.push(`\`options.align.${key}\` is not an option.`);
      }
      oneOf("options.align.x", a.x, ALIGN_X);
      oneOf("options.align.y", a.y, ALIGN_Y);
    }
  }

  if (r.avoid !== undefined) {
    if (r.avoid === null || typeof r.avoid !== "object") {
      errors.push("`options.avoid` must be an object with `targets`.");
    } else {
      const a = r.avoid as Record<string, unknown>;
      for (const key of Object.keys(a)) {
        if (key !== "targets" && key !== "padding") {
          errors.push(`\`options.avoid.${key}\` is not an option.`);
        }
      }
      const t = a.targets;
      if (typeof t === "string") {
        if (t.trim() === "") errors.push("`options.avoid.targets` is an empty selector.");
      } else if (
        t === null ||
        typeof t !== "object" ||
        (typeof (t as Element).nodeType !== "number" && !(Symbol.iterator in t))
      ) {
        errors.push("`options.avoid.targets` must be a selector, an element, or a list of elements.");
      }
      const p = a.padding;
      if (p !== undefined && !(typeof p === "number" && Number.isFinite(p) && p >= 0)) {
        errors.push("`options.avoid.padding` must be a finite number of CSS px, 0 or more.");
      }
    }
  }

  if (r.responsive !== undefined) {
    if (!Array.isArray(r.responsive)) {
      errors.push("`options.responsive` must be an array of rules.");
    } else {
      (r.responsive as unknown[]).forEach((rule, i) => ruleErrors(`options.responsive[${i}]`, rule, errors, oneOf));
    }
  }

  if (r.provider !== undefined && typeof r.provider !== "function") {
    errors.push("`options.provider` must be a function.");
  }
  if (r.onAssetError !== undefined && typeof r.onAssetError !== "function") {
    errors.push("`options.onAssetError` must be a function.");
  }
  return errors;
}

/**
 * One host rule's own fields. What needs the file — a coordinate-bound Operation
 * pinning `rows`, a bleed that leaves no box once the cascade has run — is
 * `rulesReshapeErrors`' question, asked by `<Tileset>` with the file in hand.
 *
 * The shape fields are checked by `shapeFieldProblem`, the same statement of
 * each domain `validate()` reads for a file's rules.
 */
function ruleErrors(
  path: string,
  rule: unknown,
  errors: string[],
  oneOf: (path: string, v: unknown, allowed: readonly string[]) => void,
): void {
  if (rule === null || typeof rule !== "object" || Array.isArray(rule)) {
    errors.push(`\`${path}\` must be a rule object.`);
    return;
  }
  const r = rule as Record<string, unknown>;
  for (const key of Object.keys(r)) {
    if (RULE_KEYS.has(key)) continue;
    errors.push(
      key === "referenceWidth"
        ? `\`${path}.referenceWidth\` is not a rule field; set \`bleed\` (columns that overhang the box) instead.`
        : `\`${path}.${key}\` is not a rule field.`,
    );
  }
  for (const key of ["minWidth", "maxWidth"] as const) {
    const v = r[key];
    if (v !== undefined && !(typeof v === "number" && Number.isFinite(v) && v >= 0)) {
      errors.push(`\`${path}.${key}\` must be a finite width in CSS px, 0 or more.`);
    }
  }
  if (r.minWidth === undefined && r.maxWidth === undefined) {
    errors.push(`\`${path}\` needs \`minWidth\` or \`maxWidth\`; a rule that always holds is the base.`);
  }
  if (typeof r.minWidth === "number" && typeof r.maxWidth === "number" && r.minWidth > r.maxWidth) {
    errors.push(`\`${path}\` has minWidth above maxWidth, so it never holds.`);
  }
  let sets = 0;
  for (const field of SHAPE_FIELDS) {
    if (r[field] === undefined) continue;
    sets++;
    const problem = shapeFieldProblem(field, r[field]);
    if (problem !== null) errors.push(`\`${path}.${field}\`: ${problem.message}.`);
  }
  oneOf(`${path}.sizing`, r.sizing, SIZINGS);
  if (r.sizing !== undefined) sets++;
  if (r.align !== undefined) {
    sets++;
    if (r.align === null || typeof r.align !== "object") {
      errors.push(`\`${path}.align\` must be an object with \`x\` and/or \`y\`.`);
    } else {
      const a = r.align as Record<string, unknown>;
      for (const key of Object.keys(a)) {
        if (key !== "x" && key !== "y") errors.push(`\`${path}.align.${key}\` is not an option.`);
      }
      oneOf(`${path}.align.x`, a.x, ALIGN_X);
      oneOf(`${path}.align.y`, a.y, ALIGN_Y);
    }
  }
  if (sets === 0) {
    errors.push(`\`${path}\` sets nothing; give it a shape field, \`sizing\` or \`align\`.`);
  }
}

/** The props `<Tileset>` took before 0.6.0, all of which moved into `options`. */
export const LEGACY_PROPS = ["seed", "loadSalt", "provider", "onAssetError", "substrate"] as const;

/**
 * One message per pre-0.6.0 prop found among a component's unknown props.
 *
 * Svelte drops an unknown prop silently, so without this a host upgrading from
 * 0.5.0 would lose its seed or its provider and see a *plausible* picture — the
 * default seed, a relative asset path — rather than an error. That is the one
 * kind of failure this package refuses to have.
 */
export function legacyPropErrors(rest: Record<string, unknown>): string[] {
  return LEGACY_PROPS.filter((k) => k in rest).map(
    (k) => `\`${k}\` is no longer a prop of <Tileset>; pass it as \`options={{ ${k} }}\` (0.6.0).`,
  );
}
