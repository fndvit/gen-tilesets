/**
 * Responsive rules — shape overrides chosen by the render box's width.
 *
 * A rule is {@link reshape} with a condition. It adds no concept of its own: the
 * fields a rule may set are exactly `Shape`'s, they mean what they mean to
 * `reshape`, and the file a rule produces is `reshape(base, override)`. This
 * module is only the part that decides *which* override applies at a width.
 *
 * ## The cascade is CSS's, on purpose
 *
 * Every matching rule applies, in array order, and a later rule wins field by
 * field. Both bounds are inclusive, as in `(max-width: 500px)`. So
 *
 *     [{ maxWidth: 900, columns: 15 }, { maxWidth: 500, columns: 9, rows: 14 }]
 *
 * gives 9 x 14 at 400px (both match, the second wins `columns`), 15 columns and
 * the base's rows at 700px, and the base above 900px. Overlaps need no special
 * case because the cascade is the special case.
 *
 * Rejected: *exactly one rule applies, each written against the base*. Simpler to
 * state, but a phone rule could not inherit from a tablet rule, which surprises
 * anyone who has written a media query. Rejected too: numeric object keys
 * (`{500: {...}}`), which leave min-versus-max unsaid and give JavaScript's key
 * order no meaning.
 *
 * ## Engine-space, though it speaks of widths
 *
 * Nothing here measures. A width is an argument, and the functions are pure, so
 * `validate()` can walk every band a file's rules produce and a vector table can
 * pin `(rules, width) -> override` without a browser. The measuring is
 * `render/measure.ts`'s, as it always was.
 */

import { reshapeErrors, SHAPE_FIELDS } from "./shape.js";
import type { ResponsiveRule, Shape, TilesetFile } from "./types.js";

/** Whether one rule's condition holds at `width`. Both bounds inclusive. */
export function matches(rule: ResponsiveRule, width: number): boolean {
  return (
    (rule.minWidth === undefined || width >= rule.minWidth) &&
    (rule.maxWidth === undefined || width <= rule.maxWidth)
  );
}

/** The rules that hold at `width`, in array order — the order they cascade in. */
export function activeRules<R extends ResponsiveRule>(rules: readonly R[], width: number): R[] {
  return rules.filter((r) => matches(r, width));
}

/**
 * Which rules hold at `width`, as a string: their indices, comma-joined. `""` is
 * *none* — the base shape.
 *
 * **What makes a resize inside a band cost nothing.** The width moves on every
 * frame of a drag; this key moves only when a rule starts or stops matching. A
 * consumer that derives its override from the key rather than from the width
 * hands the same object downstream for a whole band, and everything keyed on its
 * identity stays put.
 */
export function activeKey(rules: readonly ResponsiveRule[], width: number): string {
  let key = "";
  for (let i = 0; i < rules.length; i++) {
    if (matches(rules[i]!, width)) key = key === "" ? `${i}` : `${key},${i}`;
  }
  return key;
}

/**
 * The cascade: the shape fields of `rules`, merged in order, a later rule winning
 * field by field. Only shape fields — conditions, and any host-only field a
 * caller's rule type adds, are not copied.
 *
 * Absent from every rule means absent from the result, and absent means *the
 * base's*: an empty list gives `{}`, which `reshape` hands back as the base file
 * itself.
 */
export function ruleOverride(rules: readonly ResponsiveRule[]): Partial<Shape> {
  const out: Partial<Shape> = {};
  for (const rule of rules) {
    for (const field of SHAPE_FIELDS) {
      const v = rule[field];
      if (v !== undefined) out[field] = v;
    }
  }
  return out;
}

/**
 * One width inside every band the rules divide the axis into — enough to see
 * every override they can produce.
 *
 * The active set is constant between two consecutive bounds, and bounds are
 * inclusive, so each bound is its own band (a `maxWidth: 500` rule and a
 * `minWidth: 500` one both hold at exactly 500). The widths returned are `0`,
 * every bound, a point strictly between each consecutive pair, and one past the
 * largest. That is exhaustive, and it is what lets `validate()` check the shape
 * at *every* width without choosing a sample.
 */
export function bandWidths(rules: readonly ResponsiveRule[]): number[] {
  const bounds = new Set<number>();
  for (const r of rules) {
    if (r.minWidth !== undefined) bounds.add(r.minWidth);
    if (r.maxWidth !== undefined) bounds.add(r.maxWidth);
  }
  const sorted = [...bounds].sort((a, b) => a - b);
  const out = [0];
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    const prev = i === 0 ? 0 : sorted[i - 1]!;
    if (b > prev) out.push((prev + b) / 2);
    if (b !== 0) out.push(b);
  }
  out.push((sorted[sorted.length - 1] ?? 0) + 1);
  return out;
}

/**
 * Everything wrong with applying `rules` to `file`, at any width — each band's
 * resolved override through `reshapeErrors`, with repeats removed.
 *
 * What `validate()` checks for a file's own rules, asked of a host's: a host rule
 * naming `rows` over a stack with a `rect` in it, or a cascade whose `bleed` and
 * `columns` leave no box between two breakpoints. Per band rather than per rule,
 * because the second of those is a property of the cascade and not of any one
 * rule. `<Tileset>` calls it under `DEV` and throws.
 */
export function rulesReshapeErrors(file: TilesetFile, rules: readonly ResponsiveRule[]): string[] {
  const out = new Set<string>();
  for (const width of bandWidths(rules)) {
    for (const e of reshapeErrors(file, ruleOverride(activeRules(rules, width)))) out.add(e);
  }
  return [...out];
}
