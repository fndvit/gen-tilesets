/**
 * The attribute table — `03-domain-model.md` §5.
 *
 * `02` §8 described attributes as *normalized*. `03` §5.1 rejected that model:
 * a normalized `scale` needs a maximum to normalize against, and any maximum is
 * a design constant `02` §4.2 forbids the engine from knowing. Each attribute
 * instead declares a domain, a default, and a bounding behaviour (**D4**).
 *
 * Domain is **capacity**, not range. A Target writing to an attribute maps onto
 * some window within that capacity, and that window is a property of the Target
 * — which is what lets `scaleX` stay open while an Operation still varies scale
 * between 0.9 and 1.1 (`04` §6.1, **O5**).
 */

import type { AttributeName, TileState } from "./types.js";

/** `03` §5.2. What happens to a written value falling outside the domain. */
export type Bounding = "clamp" | "wrap" | "none";

export interface AttributeSpec {
  /** The value a fresh `TileState` initializes to — `02` §9 step 1. */
  default: number;
  bounding: Bounding;
  /** Present for `clamp` and `wrap`; absent where the domain is open. */
  min?: number;
  max?: number;
}

/**
 * The V1 attribute set — `03` §5.4. **Closed** by **D7**: attributes cannot be
 * registered at runtime, and an addition is a schema change rather than a
 * registration.
 *
 * `scaleX` and `scaleY` are separate so a flip is expressible as a negative
 * value, without introducing a boolean that would make every Blend declare
 * which types it accepts (`03` §5.4).
 *
 * `scale` is uniform and **composes with** those two rather than replacing them
 * — ADR-005. It exists because **G3** keys an Operation's randomness to its
 * `operationId`, so two Operations targeting the two axes hash on different
 * channels and disagree cell by cell under any stochastic Source. One attribute
 * is the only way one number reaches both.
 *
 * Its domain, default and bounding are the axes' three answers, for the axes'
 * reasons: the domain is open because `03` §5.4 refused to invent a maximum
 * after rejecting the normalized model for not having one.
 */
export const ATTRIBUTES: Readonly<Record<AttributeName, AttributeSpec>> = {
  scale: { default: 1, bounding: "none" },
  scaleX: { default: 1, bounding: "none" },
  scaleY: { default: 1, bounding: "none" },
  rotation: { default: 0, bounding: "wrap", min: 0, max: 360 },
  opacity: { default: 1, bounding: "clamp", min: 0, max: 1 },
  /**
   * 0.8.0. Open for `scale`'s reason: a maximum would be a design constant the
   * engine has no business knowing (`03` §5.1). A tile moved far past the box is
   * clipped by **R9**, not refused here. The default is the identity — the tile
   * on its own cell — which is what keeps every file without a translate
   * Operation drawing exactly as before.
   */
  translateX: { default: 0, bounding: "none" },
  translateY: { default: 0, bounding: "none" },
};

export const ATTRIBUTE_NAMES = Object.keys(ATTRIBUTES) as AttributeName[];

/** A fresh, empty cell — `02` §8.1, §9 step 1. Operations paint into it. */
export function initialTileState(): TileState {
  return {
    tileId: null,
    assetId: null,
    scale: ATTRIBUTES.scale.default,
    scaleX: ATTRIBUTES.scaleX.default,
    scaleY: ATTRIBUTES.scaleY.default,
    rotation: ATTRIBUTES.rotation.default,
    opacity: ATTRIBUTES.opacity.default,
    translateX: ATTRIBUTES.translateX.default,
    translateY: ATTRIBUTES.translateY.default,
  };
}

/**
 * Applies an attribute's bounding to a value.
 *
 * `wrap` uses a true modulo rather than JS `%`. `rotation` can legitimately go
 * negative — `add` with a range of `[-5, 5]` is `04` §6.1's own example — and
 * `%` is a remainder that takes the sign of its left operand, so `-10 % 360` is
 * `-10` rather than `350`. This is the same hazard `04` §4.2 flags for
 * `checkerboard`: any predicate or reduction testing a non-zero residue over a
 * possibly-negative operand must use a true modulo.
 */
export function bound(spec: AttributeSpec, value: number): number {
  switch (spec.bounding) {
    case "none":
      return value;
    case "clamp":
      return Math.min(Math.max(value, spec.min!), spec.max!);
    case "wrap": {
      const span = spec.max! - spec.min!;
      return (((value - spec.min!) % span) + span) % span + spec.min!;
    }
  }
}

/**
 * Writes an attribute, applying **D6** then **D5**.
 *
 * **D6** — a non-finite Blend result is discarded and the previous value stands.
 * Not fastidiousness: `scaleX`/`scaleY` are unbounded, so a multiplying Blend
 * can reach a non-finite result, and `02` §8 requires `Grid<TileState>` to be
 * plain serializable data. JSON has no encoding for `NaN` or `Infinity`, so a
 * non-finite value would produce a grid that cannot round-trip.
 *
 * **D5** — bounding is applied immediately after each write, never once at emit.
 * The accumulated value is in-domain at every point in the stack, so an author
 * inspecting it midway sees a real opacity rather than a placeholder that will
 * be corrected later. `03` §5.2's worked example is the test:
 *
 *     opacity 1, add 0.5, multiply 0.5
 *     per-write bounding: 1 -> clamp(1.5) = 1 -> 0.5     <- correct
 *     bounding at emit:   1 -> 1.5 -> 0.75
 *
 * **Accepted, not a defect:** per-write `clamp` is lossy — the 1.5 is gone and no
 * later Blend can recover it. `03` §5.2 records this as the intended reading of
 * **D5**, in the manner of `02` §10.1, so it is not later filed as a bug.
 */
export function writeAttribute(state: TileState, attr: AttributeName, value: number): void {
  if (!Number.isFinite(value)) return; // D6 — the previous value stands
  state[attr] = bound(ATTRIBUTES[attr], value); // D5 — bounded immediately
}
