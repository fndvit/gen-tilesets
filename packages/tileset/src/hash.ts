/**
 * Positional hashing — `02-generation-contract.md` §6.6, §6.7.
 *
 *     value = hash(effectiveSeed, channel, x, y, salt) -> [0, 1)
 *
 * Randomness is positionally addressed, never drawn from a sequential stream
 * (`02` §6). Every Source is therefore pure, stateless, and total.
 *
 * ## The portability rules, which are the spec more than the choice of function
 *
 * - All intermediate state is `uint32`. Every step ends with `>>> 0`.
 * - Multiplication uses `Math.imul`. **Never the `*` operator** — it silently
 *   promotes to float past 2^53 and diverges from a Rust or Go port.
 * - No floating point anywhere except the single final division.
 *
 * ## Choices this file records
 *
 * `02` §6.6 pins the *discipline* and names a *class* of function for each
 * stage. ADR-004 makes the specific member an implementation choice, revisable
 * at ordinary cost until 1.0.0. Three such choices live here:
 *
 * 1. **Stage 1 is xmur3**, from §6.6's "xmur3 or FNV-1a class". Seed strings are
 *    short and human-authored — `"sunset-3"`, `"draft-b"` (§6.6). FNV-1a
 *    avalanches poorly at that length, so two near-identical seeds would land in
 *    adjacent regions of the output space, which defeats the point of typing a
 *    new seed.
 * 2. **Stage 2 is a murmur3 body with an `fmix32` finalizer**, from §6.6's
 *    "multiply-xor-shift step, then a final avalanche (murmur3 finalizer class)".
 * 3. **The seed string is read as UTF-16 code units** via `charCodeAt`, matching
 *    the discipline `03` §4.2 already fixes for asset ordering, so the package
 *    has one string-to-integer convention rather than two. A future port in
 *    another language must iterate UTF-16 units, not bytes.
 *
 * No vector table is generated here. `05` §11 and ADR-004 govern when one is,
 * and a table is never regenerated to make a test pass.
 */

const { imul } = Math;

/** 2^32. The single division at the end of Stage 2 — the only float in the file. */
const TWO_32 = 4294967296;

// ---------------------------------------------------------------------------
// Stage 1 — seed string to uint32
// ---------------------------------------------------------------------------

/**
 * xmur3. Runs once per generation, so performance is irrelevant; portability and
 * brevity are what matter (`02` §6.6).
 *
 * Also used to derive `channelU32` from a channel string, so channel keys are
 * ordinary strings with no registry of magic numbers (§6.6).
 */
export function stage1(str: string): number {
  let h = (1779033703 ^ str.length) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = imul(h ^ str.charCodeAt(i), 3432918353) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0;
  }
  h = imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Channel strings are hashed on every cell of every Operation, so the result is
 * memoized. The set of distinct channel strings is bounded by the operation
 * count (`05` §4.3 closes the channel set at three shapes), so this cannot grow
 * without bound.
 */
const channelCache = new Map<string, number>();

export function channelU32(channel: string): number {
  let c = channelCache.get(channel);
  if (c === undefined) {
    c = stage1(channel);
    channelCache.set(channel, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Stage 2 — positional mixing
// ---------------------------------------------------------------------------

/** One multiply-xor-shift fold. The murmur3 body, `uint32` throughout. */
function fold(h: number, k: number): number {
  let m = imul(k >>> 0, 0xcc9e2d51) >>> 0;
  m = ((m << 15) | (m >>> 17)) >>> 0;
  m = imul(m, 0x1b873593) >>> 0;
  let acc = (h ^ m) >>> 0;
  acc = ((acc << 13) | (acc >>> 19)) >>> 0;
  return (imul(acc, 5) + 0xe6546b64) >>> 0;
}

/** murmur3's `fmix32`. The final avalanche of `02` §6.6. */
function fmix32(h0: number): number {
  let h = h0 >>> 0;
  h = imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The raw positional hash. Combines `(seedU32, channelU32, x, y, salt)` into a
 * `uint32`.
 *
 * `salt` is folded as `>>> 0`. `06` **C9** narrows both salts to integers in
 * `[0, 2^32)` precisely because every consumer truncates, so the coercion here
 * is the behaviour the schema is written against rather than a convenience.
 * (Note `04` §5.1's `ctx` block still types `salt` as `number` while `04` §3 and
 * `06` **C9** type it `uint32`; the narrow reading is taken.)
 */
export function hashU32(
  seedU32: number,
  channel: number,
  x: number,
  y: number,
  salt: number,
): number {
  let h = seedU32 >>> 0;
  h = fold(h, channel);
  h = fold(h, x);
  h = fold(h, y);
  h = fold(h, salt);
  return fmix32(h);
}

/**
 * The engine-facing hash: a value in `[0, 1)`.
 *
 * Half-open, and strictly so. `05` **X6** makes `1.0` illegal because two
 * mechanisms downstream prove their own termination from `t < 1`: the palette
 * and asset weight walks (`04` §6.3, `03` §4.3) and the stepped mapping
 * (`04` §6.2). The largest value this can return is `4294967295 / 4294967296`.
 *
 * `channel` is the channel *string* — `operationId`, `operationId + ":selection"`,
 * or `"asset"` — so call sites read exactly like `04` §5.2's pseudocode.
 */
export function hash(
  effectiveSeed: number,
  channel: string,
  x: number,
  y: number,
  salt: number,
): number {
  return hashU32(effectiveSeed, channelU32(channel), x, y, salt) / TWO_32;
}

// ---------------------------------------------------------------------------
// The effective seed — `02` §6.7, ADR-002
// ---------------------------------------------------------------------------

/**
 * Mixes the run's seed with the caller's `loadSalt` for a flagged channel.
 *
 * `02` §6.7 specifies this at the constraint level only: a single
 * multiply-xor-shift round combining two `uint32` values, `uint32` throughout,
 * `Math.imul` never `*`, no floating point. ADR-004 makes the operand assignment
 * an implementation choice; the seed is the accumulator and `loadSalt` is folded
 * into it.
 *
 * **`mixLoad(s, 0)` is deliberately not `s`.** `02` §6.7: "`loadSalt = 0` is an
 * ordinary value, not an identity. Requiring it would buy an equivalence nothing
 * needs at the price of a magic value in the one place this document has been
 * most careful to avoid one." The golden-ratio constant below is what guarantees
 * it, and there is a test asserting the inequality on purpose.
 *
 * It adds no key component to Stage 2, whose shape is untouched — the reroll
 * mechanism sits entirely upstream of the positional mixing, which is why every
 * guarantee in `02` §6.2 survives it unchanged.
 */
export function mixLoad(seedU32: number, loadSalt: number): number {
  let h = (seedU32 ^ 0x9e3779b9) >>> 0;
  h = imul(h ^ (loadSalt >>> 0), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** The three channel-string shapes. The set is closed at three (`05` **X3**). */
export const ASSET_CHANNEL = "asset";

/**
 * `04` §4.3 builds the selection channel by concatenating `operationId` with
 * `":selection"`. The colon is excluded from the identifier charset (`06` §5.3)
 * so an Operation cannot be named into another Operation's selection channel.
 */
export function selectionChannel(operationId: string): string {
  return operationId + ":selection";
}
