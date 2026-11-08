/**
 * Timing for `Marquee.svelte`, kept out of the component so it can be tested.
 *
 * The strip moves at a constant speed (`--marquee-speed`, px per second), so a
 * longer summary takes longer to pass rather than moving faster.
 */

/** Seconds to travel `distancePx` at `pxPerSecond`. `0` means do not animate. */
export function marqueeDuration(distancePx: number, pxPerSecond: number): number {
  if (!(distancePx > 0) || !(pxPerSecond > 0)) return 0;
  return distancePx / pxPerSecond;
}
