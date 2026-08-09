/**
 * Mapping — `04-operations.md` §6.
 *
 * A Source emits a bare number in `[0, 1)`. It has no units. **Mapping is what
 * gives it units.** `0.73` means nothing until something declares whether that is
 * 73% of the way from -5deg to 5deg, or from 0 to 360deg, or a position in a tile
 * palette.
 *
 * **Invariant O5** — mapping is a property of the Operation, never of the
 * attribute. Two Operations writing the same attribute may map differently:
 * `random -> rotation` over `[-5, 5]` is barely-there jitter, and
 * `random -> rotation` over `[0, 270] steps 4` is quarter turns. Were the range a
 * property of `rotation`, one of those two Operations would be impossible.
 *
 * **Invariant O1** — every Source value passes through exactly one mapping before
 * reaching a Blend. A Blend never sees a raw `[0, 1)` value.
 */

import type { Mapping, NumericMapping, PaletteEntry, TileMapping } from "./types.js";

/**
 * The shape is discriminated by the Operation's `target`, not by a tag in the
 * file (`06` **C8**). A `kind` field could only ever agree with `target` or
 * contradict it, and Targets are closed, so it adds a failure mode and no
 * expressiveness.
 */
export function isTileMapping(m: Mapping): m is TileMapping {
  return "palette" in m;
}

/**
 * Numeric mapping — `04` §6.2. Linear in both cases.
 *
 *     continuous:  v = min + t * (max - min)
 *     stepped:     index = floor(t * steps)
 *                  v     = min + index * (max - min) / (steps - 1)
 *
 * `min > max` is legal and reverses the map, which is how every Source is
 * inverted without a flag.
 *
 * **A consequence worth knowing.** Because `t < 1` strictly, a continuous mapping
 * never attains `max`. A stepped mapping does. This is why flip needs `steps`:
 * continuous `[-1, 1]` would produce values near 0 — tiles scaled to invisibility
 * — which is never what "flip half of them" meant.
 *
 * The `index <= steps - 1` guarantee depends on `t < 1` strictly; `05` **X6**
 * forbids a Source returning exactly `1.0` for precisely this reason.
 *
 * **On curves.** The map is linear for every Target. A geometric curve is
 * arguably more correct for a multiplicative quantity like scale, but over
 * `[0.9, 1.1]` the linear midpoint is 1.000 and the geometric 0.995. Linear buys
 * legibility and it crosses zero, which is what makes flip fall out of an
 * ordinary negative range. `curve` is an extension point (`04` §6.2).
 */
export function applyNumericMapping(m: NumericMapping, t: number): number {
  const [min, max] = m.range;
  if (m.steps === undefined) {
    return min + t * (max - min);
  }
  const index = Math.floor(t * m.steps);
  return min + (index * (max - min)) / (m.steps - 1);
}

/**
 * Tile mapping — `04` §6.3. `t` selects a palette entry by the walk of `03` §4.3,
 * with **authored order** rather than canonical.
 *
 * **Invariant O6** — palette entry order is authored and semantically
 * significant. Unlike a Tile's asset list (**D3**), it is not canonicalized.
 *
 * `03` §4.2 sorted assets by id precisely so that dragging a list entry could not
 * reshuffle the canvas. A palette must take the opposite rule, because **under a
 * banded Source, threshold adjacency is spatial adjacency**. Water has to sit next
 * to sand and not next to grass, and order is the only way the author says so.
 *
 * The tension resolves on a real distinction: an asset list is an incidental
 * arrangement of interchangeable variants, while a palette is a deliberately
 * sequenced parameter the author is directly manipulating.
 *
 * **Accepted, not a defect:** under a `random` Source, reordering a palette
 * reshuffles the canvas with no visible reason, because uniform values make
 * adjacency meaningless. This is the price of one palette type serving both
 * Source characters.
 *
 * Strict comparison, so a zero-weight entry can never win; `t < 1` strictly, so
 * `target < total` and the walk always terminates.
 *
 * `null` is a legal entry and means clear this cell — so clearing is an ordinary
 * Operation and needs no sentinel Tile (`02` §8.1).
 */
export function applyTileMapping(m: TileMapping, t: number): string | null {
  let total = 0;
  for (const entry of m.palette) total += entry.weight;

  const target = t * total;
  let cumulative = 0;
  for (const entry of m.palette) {
    cumulative += entry.weight;
    if (cumulative > target) return entry.tileId;
  }
  // Unreachable for a validated config: `06` §7.3 requires a palette's weights to
  // sum above zero, and X6 keeps t < 1. The undefined-behaviour edge of C5.
  return null;
}

/** Sum of a palette's weights. `06` §7.3 requires it above zero. */
export function paletteTotal(palette: PaletteEntry[]): number {
  let total = 0;
  for (const entry of palette) total += entry.weight;
  return total;
}
