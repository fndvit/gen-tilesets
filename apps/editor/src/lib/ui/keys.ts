/**
 * Keyboard arithmetic shared by the primitives, kept out of the components so
 * it can be unit-tested (the test config cannot load `.svelte`).
 */

/**
 * The index a roving-tabindex group moves to for `key`, or `null` when the key
 * is not one the group handles (so the caller leaves the event alone).
 *
 * Left/Right wrap. In a one-row group (`cols` omitted) Up/Down act as Left/Right,
 * as the WAI-ARIA radio group pattern does. In a grid (`cols` given) Up/Down move
 * by a row and stop at the edge rather than wrapping into another column.
 */
export function rovingIndex(key: string, i: number, n: number, cols?: number): number | null {
  if (n <= 0) return null;
  const next = (i + 1) % n;
  const prev = (i - 1 + n) % n;
  switch (key) {
    case "ArrowRight":
      return next;
    case "ArrowLeft":
      return prev;
    case "ArrowDown":
      return cols === undefined ? next : Math.min(i + cols, n - 1);
    case "ArrowUp":
      return cols === undefined ? prev : Math.max(i - cols, 0);
    case "Home":
      return 0;
    case "End":
      return n - 1;
    default:
      return null;
  }
}

/** A slider's arrow-key step: ten times coarser while Shift is held. */
export function sliderStep(step: number, shift: boolean): number {
  return shift ? step * 10 : step;
}
