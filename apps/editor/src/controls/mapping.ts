/**
 * Authoring ranges and mapping defaults — `09-editor.md` §7.4, §7.5.
 *
 * **The author never sees the word *mapping*.** `04` §6.1: "In the editor a
 * numeric mapping is two handles on the Target's slider track; a tile mapping is
 * the palette builder."
 *
 * ## Why a track exists at all
 *
 * `scaleX` and `scaleY` have **open domains** (`03` §5.4) — any finite number —
 * and §7.5 says `03` said so on purpose: "rejecting the normalized model because
 * scale has no natural maximum, and then inventing one, would be incoherent. The
 * editor still has to draw a track of finite length."
 *
 * So the track is a *drawing* decision, not a domain. §7.5 resolves `03` open
 * question 4 with a **soft** track that "extends to contain any value typed, and
 * never clamps one".
 */

import { ATTRIBUTES, TARGETS, type AttributeName, type NumericMapping, type TargetName } from "@fndvit/gen-tilesets";

export interface Track {
  min: number;
  max: number;
  /** Soft tracks extend to contain a typed value; hard ones are the domain. */
  soft: boolean;
  /** Whether typed entry is bounded, and by what. `undefined` means any finite number. */
  typed?: { min: number; max: number };
  /** `03` §5.4 — `rotation` wraps at 360. Surfaced so the author is not surprised. */
  wraps: boolean;
}

/**
 * §7.5's table.
 *
 * | Target     | Track           | Typed entry              |
 * | ---------- | --------------- | ------------------------ |
 * | `scale`    | `[0, 4]`, soft  | any finite number        |
 * | `scaleX`   | `[−2, 2]`, soft | any finite number        |
 * | `scaleY`   | `[−2, 2]`, soft | any finite number        |
 * | `rotation` | `[0, 360)`      | any finite number, wraps |
 * | `opacity`  | `[0, 1]`        | `[0, 1]`, the domain     |
 *
 * **The `[−2, 2]` figure is a UI constant with no authority anywhere.** §7.5
 * states it "so the editor is buildable" and nothing cites it. `rotation`'s track
 * is the domain because the domain is bounded; `opacity`'s typed entry is bounded
 * because its domain is, "and a value outside it would be clamped by **D5** on
 * the first write anyway".
 *
 * **The negative half of the scale track is load-bearing rather than
 * symmetric:** `03` §5.4 makes flip a negative value rather than a boolean, so
 * the track has to reach there or flip is unreachable by dragging.
 *
 * **`scale`'s track starts at 0 rather than mirroring the axes** — ADR-005. The
 * negative half is load-bearing on `scaleX` because a negative value there is a
 * flip; on a *uniform* scale it flips both axes at once, which is a 180°
 * rotation and is `rotation`'s job. Nothing is lost: the track is soft, so a
 * typed negative widens it rather than being refused.
 */
export const TRACKS: Readonly<Record<AttributeName, Track>> = {
  scale: { min: 0, max: 4, soft: true, wraps: false },
  scaleX: { min: -2, max: 2, soft: true, wraps: false },
  scaleY: { min: -2, max: 2, soft: true, wraps: false },
  rotation: { min: 0, max: 360, soft: false, wraps: true },
  opacity: { min: 0, max: 1, soft: false, typed: { min: 0, max: 1 }, wraps: false },
};

/**
 * The track widened to contain the values actually on it — §7.5's *soft*.
 *
 * "A typed `4` widens the track; it is not rewritten to `2`. Clamping typed
 * input would be `06` §9.2's coercion performed in the one place the author is
 * watching, and `02` §7.4 already records how that ends — the author's next save
 * writes the rewritten value back over their own."
 */
export function trackFor(target: AttributeName, values: number[]): Track {
  const base = TRACKS[target];
  if (!base.soft) return base;
  const finite = values.filter((v) => Number.isFinite(v));
  return {
    ...base,
    min: Math.min(base.min, ...finite),
    max: Math.max(base.max, ...finite),
  };
}

/** Whether a typed value may be committed. Bounded only where §7.5 bounds it. */
export function admitsTyped(target: AttributeName, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const typed = TRACKS[target].typed;
  if (typed === undefined) return true;
  return value >= typed.min && value <= typed.max;
}

/**
 * A new numeric mapping — **the attribute's own default at both ends**.
 *
 * No spec section supplies a starting range. This takes `03` **D4**'s declared
 * default from `ATTRIBUTES` rather than inventing a number, which makes a
 * freshly created Operation a **no-op**: it writes each cell the value that cell
 * already had. The author widens the range to make it do something, and nothing
 * surprising happens in between.
 *
 * Filling the whole track instead would mean a new `scaleX` Operation flipping
 * and doubling tiles the instant it was created.
 */
export function defaultNumericMapping(target: AttributeName): NumericMapping {
  const value = ATTRIBUTES[target].default;
  // `steps` is omitted, not set: its absence is a *meaning* — continuous — and
  // `06` §5.1 exempts it from "write everything explicitly" for that reason.
  return { range: [value, value] };
}

/** `06` §7.3: `steps >= 2`, because the stepped formula divides by `steps - 1`. */
export const MIN_STEPS = 2;

/**
 * §12.2's ninth advisory — a stepped mapping on a wrapping domain whose range
 * endpoints coincide.
 *
 * `04` §6.2's gotcha, which §7.4 says "the editor should surface": `rotation`
 * wraps at `360`, so `[0, 360]` with `steps: 4` yields `0, 120, 240, 360` and
 * `360` wraps to `0` — **three distinct rotations, one twice as likely**.
 * Quarter turns are `[0, 270]` with `steps: 4`.
 *
 * An advisory never blocks, never modifies the file, and is never reported as an
 * error (**E16**).
 */
export function endpointsCoincide(target: TargetName, mapping: NumericMapping): boolean {
  if (target !== "rotation" || mapping.steps === undefined) return false;
  const [min, max] = mapping.range;
  const span = Math.abs(max - min);
  return span > 0 && span % 360 === 0;
}

/** `04` §7.2's two Target types, via the package's own table. */
export function isTileTarget(target: TargetName): boolean {
  return TARGETS[target].type === "tile";
}
