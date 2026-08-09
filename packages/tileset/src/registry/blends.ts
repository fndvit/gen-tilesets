/**
 * Blends and Targets — `04-operations.md` §7, as rewritten by ADR-001.
 *
 * ## The inversion
 *
 * **Invariant O7** — a Blend declares the Target *types* it accepts. A Target
 * declares its type, its default Blend, and any Blends it vetoes. An Operation
 * pairing a Target with a Blend outside the resulting set is invalid.
 *
 * The original reading ran the other way — each Target enumerating the Blends it
 * accepts — and produced the same five rows. ADR-001 reversed it because Targets
 * are **closed** (`05` §4.2): four of the five are attributes, and the attribute
 * set is closed by `03` **D7**. Under the original direction a Blend registered
 * later would be **accepted by nothing**, leaving `04` §7.1's `min`/`max`
 * extension point empty.
 *
 * Under the inversion a new Blend declares `numeric` and is available on every
 * numeric Target at once, with the veto column as the place to withhold it where
 * it has no meaning.
 *
 * **Invariant X2** — adding a Blend obliges a review of every Target's veto list.
 * Forgetting the review does not error; it ships a control that produces
 * nonsense.
 */

import type { BlendName, TargetName, TargetType } from "../types.js";
import { Registry } from "./registry.js";

/** A mapped value or an accumulated one. Numeric for four Targets, a tileId for one. */
export type BlendValue = number | string | null;

export interface BlendRegistration {
  name: string;
  params: Record<string, never>;
  /** `05` §8. `set` accepts both; `add` on a tile palette is meaningless. */
  accepts: TargetType[];
  /** A pure binary function of `(mappedValue, previousValue)`. */
  impl: (v: BlendValue, previous: BlendValue) => BlendValue;
}

export const blends = new Registry<BlendRegistration>("blend");

blends.register({
  name: "set",
  params: {},
  accepts: ["numeric", "tile"],
  impl: (v) => v,
});

blends.register({
  name: "add",
  params: {},
  accepts: ["numeric"],
  impl: (v, previous) => (previous as number) + (v as number),
});

blends.register({
  name: "multiply",
  params: {},
  accepts: ["numeric"],
  impl: (v, previous) => (previous as number) * (v as number),
});

/**
 * `subtract` and `divide` are absent because a signed or reciprocal range
 * expresses both — `add` with `range: [-5, -5]` subtracts five (`04` §7.1).
 *
 * `min` and `max` are absent as an extension point; they are the only Blends that
 * would make `03` §5.5's lossy clamp recoverable, which is a thin reason to carry
 * two presets nobody has asked for. If either arrives, **X2** obliges the veto
 * review — and `05` §4.2 works the case: `min(350deg, 10deg)` is `10deg`, but
 * `350deg` is ten degrees *anticlockwise* of `10deg`, so `rotation` must veto both.
 */

export interface TargetSpec {
  type: TargetType;
  default: BlendName;
  vetoes: BlendName[];
}

/** `04` §7.2. Targets are closed by `05` §4.2 — they follow the attributes. */
export const TARGETS: Readonly<Record<TargetName, TargetSpec>> = {
  tileId: { type: "tile", default: "set", vetoes: [] },
  scaleX: { type: "numeric", default: "set", vetoes: [] },
  scaleY: { type: "numeric", default: "set", vetoes: [] },
  /**
   * `multiply` is arithmetically defined on `rotation` but has no authoring
   * meaning under a wrapping domain, so it is vetoed rather than left as a trap.
   */
  rotation: { type: "numeric", default: "set", vetoes: ["multiply"] },
  opacity: { type: "numeric", default: "set", vetoes: [] },
};

/**
 * A Target's accepted set is every Blend accepting its type, less its vetoes.
 *
 * Derived rather than asserted — which is ADR-001's whole point, and the reason
 * `06` validates the `(target, blend)` pair "against the table, not against
 * prose" (`06` §7).
 */
export function acceptedBlends(target: TargetName): BlendName[] {
  const spec = TARGETS[target];
  return blends
    .all()
    .filter((b) => b.accepts.includes(spec.type) && !spec.vetoes.includes(b.name))
    .map((b) => b.name);
}

export function isAccepted(target: TargetName, blend: BlendName): boolean {
  return acceptedBlends(target).includes(blend);
}
