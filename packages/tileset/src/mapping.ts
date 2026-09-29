/**
 * Mapping — `04-operations.md` §6.
 *
 * A Source emits a bare number in `[0, 1]`. It has no units. **Mapping is what
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
 * reaching a Blend. A Blend never sees a raw `[0, 1]` value.
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
 *     stepped:     index = min(steps - 1, floor(t * steps))
 *                  v     = min + index * (max - min) / (steps - 1)
 *
 * with both branches returning `max` exactly at the top, rather than the
 * arithmetic that should equal it — see the note in the body.
 *
 * `min > max` is legal and reverses the map, which is how every Source is
 * inverted without a flag.
 *
 * **Both attain `max`, and that is newer than it looks.** **X6** used to bound a
 * Source at `[0, 1)` half-open, so a continuous mapping never quite reached
 * `max`; `gradient` was then changed to reach both ends of its extent, X6 opened
 * to `[0, 1]` closed, and a continuous mapping now attains `max` exactly when a
 * Source hands it `1`. `gradient` is the only one that does.
 *
 * **`index` is therefore clamped, and the clamp is load-bearing.** It used to be
 * unnecessary: `index <= steps - 1` followed from `t < 1` strictly, and X6
 * forbade exactly `1.0` for precisely that reason. At `t = 1` the bare
 * `floor(t * steps)` is `steps`, which overshoots `max` by one whole step — a
 * `[0, 1]` range with `steps: 4` would emit `1.333`. Removing the clamp
 * reintroduces that.
 *
 * **Flip still needs `steps`, for its own reason.** Continuous `[-1, 1]` passes
 * through every value between, so most cells land near 0 — tiles scaled to
 * invisibility — which is never what "flip half of them" meant. That argument was
 * never about attaining the endpoints.
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
    // `max` exactly, rather than `min + 1 * (max - min)`. See below.
    return t === 1 ? max : min + t * (max - min);
  }
  // Clamped because X6 admits t = 1, where the bare floor gives `steps` and
  // overshoots `max` by a step. See the note above.
  const index = Math.min(m.steps - 1, Math.floor(t * m.steps));
  // The top step returns `max` exactly, not the arithmetic that should equal it.
  //
  // `min + (steps - 1) * (max - min) / (steps - 1)` is `max` algebraically and
  // is not `max` in floating point: over `[0.3, 1]` with `steps: 7` it comes out
  // `0.9999999999999998`. That is invisible for most Targets and is not
  // invisible for `scale`, where `isIdentityTransform` compares `sx === 1`
  // exactly (`07` R7) -- a value one ulp short takes the matrix path instead of
  // the pixel-snapped box, and the matrix path is where seams come from. It is
  // also the difference between two adjacent tiles touching and not.
  //
  // The same reasoning applies to the continuous branch at `t === 1`.
  return index === m.steps - 1 ? max : min + (index * (max - min)) / (m.steps - 1);
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
 * Strict comparison, so a zero-weight entry can never win.
 *
 * **`t = 1` is the walk's one boundary case, and it needs the fallback below.**
 * X6 used to bound `t` at `[0, 1)`, which made `target < total` and guaranteed
 * some entry's running total exceeded it. `gradient` now reaches exactly `1`,
 * where `target === total` and no `cumulative` is strictly greater — so the loop
 * runs out. See the comment at the fallback for what returning `null` there
 * would have meant.
 *
 * `null` is a legal entry and means clear this cell — so clearing is an ordinary
 * Operation and needs no sentinel Tile (`02` §8.1).
 */
export function applyTileMapping(m: TileMapping, t: number): string | null {
  let total = 0;
  for (const entry of m.palette) total += entry.weight;

  const target = t * total;
  let cumulative = 0;
  let last: PaletteEntry | undefined;
  for (const entry of m.palette) {
    cumulative += entry.weight;
    if (cumulative > target) return entry.tileId;
    // Tracked on the way past, so the fallback below costs no second walk.
    // Gated on a positive weight so the fallback keeps the same guarantee the
    // strict comparison above gives: a zero-weight entry cannot win, and it
    // cannot win by being last either.
    if (entry.weight > 0) last = entry;
  }
  // Reached at exactly `t = 1`, where `target === total` and the final entry's
  // `cumulative === total` is not strictly greater. X6 used to forbid it, and
  // returning `null` here means *clear this cell* (`02` §8.1) -- so before
  // `gradient` began reaching its far corner, the top of every palette gradient
  // would have blanked a row rather than selecting its last entry. A silently
  // wrong picture, which is why this is a fallback and not a throw.
  //
  // The last *positive-weight* entry rather than simply the last, so that a
  // zero-weight trailing entry still never wins -- the guarantee the strict
  // comparison above exists for.
  //
  // Still `null` for a palette that is empty or wholly zero-weighted, which
  // `06` §7.3 forbids. That remains the undefined-behaviour edge of C5.
  return last?.tileId ?? null;
}

/** Sum of a palette's weights. `06` §7.3 requires it above zero. */
export function paletteTotal(palette: PaletteEntry[]): number {
  let total = 0;
  for (const entry of palette) total += entry.weight;
  return total;
}
