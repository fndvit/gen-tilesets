/**
 * Asset selection — the weight walk of `03-domain-model.md` §4.1-§4.3.
 *
 * Given a cell's resolved `tileId`, its asset is chosen by comparing a hash
 * value against the cumulative weights of that Tile's assets.
 */

import type { Tile, TileAsset } from "./types.js";

/**
 * Assets in canonical order: ascending by `id`, compared as **UTF-16 code
 * units**.
 *
 * Accumulation needs an order, and if that order were the config array's
 * arrangement then dragging an asset up a list in the editor would reshuffle the
 * canvas — the same surprise as `02` §10.1 but with nothing bought for it
 * (`03` §4.2, **D3**).
 *
 * The comparison must be code-unit ordering — JavaScript's `<` on strings — and
 * **never** `localeCompare` or `Intl.Collator`. Locale-sensitive collation gives
 * different answers on different machines, which is the same class of
 * portability failure as `*` versus `Math.imul` in `02` §6.6, and would break
 * **G1** just as thoroughly.
 *
 * `06` **C10** limits identifiers to `[A-Za-z0-9_-]+`, so there are no surrogate
 * pairs to reason about here.
 */
export function canonicalAssets(tile: Tile): TileAsset[] {
  return [...tile.assets].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** A Tile with its assets pre-sorted and its weight sum precomputed. */
export interface PreparedTile {
  assets: TileAsset[];
  total: number;
}

/**
 * Sorting per cell would be `O(rows * columns * assets log assets)` for a result
 * that cannot change during a generation, so it is hoisted here.
 */
export function prepareTile(tile: Tile): PreparedTile {
  const assets = canonicalAssets(tile);
  let total = 0;
  for (const a of assets) total += a.weight;
  return { assets, total };
}

/**
 * The weight walk — `03` §4.3.
 *
 *     target = h * total
 *     walk assets accumulating `cumulative += weight`
 *     the first asset whose `cumulative > target` is selected
 *
 * The comparison is **strict** so that a zero-weight asset can never win: it does
 * not advance `cumulative`, so it never satisfies the test. And because `h < 1`
 * strictly (`05` **X6**), `target < total`, so the walk always terminates on an
 * asset — the weight walk is total.
 *
 * Weights are relative and normalized by their sum at selection time. They are
 * not required to sum to 1, or to 100, or to anything (`03` §4.1).
 *
 * **Known behaviour, not a defect:** thresholds derive from *all* weights
 * collectively, so editing any one weight moves the boundaries under every cell
 * of that Tile. `02` §10.1 records this as inherent to the walk over a fixed
 * hash value, with mitigations costing more than the problem is worth at V1
 * scale.
 *
 * @param h a value in `[0, 1)` from the asset channel
 */
export function walkWeights(prepared: PreparedTile, h: number): TileAsset | undefined {
  const target = h * prepared.total;
  let cumulative = 0;
  for (const asset of prepared.assets) {
    cumulative += asset.weight;
    if (cumulative > target) return asset;
  }
  // Unreachable for a validated config: `06` §6 requires a Tile's weights to sum
  // above zero and `05` **X6** keeps `h < 1`, so `target < total`. `generate()`
  // trusts its input (`06` **C5**), so this is the undefined-behaviour edge
  // rather than a case being handled.
  return undefined;
}
